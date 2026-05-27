import { supabase } from './client';
import type { Profile } from '@/lib/types';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as Profile;
}

export async function upsertProfile(
  userId: string,
  data: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...data });
  if (error) throw error;
}
