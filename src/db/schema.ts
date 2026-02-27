import { int, text, sqliteTable, real } from 'drizzle-orm/sqlite-core';

export const dreams = sqliteTable('dreams', {
  id: int('id').primaryKey({ autoIncrement: true }),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  title: text('title').notNull().default(''),
  transcript: text('transcript').notNull().default(''),
  audioPath: text('audio_path'),
  summary: text('summary'),
  mood: text('mood'),
  tags: text('tags').default('[]'), // JSON string: '["flying","water"]'
  isProcessed: int('is_processed', { mode: 'boolean' }).notNull().default(false),
});

export const dreamChunks = sqliteTable('dream_chunks', {
  id: int('id').primaryKey({ autoIncrement: true }),
  dreamId: int('dream_id')
    .notNull()
    .references(() => dreams.id, { onDelete: 'cascade' }),
  chunkText: text('chunk_text').notNull(),
  embedding: text('embedding').notNull(), // JSON: "[0.12, -0.34, ...]"
  chunkIdx: int('chunk_idx').notNull(),
});

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type Dream = typeof dreams.$inferSelect;
export type NewDream = typeof dreams.$inferInsert;
export type DreamChunk = typeof dreamChunks.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
