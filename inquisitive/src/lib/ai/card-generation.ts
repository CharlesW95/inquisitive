import { anthropic } from './client';
import type { CardDraft } from '@/lib/types';

const MIN_RESPONSE_LENGTH = 100;

export async function generateCardsForExchange(
  title: string,
  userMessage: string,
  aiResponse: string,
  existingCardFronts: string[],
): Promise<CardDraft[]> {
  if (aiResponse.length < MIN_RESPONSE_LENGTH) return [];

  const existingSection =
    existingCardFronts.length > 0
      ? `\nExisting cards for this conversation — avoid generating near-duplicates:\n${existingCardFronts.map((f) => `- ${f}`).join('\n')}\n`
      : '';

  const prompt =
    `You are a learning assistant creating flashcards from a conversation exchange.\n\n` +
    `Given this exchange from a conversation titled '${title}', generate 0–2 flashcards worth adding to a spaced repetition deck.\n\n` +
    `Guidelines for the front (the question):\n` +
    `- Ask about causes, mechanisms, significance, or deeper "why/how" — not surface facts like dates or names\n` +
    `- Frame it so answering requires genuine understanding, not recall of a single word\n\n` +
    `Guidelines for the back (the answer):\n` +
    `- Be concise and direct — no padding or restatement of the question\n` +
    `- Use bullet points when listing multiple contributing factors or steps\n` +
    `- Weave in specific names, dates, or facts only where they add concrete meaning\n\n` +
    `Set modality to "basic" for most cards. Use "quiz" only when the concept lends itself to a specific right/wrong answer. If nothing in this exchange merits a standalone card, return an empty array.\n` +
    existingSection +
    `\nExchange:\nUser: ${userMessage}\n\nAssistant: ${aiResponse}\n\n` +
    `Return JSON only: an array of { front, back, modality } objects, or [].`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  if (block.type !== 'text') return [];

  try {
    const text = block.text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CardDraft =>
        typeof item === 'object' &&
        typeof item.front === 'string' &&
        typeof item.back === 'string' &&
        (item.modality === 'basic' || item.modality === 'quiz'),
    );
  } catch {
    return [];
  }
}
