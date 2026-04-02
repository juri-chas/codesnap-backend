import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { comments, snippets, users } from "../db/schema.js";
import { eq, asc } from "drizzle-orm";

interface CommentBody {
  text: string;
}

export async function createComment(
  request: FastifyRequest<{ Params: { id: string }; Body: CommentBody }>,
  reply: FastifyReply
) {
  const snippetId = parseInt(request.params.id);
  const userId = (request.user as { id: number }).id;
  const { text } = request.body;

  if (!text || text.trim() === "") {
    return reply.status(400).send({ error: "Comment text cannot be empty" });
  }

  const snippet = db.select().from(snippets).where(eq(snippets.id, snippetId)).get();
  if (!snippet) return reply.status(404).send({ error: "Snippet not found" });

  const comment = db
    .insert(comments)
    .values({ snippetId, userId, text: text.trim() })
    .returning()
    .get();

  return reply.status(201).send(comment);
}

export async function getComments(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const snippetId = parseInt(request.params.id);

  const snippet = db.select().from(snippets).where(eq(snippets.id, snippetId)).get();
  if (!snippet) return reply.status(404).send({ error: "Snippet not found" });

  const rows = db
    .select()
    .from(comments)
    .where(eq(comments.snippetId, snippetId))
    .orderBy(asc(comments.createdAt))
    .all();

  const result = rows.map((c) => {
    const user = db.select({ username: users.username }).from(users).where(eq(users.id, c.userId)).get();
    return {
      id: c.id,
      text: c.text,
      username: user?.username ?? null,
      createdAt: c.createdAt,
    };
  });

  return reply.send(result);
}
