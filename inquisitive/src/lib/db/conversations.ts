import { supabase } from './client';
import type { Conversation, Message } from '@/lib/types';

export async function getConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, cards(count)')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    ...row,
    card_count: (row.cards as { count: number }[])[0]?.count ?? 0,
    cards: undefined,
  }));
}

export async function getConversationsPaged(
  userId: string,
  limit: number,
  offset: number,
): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, cards(count)')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data.map((row) => ({
    ...row,
    card_count: (row.cards as { count: number }[])[0]?.count ?? 0,
    cards: undefined,
  }));
}

export async function searchConversations(userId: string, query: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, cards(count)')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .ilike('title', `%${query}%`)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    ...row,
    card_count: (row.cards as { count: number }[])[0]?.count ?? 0,
    cards: undefined,
  }));
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteConversation(id: string, deleteCards: boolean): Promise<void> {
  const now = new Date().toISOString();
  if (deleteCards) {
    const { error: cardsErr } = await supabase
      .from('cards')
      .update({ deleted_at: now })
      .eq('conversation_id', id)
      .is('deleted_at', null);
    if (cardsErr) throw cardsErr;
  } else {
    const { error: unlinkErr } = await supabase
      .from('cards')
      .update({ conversation_id: null })
      .eq('conversation_id', id)
      .is('deleted_at', null);
    if (unlinkErr) throw unlinkErr;
  }
  const { error } = await supabase
    .from('conversations')
    .update({ deleted_at: now })
    .eq('id', id);
  if (error) throw error;
}

export async function createConversation(userId: string): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title: '' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', id);
  if (error) throw error;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function insertMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}
