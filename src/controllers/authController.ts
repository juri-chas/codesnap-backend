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

  if (!username || !email || !password) {
    return reply.status(400).send({ error: "username, email and password are required" });
  }

  const [existingEmail] = await db.select().from(users).where(eq(users.email, email));
  const [existingUsername] = await db.select().from(users).where(eq(users.username, username));

  if (existingEmail || existingUsername) {
    return reply.status(409).send({ error: "Email or username already in use" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [result] = await db
    .insert(users)
    .values({ username, email, passwordHash })
    .returning({ id: users.id, username: users.username, email: users.email });

  return reply.status(201).send(result);
}

export async function login(
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply
) {
  const { email, password } = request.body;

  if (!email || !password) {
    return reply.status(400).send({ error: "email and password are required" });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));

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
