import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Rating } from 'ts-fsrs';
import { applyRating } from '@/lib/srs/scheduler';
import { recordReviewAttempt } from '@/lib/db/cards';
import type { DueCard } from '@/lib/db/cards';

export function useSubmitRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ card, rating }: { card: DueCard; rating: Rating }) => {
      const { next, log } = applyRating(card.schedule, rating);
      return recordReviewAttempt(card.id, card.user_id, rating, next, log);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dueCards'] });
    },
  });
}
