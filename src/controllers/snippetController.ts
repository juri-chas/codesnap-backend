import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { snippets, users, tags, snippetTags, stars, comments } from "../db/schema.js";
import { eq, and, like, inArray, sql, gte } from "drizzle-orm";

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

function getOrCreateTag(name: string): number {
  const normalized = name.toLowerCase().trim();
  const existing = db.select().from(tags).where(eq(tags.name, normalized)).get();
  if (existing) return existing.id;

  const created = db.insert(tags).values({ name: normalized }).returning({ id: tags.id }).get();
  return created.id;
}

function buildSnippetList(rows: typeof snippets.$inferSelect[]) {
  return rows.map((s) => {
    const user = db.select({ username: users.username }).from(users).where(eq(users.id, s.userId)).get();
    const tagRows = db
      .select({ name: tags.name })
      .from(snippetTags)
      .innerJoin(tags, eq(tags.id, snippetTags.tagId))
      .where(eq(snippetTags.snippetId, s.id))
      .all();
    const starCount = db
      .select({ count: sql<number>`count(*)` })
      .from(stars)
      .where(eq(stars.snippetId, s.id))
      .get();

    return {
      id: s.id,
      title: s.title,
      language: s.language,
      username: user?.username ?? null,
      tags: tagRows.map((t) => t.name),
      stars: starCount?.count ?? 0,
      createdAt: s.createdAt,
    };
  });
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

  const snippet = db
    .insert(snippets)
    .values({ title, code, language, userId })
    .returning()
    .get();

  for (const name of tagNames) {
    const tagId = getOrCreateTag(name);
    db.insert(snippetTags).values({ snippetId: snippet.id, tagId }).run();
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
    const tagRow = db.select().from(tags).where(eq(tags.name, normalizedTag)).get();
    if (!tagRow) return reply.send([]);

    const rows = db
      .select({ snippetId: snippetTags.snippetId })
      .from(snippetTags)
      .where(eq(snippetTags.tagId, tagRow.id))
      .all();

    snippetIds = rows.map((r) => r.snippetId);
    if (snippetIds.length === 0) return reply.send([]);
  }

  let rows: typeof snippets.$inferSelect[];

  if (snippetIds !== null && q && language) {
    rows = db
      .select()
      .from(snippets)
      .where(
        and(
          inArray(snippets.id, snippetIds),
          like(sql`lower(${snippets.title})`, `%${q.toLowerCase()}%`),
          like(sql`lower(${snippets.language})`, `%${language.toLowerCase()}%`)
        )
      )
      .all();
  } else if (snippetIds !== null && q) {
    rows = db
      .select()
      .from(snippets)
      .where(
        and(
          inArray(snippets.id, snippetIds),
          like(sql`lower(${snippets.title})`, `%${q.toLowerCase()}%`)
        )
      )
      .all();
  } else if (snippetIds !== null && language) {
    rows = db
      .select()
      .from(snippets)
      .where(
        and(
          inArray(snippets.id, snippetIds),
          like(sql`lower(${snippets.language})`, `%${language.toLowerCase()}%`)
        )
      )
      .all();
  } else if (snippetIds !== null) {
    rows = db
      .select()
      .from(snippets)
      .where(inArray(snippets.id, snippetIds))
      .all();
  } else if (q && language) {
    rows = db
      .select()
      .from(snippets)
      .where(
        and(
          like(sql`lower(${snippets.title})`, `%${q.toLowerCase()}%`),
          like(sql`lower(${snippets.language})`, `%${language.toLowerCase()}%`)
        )
      )
      .all();
  } else if (q) {
    rows = db
      .select()
      .from(snippets)
      .where(like(sql`lower(${snippets.title})`, `%${q.toLowerCase()}%`))
      .all();
  } else if (language) {
    rows = db
      .select()
      .from(snippets)
      .where(like(sql`lower(${snippets.language})`, `%${language.toLowerCase()}%`))
      .all();
  } else {
    rows = db.select().from(snippets).all();
  }

  return reply.send(buildSnippetList(rows));
}

export async function getSnippetById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const id = parseInt(request.params.id);
  const snippet = db.select().from(snippets).where(eq(snippets.id, id)).get();

  if (!snippet) return reply.status(404).send({ error: "Snippet not found" });

  const user = db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, snippet.userId))
    .get();

  const tagRows = db
    .select({ name: tags.name })
    .from(snippetTags)
    .innerJoin(tags, eq(tags.id, snippetTags.tagId))
    .where(eq(snippetTags.snippetId, snippet.id))
    .all();

  const starCount = db
    .select({ count: sql<number>`count(*)` })
    .from(stars)
    .where(eq(stars.snippetId, snippet.id))
    .get();

  return reply.send({
    ...snippet,
    username: user?.username ?? null,
    tags: tagRows.map((t) => t.name),
    stars: starCount?.count ?? 0,
  });
}

export async function deleteSnippet(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const id = parseInt(request.params.id);
  const userId = (request.user as { id: number }).id;

  const snippet = db.select().from(snippets).where(eq(snippets.id, id)).get();
  if (!snippet) return reply.status(404).send({ error: "Snippet not found" });
  if (snippet.userId !== userId) return reply.status(403).send({ error: "Forbidden" });

  db.delete(snippets).where(eq(snippets.id, id)).run();
  return reply.send({ message: "Snippet deleted" });
}

export async function getTrendingSnippets(
  request: FastifyRequest<{ Querystring: TrendingQuery }>,
  reply: FastifyReply
) {
  const { window: windowParam } = request.query;
  let days = 7;
  if (windowParam === "30d") days = 30;

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const rows = db
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
    .limit(10)
    .all();

  const result = rows.map((row) => {
    const user = db.select({ username: users.username }).from(users).where(eq(users.id, row.userId)).get();
    const tagRows = db
      .select({ name: tags.name })
      .from(snippetTags)
      .innerJoin(tags, eq(tags.id, snippetTags.tagId))
      .where(eq(snippetTags.snippetId, row.id))
      .all();

    return {
      id: row.id,
      title: row.title,
      language: row.language,
      username: user?.username ?? null,
      tags: tagRows.map((t) => t.name),
      stars: row.starCount,
      comments: row.commentCount,
      score: row.starCount + row.commentCount,
      createdAt: row.createdAt,
    };
  });

  return reply.send(result);
}
