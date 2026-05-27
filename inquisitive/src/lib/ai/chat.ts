import { supabase } from '@/lib/db/client';

export const REFUSAL_TEXT = "I'm here to help you learn — try asking something you're genuinely curious about.";

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export function streamChatResponse(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: Error) => void,
): void {
  let fullText = '';

  (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-proxy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({ type: 'chat', messages }),
      },
    );

    if (!response.ok) throw new Error(`AI proxy error: ${response.status}`);

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') { onComplete(fullText); return; }
        try {
          const { text } = JSON.parse(payload);
          fullText += text;
          onToken(text);
        } catch { /* skip malformed lines */ }
      }
    }
  })().catch(onError);
}

export async function generateConversationTitle(firstMessage: string): Promise<string> {
  const { data } = await supabase.functions.invoke('ai-proxy', {
    body: { type: 'title', firstMessage },
  });
  return data?.result ?? firstMessage.slice(0, 50);
}
