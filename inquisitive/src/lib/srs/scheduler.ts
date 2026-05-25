import { fsrs, Rating, type Card as FSRSCard, type Grade } from 'ts-fsrs';
import type { CardSchedule } from '@/lib/types';

const f = fsrs();

export type NextSchedule = Omit<CardSchedule, 'id' | 'card_id' | 'user_id'>;

export type SchedulingOption = {
  rating: Rating;
  label: string;
  intervalLabel: string;
};

function toFSRSCard(schedule: CardSchedule): FSRSCard {
  return {
    due: new Date(schedule.due),
    stability: schedule.stability,
    difficulty: schedule.difficulty,
    elapsed_days: 0,
    scheduled_days: schedule.scheduled_days,
    learning_steps: 0,
    reps: schedule.reps,
    lapses: schedule.lapses,
    state: schedule.state,
    last_review: schedule.last_review ? new Date(schedule.last_review) : undefined,
  };
}

function formatIntervalLabel(due: Date, now: Date): string {
  const diffMins = Math.max(0, Math.round((due.getTime() - now.getTime()) / 60_000));
  if (diffMins < 1) return '<1m';
  if (diffMins < 60) return `${diffMins}m`;
  const diffDays = Math.round(diffMins / 1440);
  if (diffDays < 30) return `${diffDays}d`;
  return `${Math.round(diffDays / 30)}mo`;
}

const RATING_LABELS: Record<number, string> = {
  [Rating.Again]: 'Again',
  [Rating.Hard]: 'Hard',
  [Rating.Good]: 'Good',
  [Rating.Easy]: 'Easy',
};

const RATING_ORDER = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const;

export function getSchedulingOptions(schedule: CardSchedule): SchedulingOption[] {
  const now = new Date();
  const preview = f.repeat(toFSRSCard(schedule), now);
  return RATING_ORDER.map((rating) => ({
    rating,
    label: RATING_LABELS[rating],
    intervalLabel: formatIntervalLabel(preview[rating].card.due, now),
  }));
}

export function applyRating(
  schedule: CardSchedule,
  rating: Rating,
): { next: NextSchedule; log: object } {
  const now = new Date();
  const { card: nextCard, log } = f.next(toFSRSCard(schedule), now, rating as Grade);
  return {
    next: {
      due: nextCard.due.toISOString(),
      stability: nextCard.stability,
      difficulty: nextCard.difficulty,
      scheduled_days: nextCard.scheduled_days,
      reps: nextCard.reps,
      lapses: nextCard.lapses,
      state: nextCard.state,
      last_review: nextCard.last_review?.toISOString() ?? now.toISOString(),
    },
    log: log as object,
  };
}
