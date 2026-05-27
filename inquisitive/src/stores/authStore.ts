import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

type AuthStore = {
  session: Session | null | undefined;
  userId: string | null;
  setSession: (session: Session | null) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  session: undefined,
  userId: null,
  setSession: (session) =>
    set({ session, userId: session?.user?.id ?? null }),
}));
