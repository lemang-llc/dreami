import { getLlmContext } from '../models/llmContext';
import { CHAT_SYSTEM_PROMPT, EMPTY_JOURNAL_PROMPT } from './prompts';
import { queryDreams, formatContext } from '../rag/pipeline';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export type TokenCallback = (token: string) => void;

/**
 * Send a message in the dream journal chat, using RAG to provide context.
 * Streams tokens via onToken callback.
 */
export async function sendChatMessage(
  userMessage: string,
  conversationHistory: ChatMessage[],
  onToken: TokenCallback,
  onComplete?: () => void
): Promise<string> {
  const ctx = await getLlmContext();

  // Retrieve relevant dream chunks
  const chunks = await queryDreams(userMessage, 5);
  const context = formatContext(chunks);

  const systemPrompt =
    chunks.length > 0
      ? CHAT_SYSTEM_PROMPT(context)
      : EMPTY_JOURNAL_PROMPT;

  // Build conversation prompt in ChatML format
  const historyText = conversationHistory
    .slice(-6) // Last 3 exchanges to stay within context
    .map((m) =>
      m.role === 'user'
        ? `<|user|>\n${m.content}<|end|>`
        : `<|assistant|>\n${m.content}<|end|>`
    )
    .join('\n');

  const prompt = [
    `<|system|>\n${systemPrompt}<|end|>`,
    historyText,
    `<|user|>\n${userMessage}<|end|>`,
    '<|assistant|>',
  ]
    .filter(Boolean)
    .join('\n');

  const result = await ctx.completion(
    {
      prompt,
      n_predict: 512,
      temperature: 0.7,
      top_p: 0.9,
      penalty_repeat: 1.1,
      stop: ['<|end|>', '<|user|>', '<|system|>'],
    },
    (data) => {
      onToken(data.token);
    }
  );

  onComplete?.();
  return result.text;
}
