import { getLlmContext } from '../models/llmContext';
import { SUMMARIZE_PROMPT } from './prompts';
import { getDatabase } from '../db/client';
import { dreams } from '../db/schema';
import { eq } from 'drizzle-orm';
import { fileExists } from '../utils/fileSystem';
import { MODEL_PATHS } from '../models/config';

export interface DreamSummary {
  title: string;
  summary: string;
  mood: string;
  tags: string[];
}

const VALID_MOODS = ['vivid', 'anxious', 'peaceful', 'strange', 'dark', 'joyful', 'neutral'];

const SUMMARIZE_N_PREDICT = 256;

export async function summarizeDream(
  transcript: string,
  onProgress?: (p: number) => void
): Promise<DreamSummary> {
  if (!transcript || transcript.length < 20) {
    onProgress?.(1);
    return {
      title: 'Dream Entry',
      summary: 'A brief dream fragment.',
      mood: 'neutral',
      tags: [],
    };
  }

  const ctx = await getLlmContext();

  // Wrap in Llama 3.2 Instruct format so the model understands the task.
  const rawPrompt = SUMMARIZE_PROMPT(transcript);
  const prompt = [
    '<|begin_of_text|>',
    '<|start_header_id|>user<|end_header_id|>\n\n',
    rawPrompt,
    '<|eot_id|>',
    '<|start_header_id|>assistant<|end_header_id|>\n\n',
  ].join('');

  let tokensGenerated = 0;

  // Use the return value instead of accumulating token strings in JS.
  // This keeps all string building on the native side and crosses the bridge
  // only once at the end, avoiding heap pressure during token generation.
  const result = await ctx.completion(
    {
      prompt,
      n_predict: SUMMARIZE_N_PREDICT,
      temperature: 0.3,
      top_p: 0.9,
      stop: ['<|eot_id|>', '<|end_of_text|>'],
    },
    (_data) => {
      tokensGenerated++;
      onProgress?.(tokensGenerated / SUMMARIZE_N_PREDICT);
    }
  );

  // llama.rn echoes the full prompt in result.text — extract only the
  // generated portion (same pattern used in chat.ts).
  const AST_HEADER = '<|start_header_id|>assistant<|end_header_id|>\n\n';
  const STOP_RE    = /<\|eot_id\|>|<\|end_of_text\|>/g;
  const generated  = result.text.includes(AST_HEADER)
    ? result.text.slice(result.text.lastIndexOf(AST_HEADER) + AST_HEADER.length)
    : result.text;
  const clean = generated.replace(STOP_RE, '').trim();

  return parseSummaryJson(clean);
}

function parseSummaryJson(text: string): DreamSummary {
  try {
    // Extract JSON from the response (handles extra text before/after)
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');

    const parsed = JSON.parse(match[0]);

    const mood = VALID_MOODS.includes(parsed.mood) ? parsed.mood : 'neutral';
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t: unknown) => typeof t === 'string').slice(0, 5)
      : [];

    return {
      title: (parsed.title || 'Untitled Dream').slice(0, 60),
      summary: parsed.summary || '',
      mood,
      tags,
    };
  } catch {
    return {
      title: 'Dream Entry',
      summary: '',
      mood: 'neutral',
      tags: [],
    };
  }
}

/**
 * Run full post-save processing: summarize + update DB.
 * Designed to be called in the background after a dream is saved.
 */
export async function processDream(
  dreamId: number,
  onProgress?: (p: number) => void
): Promise<void> {
  const db = getDatabase();

  const [dream] = await db
    .select({ transcript: dreams.transcript })
    .from(dreams)
    .where(eq(dreams.id, dreamId));

  if (!dream?.transcript) {
    await db.update(dreams)
      .set({ isProcessed: true, updatedAt: new Date().toISOString() })
      .where(eq(dreams.id, dreamId));
    return;
  }

  // Skip LLM if model not downloaded yet — mark processed so polling stops
  const modelReady = await fileExists(MODEL_PATHS.llm);
  if (!modelReady) {
    await db.update(dreams)
      .set({ isProcessed: true, updatedAt: new Date().toISOString() })
      .where(eq(dreams.id, dreamId));
    return;
  }

  try {
    const summary = await summarizeDream(dream.transcript, onProgress);
    await db
      .update(dreams)
      .set({
        title: summary.title,
        summary: summary.summary,
        mood: summary.mood,
        tags: JSON.stringify(summary.tags),
        isProcessed: true,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(dreams.id, dreamId));
  } catch {
    // Mark processed even on failure so the UI stops spinning
    await db.update(dreams)
      .set({ isProcessed: true, updatedAt: new Date().toISOString() })
      .where(eq(dreams.id, dreamId));
  }
}
