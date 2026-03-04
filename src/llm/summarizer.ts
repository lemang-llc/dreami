import { getLlmContext, releaseLlmContext } from '../models/llmContext';
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

const SUMMARIZE_N_PREDICT = 350;

// JSON schema passed to llama.rn's grammar-constrained sampler.
// The model is physically forced to emit valid JSON matching this schema —
// it cannot produce prose, preamble, or malformed output.
const SUMMARY_JSON_SCHEMA = JSON.stringify({
  type: 'object',
  properties: {
    title:   { type: 'string' },
    summary: { type: 'string' },
    mood:    { type: 'string', enum: VALID_MOODS },
    tags:    { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 },
  },
  required: ['title', 'summary', 'mood', 'tags'],
  additionalProperties: false,
});

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
  let result: Awaited<ReturnType<typeof ctx.completion>>;
  try {
    result = await ctx.completion(
      {
        prompt,
        json_schema: SUMMARY_JSON_SCHEMA,
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
  } catch (e) {
    // Release the singleton so the next attempt gets a fresh context.
    await releaseLlmContext();
    throw e;
  }

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

// Walk the string tracking brace depth and string escapes to find
// the span of one complete JSON object starting at `start`.
function extractBalancedObject(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape)               { escape = false; continue; }
    if (c === '\\' && inString) { escape = true;  continue; }
    if (c === '"')              { inString = !inString; continue; }
    if (inString)               { continue; }
    if (c === '{')              { depth++; }
    else if (c === '}')         { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

function parseSummaryJson(text: string): DreamSummary {
  // Collect every well-formed JSON object in the output (the model sometimes
  // emits a template or prose before the real answer).  We take the LAST one
  // that contains at least one of the expected fields.
  const candidates: object[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') continue;
    const raw = extractBalancedObject(text, i);
    if (!raw) continue;
    try {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') candidates.push(obj);
    } catch { /* skip malformed spans */ }
    i += raw.length - 1; // advance past this object
  }

  const parsed = candidates
    .filter((c: any) => c.title || c.summary || c.mood || c.tags)
    .at(-1) as any;

  if (!parsed) {
    throw new Error('LLM returned no parseable JSON');
  }

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
}
