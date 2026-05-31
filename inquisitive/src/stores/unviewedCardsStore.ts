import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UnviewedCardsStore {
  unviewedByConversation: Record<string, boolean>;
  markUnviewed: (conversationId: string) => void;
  markViewed: (conversationId: string) => void;
}

export const useUnviewedCardsStore = create<UnviewedCardsStore>()(
  persist(
    (set) => ({
      unviewedByConversation: {},
      markUnviewed: (conversationId) =>
        set((state) => ({
          unviewedByConversation: {
            ...state.unviewedByConversation,
            [conversationId]: true,
          },
        })),
      markViewed: (conversationId) =>
        set((state) => {
          if (!state.unviewedByConversation[conversationId]) return state;
          const next = { ...state.unviewedByConversation };
          delete next[conversationId];
          return { unviewedByConversation: next };
        }),
    }),
    {
      name: 'unviewed-cards-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
