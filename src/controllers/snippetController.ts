import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { snippets, users, tags, snippetTags, stars, comments } from "../db/schema.js";
import { eq, and, ilike, inArray, sql } from "drizzle-orm";

interface SnippetBody {
  title: string;
  code: string;
  language: string;
  tags?: string[];
}

interface SnippetQuery {
  tag?: string;
  q?: string;
  language?: string;
}

interface TrendingQuery {
  window?: string;
}

async function getOrCreateTag(name: string): Promise<number> {
  const normalized = name.toLowerCase().trim();
  const [existing] = await db.select().from(tags).where(eq(tags.name, normalized));
  if (existing) return existing.id;
  const [created] = await db.insert(tags).values({ name: normalized }).returning({ id: tags.id });
  return created.id;
}

async function buildSnippetList(rows: typeof snippets.$inferSelect[]) {
  return Promise.all(
    rows.map(async (s) => {
      const [user] = await db.select({ username: users.username }).from(users).where(eq(users.id, s.userId));
      const tagRows = await db
        .select({ name: tags.name })
        .from(snippetTags)
        .innerJoin(tags, eq(tags.id, snippetTags.tagId))
        .where(eq(snippetTags.snippetId, s.id));
      const [starCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(stars)
        .where(eq(stars.snippetId, s.id));

      return {
        id: s.id,
        title: s.title,
        language: s.language,
        username: user?.username ?? null,
        tags: tagRows.map((t) => t.name),
        stars: Number(starCount?.count ?? 0),
        createdAt: s.createdAt,
      };
    })
  );
}

export async function createSnippet(
  request: FastifyRequest<{ Body: SnippetBody }>,
  reply: FastifyReply
) {
  const { title, code, language, tags: tagNames = [] } = request.body;
  const userId = (request.user as { id: number }).id;

  if (!title || !code || !language) {
    return reply.status(400).send({ error: "title, code, and language are required" });
  }

  if (tagNames.length > 5) {
    return reply.status(400).send({ error: "A snippet can have at most 5 tags" });
  }

  const [snippet] = await db
    .insert(snippets)
    .values({ title, code, language, userId })
    .returning();

  for (const name of tagNames) {
    const tagId = await getOrCreateTag(name);
    await db.insert(snippetTags).values({ snippetId: snippet.id, tagId });
  }

  return reply.status(201).send(snippet);
}

export async function getSnippets(
  request: FastifyRequest<{ Querystring: SnippetQuery }>,
  reply: FastifyReply
) {
  const { tag, q, language } = request.query;

  let snippetIds: number[] | null = null;

  if (tag) {
    const normalizedTag = tag.toLowerCase().trim();
    const [tagRow] = await db.select().from(tags).where(eq(tags.name, normalizedTag));
    if (!tagRow) return reply.send([]);

    const rows = await db
      .select({ snippetId: snippetTags.snippetId })
      .from(snippetTags)
      .where(eq(snippetTags.tagId, tagRow.id));

    snippetIds = rows.map((r) => r.snippetId);
    if (snippetIds.length === 0) return reply.send([]);
  }

  const conditions = [];
  if (snippetIds !== null) conditions.push(inArray(snippets.id, snippetIds));
  if (q) conditions.push(ilike(snippets.title, `%${q}%`));
  if (language) conditions.push(ilike(snippets.language, `%${language}%`));

  const rows = await db
    .select()
    .from(snippets)
    .where(conditions.length ? and(...conditions) : undefined);

  return reply.send(await buildSnippetList(rows));
}

export async function getSnippetById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const id = parseInt(request.params.id);
  const [snippet] = await db.select().from(snippets).where(eq(snippets.id, id));
  if (!snippet) return reply.status(404).send({ error: "Snippet not found" });

  const [user] = await db.select({ username: users.username }).from(users).where(eq(users.id, snippet.userId));
  const tagRows = await db
    .select({ name: tags.name })
    .from(snippetTags)
    .innerJoin(tags, eq(tags.id, snippetTags.tagId))
    .where(eq(snippetTags.snippetId, snippet.id));
  const [starCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(stars)
    .where(eq(stars.snippetId, snippet.id));

  return reply.send({
    ...snippet,
    username: user?.username ?? null,
    tags: tagRows.map((t) => t.name),
    stars: Number(starCount?.count ?? 0),
  });
}

export async function deleteSnippet(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const id = parseInt(request.params.id);
  const userId = (request.user as { id: number }).id;

  const [snippet] = await db.select().from(snippets).where(eq(snippets.id, id));
  if (!snippet) return reply.status(404).send({ error: "Snippet not found" });
  if (snippet.userId !== userId) return reply.status(403).send({ error: "Forbidden" });

  await db.delete(snippets).where(eq(snippets.id, id));
  return reply.send({ message: "Snippet deleted" });
}

export async function getTrendingSnippets(
  request: FastifyRequest<{ Querystring: TrendingQuery }>,
  reply: FastifyReply
) {
  const { window: windowParam } = request.query;
  const days = windowParam === "30d" ? 30 : 7;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: snippets.id,
      title: snippets.title,
      code: snippets.code,
      language: snippets.language,
      userId: snippets.userId,
      createdAt: snippets.createdAt,
      starCount: sql<number>`count(distinct CASE WHEN ${stars.createdAt} >= ${cutoff} THEN ${stars.id} END)`,
      commentCount: sql<number>`count(distinct CASE WHEN ${comments.createdAt} >= ${cutoff} THEN ${comments.id} END)`,
    })
    .from(snippets)
    .leftJoin(stars, eq(stars.snippetId, snippets.id))
    .leftJoin(comments, eq(comments.snippetId, snippets.id))
    .groupBy(snippets.id)
    .orderBy(sql`(count(distinct CASE WHEN ${stars.createdAt} >= ${cutoff} THEN ${stars.id} END) + count(distinct CASE WHEN ${comments.createdAt} >= ${cutoff} THEN ${comments.id} END)) DESC`)
    .limit(10);

  const result = await Promise.all(
    rows.map(async (row) => {
      const [user] = await db.select({ username: users.username }).from(users).where(eq(users.id, row.userId));
      const tagRows = await db
        .select({ name: tags.name })
        .from(snippetTags)
        .innerJoin(tags, eq(tags.id, snippetTags.tagId))
        .where(eq(snippetTags.snippetId, row.id));

      return {
        id: row.id,
        title: row.title,
        language: row.language,
        username: user?.username ?? null,
        tags: tagRows.map((t) => t.name),
        stars: Number(row.starCount),
        comments: Number(row.commentCount),
        score: Number(row.starCount) + Number(row.commentCount),
        createdAt: row.createdAt,
      };
    })
  );

  return reply.send(result);
}
