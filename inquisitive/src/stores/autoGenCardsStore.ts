import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AutoGenCardsStore {
  autoGenByConversation: Record<string, boolean>;
  setAutoGen: (conversationId: string, value: boolean) => void;
}

export const useAutoGenCardsStore = create<AutoGenCardsStore>()(
  persist(
    (set) => ({
      autoGenByConversation: {},
      setAutoGen: (conversationId, value) =>
        set((state) => ({
          autoGenByConversation: {
            ...state.autoGenByConversation,
            [conversationId]: value,
          },
        })),
    }),
    {
      name: 'auto-gen-cards-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
