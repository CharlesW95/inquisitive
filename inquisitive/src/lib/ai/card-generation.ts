import { supabase } from '@/lib/db/client';
import type { CardDraft } from '@/lib/types';

const MIN_RESPONSE_LENGTH = 100;

export async function generateCardsForExchange(
  title: string,
  userMessage: string,
  aiResponse: string,
  existingCardFronts: string[],
): Promise<CardDraft[]> {
  if (aiResponse.length < MIN_RESPONSE_LENGTH) return [];

  const { data } = await supabase.functions.invoke('ai-proxy', {
    body: { type: 'cards', title, userMessage, aiResponse, existingCardFronts },
  });
  return data?.result ?? [];
}
