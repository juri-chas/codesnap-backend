import { FastifyInstance } from "fastify";
import { getAllTags } from "../controllers/tagController.js";

export async function tagRoutes(app: FastifyInstance) {
  app.get("/tags", getAllTags);
}
