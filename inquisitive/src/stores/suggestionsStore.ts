import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SuggestionsStore {
  suggestionsByConversation: Record<string, string[]>;
  setSuggestions: (conversationId: string, suggestions: string[]) => void;
  clearSuggestions: (conversationId: string) => void;
}

export const useSuggestionsStore = create<SuggestionsStore>()(
  persist(
    (set) => ({
      suggestionsByConversation: {},
      setSuggestions: (conversationId, suggestions) =>
        set((state) => ({
          suggestionsByConversation: {
            ...state.suggestionsByConversation,
            [conversationId]: suggestions,
          },
        })),
      clearSuggestions: (conversationId) =>
        set((state) => {
          const next = { ...state.suggestionsByConversation };
          delete next[conversationId];
          return { suggestionsByConversation: next };
        }),
    }),
    {
      name: 'suggestions-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
