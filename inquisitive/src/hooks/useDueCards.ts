import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ALL_CARDS_PAGE_SIZE, getAllCards, getDueCards } from '@/lib/db/cards';

export function useDueCards(userId: string) {
  return useQuery({
    queryKey: ['dueCards', userId],
    queryFn: () => getDueCards(userId),
    enabled: !!userId,
    refetchOnWindowFocus: true,
  });
}

export function useAllCardsPaginated(userId: string) {
  return useInfiniteQuery({
    queryKey: ['allCards', userId],
    queryFn: ({ pageParam }) => getAllCards(userId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === ALL_CARDS_PAGE_SIZE ? allPages.length : undefined,
    enabled: !!userId,
  });
}
