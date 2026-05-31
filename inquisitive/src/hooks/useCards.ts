import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
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
  const userId = useAuthStore((s) => s.userId);
  return useMutation({
    mutationFn: ({
      conversationId,
      front,
      back,
    }: {
      conversationId: string;
      front: string;
      back: string;
    }) => createCard(userId!, conversationId, front, back),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['cards', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['cardCount', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      // Also refresh the review surfaces (homescreen preview + explorer) so a deleted
      // card disappears from them, not just from the conversation it belonged to.
      queryClient.invalidateQueries({ queryKey: ['dueCards'] });
      queryClient.invalidateQueries({ queryKey: ['allCards'] });
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
      // Refresh the review surfaces (homescreen preview + explorer) so a deleted
      // card disappears from them, not just from the conversation it belonged to.
      queryClient.invalidateQueries({ queryKey: ['dueCards'] });
      queryClient.invalidateQueries({ queryKey: ['allCards'] });
    },
  });
}
