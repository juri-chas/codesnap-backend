import { FastifyInstance } from "fastify";
import { getUserProfile, updateMe } from "../controllers/userController.js";
import { getStarredSnippets } from "../controllers/starController.js";
import { authenticate } from "../middleware/auth.js";

export async function userRoutes(app: FastifyInstance) {
  app.get("/users/:username", getUserProfile);
  app.patch("/me", { preHandler: authenticate }, updateMe);
  app.get("/me/starred", { preHandler: authenticate }, getStarredSnippets);
}
