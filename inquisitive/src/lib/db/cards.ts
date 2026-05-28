import { supabase } from './client';
import type { Card, CardDraft, CardSchedule } from '@/lib/types';
import type { NextSchedule } from '@/lib/srs/scheduler';

export type DueCard = Card & { schedule: CardSchedule; conversationTitle: string | null };

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
    .order('created_at', { ascending: false });
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

export const ALL_CARDS_PAGE_SIZE = 20;

export async function getAllCards(userId: string, page: number = 0): Promise<DueCard[]> {
  const from = page * ALL_CARDS_PAGE_SIZE;
  const to = from + ALL_CARDS_PAGE_SIZE - 1;
  const { data, error } = await supabase
    .from('card_schedules')
    .select('*, cards!inner(*, conversations(title))')
    .eq('user_id', userId)
    .order('due', { ascending: true })
    .range(from, to);
  if (error) throw error;

  return (data ?? [])
    .map((row: any) => {
      const { cards: cardData, ...scheduleData } = row;
      if (!cardData || cardData.deleted_at) return null;
      const { conversations, ...card } = cardData;
      return { ...card, schedule: scheduleData as CardSchedule, conversationTitle: conversations?.title ?? null };
    })
    .filter(Boolean) as DueCard[];
}

export async function getDueCards(userId: string): Promise<DueCard[]> {
  const now = new Date().toISOString();

  const [reviewResult, newResult] = await Promise.all([
    supabase
      .from('card_schedules')
      .select('*, cards!inner(*, conversations(title))')
      .eq('user_id', userId)
      .in('state', [1, 2, 3])
      .lte('due', now)
      .order('due', { ascending: true })
      .limit(100),
    supabase
      .from('card_schedules')
      .select('*, cards!inner(*, conversations(title))')
      .eq('user_id', userId)
      .eq('state', 0)
      .limit(20),
  ]);

  if (reviewResult.error) throw reviewResult.error;
  if (newResult.error) throw newResult.error;

  const toResult = (row: any): DueCard | null => {
    const { cards: cardData, ...scheduleData } = row;
    if (!cardData || cardData.deleted_at) return null;
    const { conversations, ...card } = cardData;
    return {
      ...card,
      schedule: scheduleData as CardSchedule,
      conversationTitle: conversations?.title ?? null,
    };
  };

  return [
    ...(reviewResult.data ?? []).map(toResult).filter(Boolean),
    ...(newResult.data ?? []).map(toResult).filter(Boolean),
  ] as DueCard[];
}

export async function recordReviewAttempt(
  cardId: string,
  userId: string,
  rating: number,
  updatedSchedule: NextSchedule,
  fsrsLog: object,
): Promise<void> {
  const { error: schedError } = await supabase
    .from('card_schedules')
    .update({ ...updatedSchedule })
    .eq('card_id', cardId)
    .eq('user_id', userId);
  if (schedError) throw schedError;

  const { error: attemptError } = await supabase.from('review_attempts').insert({
    card_id: cardId,
    user_id: userId,
    rating,
    answered_at: new Date().toISOString(),
    fsrs_log: fsrsLog,
  });
  if (attemptError) throw attemptError;
}
