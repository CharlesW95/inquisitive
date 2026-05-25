import { useQuery } from '@tanstack/react-query';
import { getCardCountForConversation } from '@/lib/db/cards';

export function useCardCount(conversationId: string) {
  return useQuery({
    queryKey: ['cardCount', conversationId],
    queryFn: () => getCardCountForConversation(conversationId),
    enabled: !!conversationId,
  });
}
