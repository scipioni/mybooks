import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const invites = sqliteTable("invites", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  invitedBy: text("invited_by")
    .notNull()
    .references(() => users.id),
  redeemedAt: integer("redeemed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  label: text("label").notNull(),
  email: text("email").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const books = sqliteTable("books", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  author: text("author"),
  seriesName: text("series_name"),
  seriesPosition: integer("series_position"),
  tags: text("tags").notNull().default("[]"),
  readingStatus: text("reading_status", {
    enum: ["want-to-read", "reading", "read"],
  })
    .notNull()
    .default("want-to-read"),
  rating: integer("rating"),
  coverPath: text("cover_path"),
  filePath: text("file_path").notNull(),
  openLibraryId: text("open_library_id"),
  language: text("language"),
  isbn: text("isbn"),
  publicationYear: integer("publication_year"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type User = typeof users.$inferSelect;
export type Invite = typeof invites.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type Book = typeof books.$inferSelect;
