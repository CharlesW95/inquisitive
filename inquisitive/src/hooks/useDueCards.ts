import { useQuery } from '@tanstack/react-query';
import { getDueCards } from '@/lib/db/cards';

export function useDueCards(userId: string) {
  return useQuery({
    queryKey: ['dueCards', userId],
    queryFn: () => getDueCards(userId),
    enabled: !!userId,
    refetchOnWindowFocus: true,
  });
}
