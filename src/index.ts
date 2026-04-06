import fastify, { FastifyInstance } from "fastify";
import { FastifyRequest, FastifyReply } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import 'dotenv/config';

import { pgTable, serial, varchar, text } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("user_id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
});

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const db = drizzle(pool);

const server = fastify({ logger: true });
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

server.register(fastifyJwt, { secret: process.env.JWT_SECRET || "your-secret-key" });

server.get("/health", async () => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
});

interface RegisterBody {
  username: string;
  password: string;
}

interface LoginBody {
  username: string;
  password: string;
}

export async function register(
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply,
) {
  const { username, password } = request.body;

  const existingUsername = (await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    )[0];

  const passwordHash = await bcrypt.hash(password, 10);

  const result = (await db
    .insert(users)
    .values({ username, passwordHash })
    .returning({ id: users.id, username: users.username })
    )[0];

  return reply.status(201).send(result);
}

export async function login(
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply,
) {
  const { username, password } = request.body;

  const user = (await db.select().from(users).where(eq(users.username, username)))[0];

  if (!user) {
    return reply.status(401).send({ error: "Invalid username or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return reply.status(401).send({ error: "Invalid username or password" });
  }

  const token = request.server.jwt.sign({
    id: user.id,
    username: user.username,
  });

  return reply.send({ token });
}

export async function AuthenticateUser(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await (request as any).jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", register);
  app.post("/auth/login", login);
}

const start = async () => {
  try {
    await server.listen({ port, host: "0.0.0.0" });
    console.log(`Server listening on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

authRoutes(server);

start();
