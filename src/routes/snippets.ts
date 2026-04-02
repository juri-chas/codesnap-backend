import { FastifyInstance } from "fastify";
import {
  createSnippet,
  getSnippets,
  getSnippetById,
  deleteSnippet,
  getTrendingSnippets,
} from "../controllers/snippetController.js";
import { createComment, getComments } from "../controllers/commentController.js";
import { addStar, removeStar } from "../controllers/starController.js";
import { authenticate } from "../middleware/auth.js";

export async function snippetRoutes(app: FastifyInstance) {
  app.get("/snippets/trending", getTrendingSnippets);
  app.get("/snippets", getSnippets);
  app.get("/snippets/:id", getSnippetById);

  app.post("/snippets", { preHandler: authenticate }, createSnippet);
  app.delete("/snippets/:id", { preHandler: authenticate }, deleteSnippet);

  app.get("/snippets/:id/comments", getComments);
  app.post("/snippets/:id/comments", { preHandler: authenticate }, createComment);

  app.post("/snippets/:id/star", { preHandler: authenticate }, addStar);
  app.delete("/snippets/:id/star", { preHandler: authenticate }, removeStar);
}
