import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { tags, snippetTags } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

export async function getAllTags(_request: FastifyRequest, reply: FastifyReply) {
  const rows = await db
    .select({
      name: tags.name,
      count: sql<number>`count(${snippetTags.snippetId})`,
    })
    .from(tags)
    .leftJoin(snippetTags, eq(snippetTags.tagId, tags.id))
    .groupBy(tags.id);

  return reply.send(rows);
}
