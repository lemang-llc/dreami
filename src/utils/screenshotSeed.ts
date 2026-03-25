/**
 * Screenshot seed utilities
 *
 * Only imported/called in __DEV__ builds. The state server fetch has an
 * 800 ms timeout, so a missing server adds negligible cold-start overhead
 * in normal development.
 */

import { getDatabase } from '../db/client';
import { dreams, appSettings, chatSessions, chatMessages } from '../db/schema';
import { SETTINGS_KEYS } from '../models/config';

const SCREENSHOT_SERVER = 'http://localhost:19321';

// ─── State server ─────────────────────────────────────────────────────────────

/**
 * Module-level route set by seedForScreenshotState.
 * Read by app/index.tsx on first render to redirect to the correct screen
 * instead of the default /(tabs). Resets to null on each fresh JS bundle load.
 */
export let screenshotRoute: string | null = null;

/**
 * The raw screenshot state string, used by nested layouts (e.g. tabs) that
 * need to perform secondary navigation (e.g. pushing the settings modal).
 */
export let screenshotStateValue: string | null = null;

export async function signalScreenshotReady(): Promise<void> {
  try {
    await fetch(`${SCREENSHOT_SERVER}/ready`, { method: 'POST' });
  } catch {
    // Server may already be gone — no-op
  }
}

export async function fetchScreenshotState(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);
    const res = await fetch(`${SCREENSHOT_SERVER}/screenshot-state`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const json = await res.json();
    return json.state ?? null;
  } catch {
    return null;
  }
}

// ─── Fixed demo timestamps ────────────────────────────────────────────────────
// Chosen to match the example screenshots (Mon Mar 2 + Tue Mar 3, 2026)

const MAR_03_0532 = '2026-03-03T05:32:00.000Z';
const MAR_02_1750 = '2026-03-02T17:50:00.000Z';
const MAR_02_1747 = '2026-03-02T17:47:00.000Z';
const MAR_04_1923 = '2026-03-04T19:23:00.000Z';
const MAR_04_1928 = '2026-03-04T19:28:00.000Z';

// ─── Dream seeds ──────────────────────────────────────────────────────────────

const CELEBRATION_DREAM = {
  title: 'Celebration',
  transcript:
    "Associates or friends at a fancy Mexican restaurant, hockey game, and wedding. The whole thing felt like a whirlwind social event that kept shifting from one venue to the next, and everyone seemed to know each other.",
  summary: 'Associates or friends at a fancy Mexican restaurant, hockey game, and wedding',
  mood: 'vivid',
  tags: JSON.stringify(['celebration', 'hockey', 'wedding']),
  isProcessed: true,
  createdAt: MAR_03_0532,
};

const FEEDING_FRENZY_DREAM = {
  title: 'Feeding Frenzy in the Aquarium',
  transcript:
    "Tons of aquariums with fish that I forgot to feed, and I'm running around trying to feed all of the fish to keep them alive.",
  summary:
    'A person is trying to feed a large number of fish in an aquarium, but is struggling to keep up with the task.',
  mood: 'anxious',
  tags: JSON.stringify(['aquarium', 'feeding', 'fish']),
  isProcessed: true,
  createdAt: MAR_02_1750,
};

const FLIGHT_DREAM = {
  title: 'Flight of Descent into Madness',
  transcript:
    "But it's longer than that. Okay, so I was on a plane that was crashing, and I couldn't find my exit. Everything was tilting sideways and the overhead bins were flying open.",
  summary: null,
  mood: 'neutral',
  tags: JSON.stringify([]),
  isProcessed: false,
  createdAt: MAR_02_1747,
};

// Chat exchange seeded for the detail and explore-chat states
const CHAT_USER_MSG = 'What do the fish represent in this dream?';
const CHAT_ASSISTANT_MSG =
  "In dreams, fish often symbolize emotions, anxieties, or unresolved issues that need attention and care. The fact that you're struggling to feed a large number of fish suggests that your emotions are feeling overwhelmed and out of control.\n\nThe aquarium itself may represent a sense of confinement, stability, or security, which can be disrupted in this dream. Your anxiety about the fish dying may reflect a fear of neglecting important emotional needs or responsibilities in your waking life.";

// ─── Seeding ──────────────────────────────────────────────────────────────────

/**
 * Seeds the database for the given screenshot state and sets screenshotRoute
 * so that app/index.tsx can redirect to the correct screen on first render.
 */
export async function seedForScreenshotState(
  state: string
): Promise<{ dreamId?: number; sessionId?: number }> {
  const db = getDatabase();
  screenshotStateValue = state;

  // Always mark onboarding complete so the router goes to /(tabs)
  await db
    .insert(appSettings)
    .values({ key: SETTINGS_KEYS.ONBOARDING_COMPLETE, value: 'true' })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: 'true' } });

  if (state === 'empty') {
    // Onboarding complete but no dreams — shows "No Dreams Yet" UI
    await db.delete(dreams);
    screenshotRoute = '/(tabs)';
    return {};
  }

  if (state === 'dreams') {
    // Full dream list matching the screenshot (3 entries across 2 days)
    await db.delete(dreams); // cascades to chat_sessions + chat_messages
    await db.insert(dreams).values(CELEBRATION_DREAM);
    await db.insert(dreams).values(FEEDING_FRENZY_DREAM);
    await db.insert(dreams).values(FLIGHT_DREAM);
    screenshotRoute = '/(tabs)';
    return {};
  }

  if (state === 'record') {
    screenshotRoute = '/(tabs)/record';
    return {};
  }

  if (state === 'explore') {
    screenshotRoute = '/(tabs)/chat';
    return {};
  }

  if (state === 'settings') {
    // Navigate to tabs first; (tabs)/_layout.tsx detects screenshotStateValue
    // and pushes the settings modal on top once the tabs have mounted.
    screenshotRoute = '/(tabs)';
    screenshotStateValue = 'settings';
    return {};
  }

  if (state === 'detail') {
    // Single dream + a previous chat session (shown in "Previous Chats" section)
    await db.delete(dreams);
    const [dreamRow] = await db
      .insert(dreams)
      .values(FEEDING_FRENZY_DREAM)
      .returning({ id: dreams.id });
    const dreamId = dreamRow.id;

    const [sessionRow] = await db
      .insert(chatSessions)
      .values({ dreamId, createdAt: MAR_04_1923, updatedAt: MAR_04_1923 })
      .returning({ id: chatSessions.id });
    const sessionId = sessionRow.id;

    await db.insert(chatMessages).values({
      sessionId, role: 'user', content: CHAT_USER_MSG, createdAt: MAR_04_1923,
    });
    await db.insert(chatMessages).values({
      sessionId, role: 'assistant', content: CHAT_ASSISTANT_MSG, createdAt: MAR_04_1928,
    });

    screenshotRoute = `/dream/${dreamId}`;
    return { dreamId };
  }

  if (state === 'explore-chat') {
    // Dream focused in the chat screen with a full conversation visible
    await db.delete(dreams);
    const [dreamRow] = await db
      .insert(dreams)
      .values(FEEDING_FRENZY_DREAM)
      .returning({ id: dreams.id });
    const dreamId = dreamRow.id;

    const [sessionRow] = await db
      .insert(chatSessions)
      .values({ dreamId, createdAt: MAR_04_1923, updatedAt: MAR_04_1923 })
      .returning({ id: chatSessions.id });
    const sessionId = sessionRow.id;

    await db.insert(chatMessages).values({
      sessionId, role: 'user', content: CHAT_USER_MSG, createdAt: MAR_04_1923,
    });
    await db.insert(chatMessages).values({
      sessionId, role: 'assistant', content: CHAT_ASSISTANT_MSG, createdAt: MAR_04_1928,
    });

    screenshotRoute = `/(tabs)/chat?dreamId=${dreamId}&sessionId=${sessionId}`;
    return { dreamId, sessionId };
  }

  return {};
}
