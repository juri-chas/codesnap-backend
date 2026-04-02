import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyCors from "@fastify/cors";
import { authRoutes } from "./routes/auth.js";
import { snippetRoutes } from "./routes/snippets.js";
import { tagRoutes } from "./routes/tags.js";
import { userRoutes } from "./routes/users.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "codesnap-dev-secret";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(fastifyCors);
  app.register(fastifyJwt, { secret: JWT_SECRET });

  app.get("/health", async () => ({ status: "ok" }));

  app.register(authRoutes);
  app.register(snippetRoutes);
  app.register(tagRoutes);
  app.register(userRoutes);

  return app;
}
