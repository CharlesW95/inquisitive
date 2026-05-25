import { anthropic } from './client';

export async function generateFollowUpSuggestions(
  userMessage: string,
  assistantResponse: string,
): Promise<string[]> {
  const prompt =
    `Given this conversation exchange, suggest 3 short, concise follow-up questions the user might want to ask next to deepen their understanding.\n\n` +
    `User: ${userMessage}\n\nAssistant: ${assistantResponse}\n\n` +
    `Return JSON only: an array of exactly 3 strings. No other text.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  if (block.type !== 'text') return [];

  try {
    const text = block.text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string').slice(0, 3);
  } catch {
    return [];
  }
}
