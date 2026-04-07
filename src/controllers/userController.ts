import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { users, snippets, tags, snippetTags, stars } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

interface PatchMeBody {
  bio?: string;
}

export async function getUserProfile(
  request: FastifyRequest<{ Params: { username: string } }>,
  reply: FastifyReply
) {
  const { username } = request.params;

  const [user] = await db.select().from(users).where(eq(users.username, username));
  if (!user) return reply.status(404).send({ error: "User not found" });

  const userSnippets = await db.select().from(snippets).where(eq(snippets.userId, user.id));

  const snippetList = await Promise.all(
    userSnippets.map(async (s) => {
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
        tags: tagRows.map((t) => t.name),
        stars: Number(starCount?.count ?? 0),
        createdAt: s.createdAt,
      };
    })
  );

  return reply.send({
    username: user.username,
    bio: user.bio,
    snippets: snippetList,
  });
}

export async function updateMe(
  request: FastifyRequest<{ Body: PatchMeBody }>,
  reply: FastifyReply
) {
  const userId = (request.user as { id: number }).id;
  const { bio } = request.body;

  if (bio !== undefined && bio.length > 300) {
    return reply.status(400).send({ error: "Bio cannot exceed 300 characters" });
  }

  const [updated] = await db
    .update(users)
    .set({ bio: bio ?? "" })
    .where(eq(users.id, userId))
    .returning({ username: users.username, bio: users.bio });

  return reply.send(updated);
}
