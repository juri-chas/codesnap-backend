import { pgTable, text, integer, serial, timestamp, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  bio: text("bio").default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const snippets = pgTable("snippets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  code: text("code").notNull(),
  language: text("language").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const snippetTags = pgTable("snippet_tags", {
  snippetId: integer("snippet_id")
    .notNull()
    .references(() => snippets.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  snippetId: integer("snippet_id")
    .notNull()
    .references(() => snippets.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const stars = pgTable(
  "stars",
  {
    id: serial("id").primaryKey(),
    snippetId: integer("snippet_id")
      .notNull()
      .references(() => snippets.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.snippetId, t.userId)]
);
