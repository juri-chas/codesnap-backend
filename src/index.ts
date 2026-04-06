import fastify from 'fastify';
import { FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcrypt";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

const server = fastify({ logger: true });
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

server.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString()
  };
});


const start = async () => {
  try {
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};



interface RegisterBody {
  username: string;
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

export async function register(
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply
) {
  const { username, email, password } = request.body;

  const existing = db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  const existingUsername = db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .get();

  if (existing || existingUsername) {
    return reply.status(409).send({ error: "Email or username already in use" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = db
    .insert(users)
    .values({ username, email, passwordHash })
    .returning({ id: users.id, username: users.username, email: users.email })
    .get();

  return reply.status(201).send(result);
}

export async function login(
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply
) {
  const { email, password } = request.body;

  const user = db.select().from(users).where(eq(users.email, email)).get();

  if (!user) {
    return reply.status(401).send({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return reply.status(401).send({ error: "Invalid email or password" });
  }

  const token = request.server.jwt.sign({ id: user.id, username: user.username });

  return reply.send({ token });
}

import { FastifyRequest, FastifyReply } from "fastify";

export async function AuthenticateUser(request: FastifyRequest, reply: FastifyReply) {
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

start();
