import { supabase } from '@/lib/db/client';

export async function generateFollowUpSuggestions(
  userMessage: string,
  assistantResponse: string,
): Promise<string[]> {
  const { data } = await supabase.functions.invoke('ai-proxy', {
    body: { type: 'suggestions', userMessage, assistantResponse },
  });
  return data?.result ?? [];
}
