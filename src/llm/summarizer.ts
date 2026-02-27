import { getLlmContext } from '../models/llmContext';
import { SUMMARIZE_PROMPT } from './prompts';
import { getDatabase } from '../db/client';
import { dreams } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface DreamSummary {
  title: string;
  summary: string;
  mood: string;
  tags: string[];
}

const VALID_MOODS = ['vivid', 'anxious', 'peaceful', 'strange', 'dark', 'joyful', 'neutral'];

export async function summarizeDream(transcript: string): Promise<DreamSummary> {
  if (!transcript || transcript.trim().length < 20) {
    return {
      title: 'Dream Entry',
      summary: 'A brief dream fragment.',
      mood: 'neutral',
      tags: [],
    };
  }

  const ctx = await getLlmContext();
  const prompt = SUMMARIZE_PROMPT(transcript);

  let fullText = '';

  await ctx.completion(
    {
      prompt,
      n_predict: 256,
      temperature: 0.3,
      top_p: 0.9,
      stop: ['\n\n', '```'],
    },
    (data) => {
      fullText += data.token;
    }
  );

  return parseSummaryJson(fullText);
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
export async function processDream(dreamId: number): Promise<void> {
  const db = getDatabase();

  const [dream] = await db
    .select({ transcript: dreams.transcript })
    .from(dreams)
    .where(eq(dreams.id, dreamId));

  if (!dream?.transcript) return;

  const summary = await summarizeDream(dream.transcript);

  await db
    .update(dreams)
    .set({
      title: summary.title,
      summary: summary.summary,
      mood: summary.mood,
      tags: JSON.stringify(summary.tags),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(dreams.id, dreamId));
}
