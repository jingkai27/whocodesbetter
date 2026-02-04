import { create } from 'zustand';
import { ChatMessage } from '@codeduel/shared';

interface ChatState {
  lobbyMessages: ChatMessage[];
  matchMessages: Record<string, ChatMessage[]>;

  // Actions
  addLobbyMessage: (message: ChatMessage) => void;
  addMatchMessage: (matchId: string, message: ChatMessage) => void;
  setMatchMessages: (matchId: string, messages: ChatMessage[]) => void;
  clearMatchMessages: (matchId: string) => void;
  reset: () => void;
}

const MAX_MESSAGES = 100;

export const useChatStore = create<ChatState>((set) => ({
  lobbyMessages: [],
  matchMessages: {},

  addLobbyMessage: (message) =>
    set((state) => ({
      lobbyMessages: [...state.lobbyMessages, message].slice(-MAX_MESSAGES),
    })),

  addMatchMessage: (matchId, message) =>
    set((state) => ({
      matchMessages: {
        ...state.matchMessages,
        [matchId]: [
          ...(state.matchMessages[matchId] || []),
          message,
        ].slice(-MAX_MESSAGES),
      },
    })),

  setMatchMessages: (matchId, messages) =>
    set((state) => ({
      matchMessages: {
        ...state.matchMessages,
        [matchId]: messages,
      },
    })),

  clearMatchMessages: (matchId) =>
    set((state) => {
      const { [matchId]: _, ...rest } = state.matchMessages;
      return { matchMessages: rest };
    }),

  reset: () =>
    set({
      lobbyMessages: [],
      matchMessages: {},
    }),
}));
