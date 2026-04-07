import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { stars, snippets, users, tags, snippetTags } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";

export async function addStar(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const snippetId = parseInt(request.params.id);
  const userId = (request.user as { id: number }).id;

  const [snippet] = await db.select().from(snippets).where(eq(snippets.id, snippetId));
  if (!snippet) return reply.status(404).send({ error: "Snippet not found" });

  const [existing] = await db
    .select()
    .from(stars)
    .where(and(eq(stars.snippetId, snippetId), eq(stars.userId, userId)));

  if (existing) return reply.status(409).send({ error: "Already starred" });

  await db.insert(stars).values({ snippetId, userId });
  return reply.status(201).send({ message: "Starred" });
}

export async function removeStar(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const snippetId = parseInt(request.params.id);
  const userId = (request.user as { id: number }).id;

  await db.delete(stars).where(and(eq(stars.snippetId, snippetId), eq(stars.userId, userId)));
  return reply.send({ message: "Unstarred" });
}

export async function getStarredSnippets(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { id: number }).id;

  const starredRows = await db
    .select({ snippetId: stars.snippetId })
    .from(stars)
    .where(eq(stars.userId, userId));

  const result = await Promise.all(
    starredRows.map(async ({ snippetId }) => {
      const [snippet] = await db.select().from(snippets).where(eq(snippets.id, snippetId));
      if (!snippet) return null;

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

      return {
        id: snippet.id,
        title: snippet.title,
        language: snippet.language,
        username: user?.username ?? null,
        tags: tagRows.map((t) => t.name),
        stars: Number(starCount?.count ?? 0),
        createdAt: snippet.createdAt,
      };
    })
  );

  return reply.send(result.filter(Boolean));
}
