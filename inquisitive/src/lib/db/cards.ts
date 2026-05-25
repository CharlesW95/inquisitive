import { supabase } from './client';
import type { Card, CardDraft } from '@/lib/types';

export async function getCardFrontsForConversation(conversationId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('prompt')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null);
  if (error) throw error;
  return (data ?? []).map((r) => r.prompt as string);
}

export async function getCardCountForConversation(conversationId: string): Promise<number> {
  const { count, error } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .is('deleted_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function insertCards(
  userId: string,
  conversationId: string,
  sourceMessageId: string,
  drafts: CardDraft[],
): Promise<Card[]> {
  if (drafts.length === 0) return [];

  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .insert(
      drafts.map((d) => ({
        user_id: userId,
        conversation_id: conversationId,
        source_message_id: sourceMessageId,
        prompt: d.front,
        answer: d.back,
        modality: d.modality,
      })),
    )
    .select();
  if (cardsError) throw cardsError;

  const now = new Date().toISOString();
  const { error: schedError } = await supabase.from('card_schedules').insert(
    cards.map((card) => ({
      card_id: card.id,
      user_id: userId,
      due: now,
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      learning_steps: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      last_review: null,
    })),
  );
  if (schedError) throw schedError;

  return cards as Card[];
}

export async function getConversationCards(conversationId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Card[];
}

export async function createCard(
  userId: string,
  conversationId: string,
  front: string,
  back: string,
): Promise<Card> {
  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .insert({
      user_id: userId,
      conversation_id: conversationId,
      prompt: front,
      answer: back,
      modality: 'basic',
    })
    .select();
  if (cardsError) throw cardsError;
  const card = cards[0] as Card;

  const now = new Date().toISOString();
  const { error: schedError } = await supabase.from('card_schedules').insert({
    card_id: card.id,
    user_id: userId,
    due: now,
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    last_review: null,
  });
  if (schedError) throw schedError;

  return card;
}

export async function updateCard(cardId: string, front: string, back: string): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .update({ prompt: front, answer: back, updated_at: new Date().toISOString() })
    .eq('id', cardId);
  if (error) throw error;
}

export async function deleteCard(cardId: string): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', cardId);
  if (error) throw error;
}
