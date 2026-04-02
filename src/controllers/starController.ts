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

  const snippet = db.select().from(snippets).where(eq(snippets.id, snippetId)).get();
  if (!snippet) return reply.status(404).send({ error: "Snippet not found" });

  const existing = db
    .select()
    .from(stars)
    .where(and(eq(stars.snippetId, snippetId), eq(stars.userId, userId)))
    .get();

  if (existing) return reply.status(409).send({ error: "Already starred" });

  db.insert(stars).values({ snippetId, userId }).run();
  return reply.status(201).send({ message: "Starred" });
}

export async function removeStar(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const snippetId = parseInt(request.params.id);
  const userId = (request.user as { id: number }).id;

  db.delete(stars)
    .where(and(eq(stars.snippetId, snippetId), eq(stars.userId, userId)))
    .run();

  return reply.send({ message: "Unstarred" });
}

export async function getStarredSnippets(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const userId = (request.user as { id: number }).id;

  const starredRows = db
    .select({ snippetId: stars.snippetId })
    .from(stars)
    .where(eq(stars.userId, userId))
    .all();

  const result = starredRows.map(({ snippetId }) => {
    const snippet = db.select().from(snippets).where(eq(snippets.id, snippetId)).get();
    if (!snippet) return null;

    const user = db.select({ username: users.username }).from(users).where(eq(users.id, snippet.userId)).get();
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

    return {
      id: snippet.id,
      title: snippet.title,
      language: snippet.language,
      username: user?.username ?? null,
      tags: tagRows.map((t) => t.name),
      stars: starCount?.count ?? 0,
      createdAt: snippet.createdAt,
    };
  }).filter(Boolean);

  return reply.send(result);
}
