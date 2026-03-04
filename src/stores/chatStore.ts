import { create } from 'zustand';
import { ChatMessage } from '../llm/chat';

interface ChatStore {
  messages: ChatMessage[];
  isGenerating: boolean;
  streamingContent: string;
  currentSessionId: number | null;

  addMessage: (msg: ChatMessage) => void;
  appendStreamToken: (token: string) => void;
  finalizeStream: (fullContent: string) => void;
  setIsGenerating: (v: boolean) => void;
  clearMessages: () => void;
  setCurrentSessionId: (id: number | null) => void;
  setMessages: (msgs: ChatMessage[]) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isGenerating: false,
  streamingContent: '',
  currentSessionId: null,

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  appendStreamToken: (token) =>
    set((state) => ({ streamingContent: state.streamingContent + token })),

  finalizeStream: (fullContent) =>
    set((state) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: fullContent,
        timestamp: Date.now(),
      };
      return {
        messages: [...state.messages, assistantMessage],
        streamingContent: '',
        isGenerating: false,
      };
    }),

  setIsGenerating: (v) => set({ isGenerating: v }),

  clearMessages: () => set({ messages: [], streamingContent: '' }),

  setCurrentSessionId: (id) => set({ currentSessionId: id }),

  setMessages: (msgs) => set({ messages: msgs, streamingContent: '' }),
}));
