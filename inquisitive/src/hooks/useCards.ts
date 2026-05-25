import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCard,
  deleteCard,
  getCardCountForConversation,
  getConversationCards,
  updateCard,
} from '@/lib/db/cards';

export function useCardCount(conversationId: string) {
  return useQuery({
    queryKey: ['cardCount', conversationId],
    queryFn: () => getCardCountForConversation(conversationId),
    enabled: !!conversationId,
  });
}

export function useConversationCards(conversationId: string) {
  return useQuery({
    queryKey: ['cards', conversationId],
    queryFn: () => getConversationCards(conversationId),
    enabled: !!conversationId,
  });
}

export function useCreateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      conversationId,
      front,
      back,
    }: {
      userId: string;
      conversationId: string;
      front: string;
      back: string;
    }) => createCard(userId, conversationId, front, back),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['cards', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['cardCount', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useUpdateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cardId,
      front,
      back,
    }: {
      cardId: string;
      conversationId: string;
      front: string;
      back: string;
    }) => updateCard(cardId, front, back),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['cards', conversationId] });
    },
  });
}

export function useDeleteCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId }: { cardId: string; conversationId: string }) => deleteCard(cardId),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['cards', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['cardCount', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
