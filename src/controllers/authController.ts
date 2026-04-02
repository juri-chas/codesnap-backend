import { FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcrypt";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

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
