import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProfileStore {
  firstName: string | null | undefined;
  cachedUserId: string | null;
  setFirstName: (userId: string, firstName: string | null) => void;
  clear: () => void;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      firstName: undefined,
      cachedUserId: null,
      setFirstName: (userId, firstName) =>
        set({ firstName, cachedUserId: userId }),
      clear: () => set({ firstName: undefined, cachedUserId: null }),
    }),
    {
      name: 'profile-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
