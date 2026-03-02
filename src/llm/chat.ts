import { getLlmContext } from '../models/llmContext';
import { CHAT_SYSTEM_PROMPT, EMPTY_JOURNAL_PROMPT, FOCUSED_DREAM_SYSTEM_PROMPT } from './prompts';
import { queryDreams, formatContext } from '../rag/pipeline';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export type TokenCallback = (token: string) => void;

// Llama 3.2 Instruct special tokens
const LLAMA_BOS        = '<|begin_of_text|>';
const LLAMA_EOT        = '<|eot_id|>';
const LLAMA_SYS_OPEN  = '<|start_header_id|>system<|end_header_id|>\n\n';
const LLAMA_USR_OPEN  = '<|start_header_id|>user<|end_header_id|>\n\n';
const LLAMA_AST_OPEN  = '<|start_header_id|>assistant<|end_header_id|>\n\n';

const STOP_TOKENS_RE = /<\|eot_id\|>|<\|end_of_text\|>/g;

/**
 * Send a message in the dream journal chat, using RAG to provide context.
 * Streams tokens via onToken callback.
 * onComplete receives the final clean response text.
 */
export async function sendChatMessage(
  userMessage: string,
  conversationHistory: ChatMessage[],
  onToken: TokenCallback,
  onComplete?: (response: string) => void,
  pinnedContext?: string,
): Promise<string> {
  const ctx = await getLlmContext();

  // Retrieve relevant dream chunks. Fetch fewer when a dream is pinned
  // since we already have its full content in the system prompt.
  const chunks = await queryDreams(userMessage, pinnedContext ? 3 : 5);
  const ragContext = formatContext(chunks);

  let systemPrompt: string;
  if (pinnedContext) {
    systemPrompt = FOCUSED_DREAM_SYSTEM_PROMPT(pinnedContext, ragContext || undefined);
  } else {
    systemPrompt = chunks.length > 0 ? CHAT_SYSTEM_PROMPT(ragContext) : EMPTY_JOURNAL_PROMPT;
  }

  // Build conversation prompt in Llama 3.2 Instruct format
  const historyText = conversationHistory
    .slice(-6) // Last 3 exchanges to stay within context
    .map((m) =>
      m.role === 'user'
        ? `${LLAMA_USR_OPEN}${m.content}${LLAMA_EOT}`
        : `${LLAMA_AST_OPEN}${m.content}${LLAMA_EOT}`
    )
    .join('');

  const prompt = [
    LLAMA_BOS,
    `${LLAMA_SYS_OPEN}${systemPrompt}${LLAMA_EOT}`,
    historyText,
    `${LLAMA_USR_OPEN}${userMessage}${LLAMA_EOT}`,
    LLAMA_AST_OPEN,
  ].join('');

  const result = await ctx.completion(
    {
      prompt,
      n_predict: 512,
      temperature: 0.7,
      top_p: 0.9,
      penalty_repeat: 1.1,
      stop: ['<|eot_id|>', '<|end_of_text|>'],
    },
    (data) => {
      onToken(data.token);
    }
  );

  // Use result.text (the definitive generated text). As a safety net, strip
  // any echoed assistant header that the model may have prepended, then clean
  // up any remaining special tokens.
  const raw = result.text.includes(LLAMA_AST_OPEN)
    ? result.text.slice(result.text.lastIndexOf(LLAMA_AST_OPEN) + LLAMA_AST_OPEN.length)
    : result.text;
  const clean = raw.replace(STOP_TOKENS_RE, '').trim();
  onComplete?.(clean);
  return clean;
}
