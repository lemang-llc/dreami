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

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type Dream = typeof dreams.$inferSelect;
export type NewDream = typeof dreams.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;
