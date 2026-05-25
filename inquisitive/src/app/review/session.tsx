import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import Markdown from 'react-native-markdown-display';
import { Rating } from 'ts-fsrs';
import { colors } from '@/constants/colors';
import { sessionAnswerMarkdownStyles, sessionQuestionMarkdownStyles } from '@/constants/typography';
import { DEV_USER_ID } from '@/constants/dev';
import { useDueCards } from '@/hooks/useDueCards';
import { useSubmitRating } from '@/hooks/useCardReview';
import { useDeleteCard } from '@/hooks/useCards';
import { useToastStore } from '@/stores/toastStore';
import { getSchedulingOptions, type SchedulingOption } from '@/lib/srs/scheduler';
import type { DueCard } from '@/lib/db/cards';

const RATING_COLORS: Record<number, string> = {
  [Rating.Again]: '#E05252',
  [Rating.Hard]: '#D9843A',
  [Rating.Good]: '#C8A84B',
  [Rating.Easy]: '#5BAD72',
};

function formatDueLabel(due: string): string {
  const now = new Date();
  const dueDate = new Date(due);
  const diffDays = Math.round((dueDate.getTime() - now.getTime()) / 86_400_000);
  if (diffDays < 0) return 'OVERDUE';
  if (diffDays === 0) return 'DUE TODAY';
  return `DUE IN ${diffDays} DAY${diffDays === 1 ? '' : 'S'}`;
}

function CardPopover({
  visible,
  onClose,
  onEdit,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.popoverOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.popover}>
          <TouchableOpacity style={styles.popoverItem} onPress={onEdit}>
            <SymbolView name="pencil" size={15} tintColor={colors.textMuted} />
            <Text style={styles.popoverText}>Edit</Text>
          </TouchableOpacity>
          <View style={styles.popoverDivider} />
          <TouchableOpacity style={styles.popoverItem} onPress={onDelete}>
            <SymbolView name="trash" size={15} tintColor="#E05252" />
            <Text style={[styles.popoverText, styles.popoverDelete]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function DeleteModal({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>Delete this card?</Text>
          <Text style={styles.dialogSubtitle}>This action cannot be undone.</Text>
          <View style={styles.dialogRule} />
          <View style={styles.dialogButtons}>
            <TouchableOpacity style={styles.dialogBtn} onPress={onCancel}>
              <Text style={styles.dialogBtnCancel}>Cancel</Text>
            </TouchableOpacity>
            <View style={styles.dialogDivider} />
            <TouchableOpacity style={styles.dialogBtn} onPress={onConfirm}>
              <Text style={styles.dialogBtnConfirm}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ReviewSessionScreen() {
  const { startCardId } = useLocalSearchParams<{ startCardId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: dueCards, isLoading } = useDueCards(DEV_USER_ID);
  const submitRating = useSubmitRating();
  const deleteCard = useDeleteCard();
  const showToast = useToastStore((s) => s.showToast);

  const [queue, setQueue] = useState<DueCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'question' | 'answer'>('question');
  const [ratedCount, setRatedCount] = useState(0);
  const [initialSize, setInitialSize] = useState(0);
  const [showPopover, setShowPopover] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (dueCards && !initialized.current) {
      initialized.current = true;
      let ordered = [...dueCards];
      if (startCardId) {
        const idx = ordered.findIndex((c) => c.id === startCardId);
        if (idx > 0) {
          const [card] = ordered.splice(idx, 1);
          ordered = [card, ...ordered];
        }
      }
      setQueue(ordered);
      setInitialSize(ordered.length);
    }
  }, [dueCards, startCardId]);

  const currentCard = queue[currentIndex] ?? null;
  const schedulingOptions: SchedulingOption[] = currentCard
    ? getSchedulingOptions(currentCard.schedule)
    : [];

  const isComplete = initialSize > 0 && ratedCount >= initialSize;

  async function handleRate(rating: Rating) {
    if (!currentCard || submitRating.isPending) return;
    try {
      await submitRating.mutateAsync({ card: currentCard, rating });
      setRatedCount((n) => n + 1);
      setCurrentIndex((i) => i + 1);
      setPhase('question');
    } catch {
      showToast('Failed to save review', 'error');
    }
  }

  function handleSkip() {
    if (!currentCard) return;
    setQueue((q) => {
      const next = [...q];
      const [card] = next.splice(currentIndex, 1);
      next.push(card);
      return next;
    });
    setPhase('question');
  }

  async function handleDelete() {
    if (!currentCard) return;
    setShowDeleteModal(false);
    setShowPopover(false);
    await deleteCard.mutateAsync({
      cardId: currentCard.id,
      conversationId: currentCard.conversation_id ?? '',
    });
    setQueue((q) => q.filter((c) => c.id !== currentCard.id));
    setInitialSize((n) => Math.max(0, n - 1));
    setPhase('question');
  }

  function handleEdit() {
    if (!currentCard) return;
    setShowPopover(false);
    router.push({ pathname: '/card/[id]/edit' as any, params: { id: currentCard.id, conversationId: currentCard.conversation_id ?? '' } });
  }

  if (isLoading && !initialized.current) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.centered]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (isComplete) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.centered]}>
        <SymbolView name="checkmark.circle.fill" size={64} tintColor={colors.accent} />
        <Text style={styles.completeTitle}>All done!</Text>
        <Text style={styles.completeSubtitle}>{ratedCount} card{ratedCount === 1 ? '' : 's'} reviewed</Text>
        <TouchableOpacity style={styles.goldPill} onPress={() => router.replace('/(tabs)/' as any)}>
          <Text style={styles.goldPillText}>Back to home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentCard) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.centered]}>
        <Text style={styles.emptyText}>No cards due for review.</Text>
        <TouchableOpacity style={[styles.goldPill, { marginTop: 24 }]} onPress={() => router.back()}>
          <Text style={styles.goldPillText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progress = initialSize > 0 ? ratedCount / initialSize : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.topBarClose}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.counter}>{ratedCount + 1} / {initialSize}</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* Topic row */}
        <View style={styles.topicRow}>
          <Text style={styles.topicLabel} numberOfLines={1}>
            {currentCard.conversationTitle?.toUpperCase() ?? 'CARD'}
          </Text>
          <TouchableOpacity onPress={() => setShowPopover(true)} hitSlop={8}>
            <Text style={styles.moreBtn}>···</Text>
          </TouchableOpacity>
        </View>

        {/* Due label */}
        <Text style={styles.dueLabel}>{formatDueLabel(currentCard.schedule.due)}</Text>

        {/* Question */}
        <Markdown style={sessionQuestionMarkdownStyles}>{currentCard.prompt}</Markdown>

        {phase === 'answer' && (
          <>
            <View style={styles.divider} />
            <Text style={styles.answerLabel}>ANSWER</Text>
            <Markdown style={sessionAnswerMarkdownStyles}>{currentCard.answer}</Markdown>
          </>
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
        {phase === 'question' ? (
          <>
            <TouchableOpacity style={styles.goldPill} onPress={() => setPhase('answer')}>
              <Text style={styles.goldPillText}>Show answer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSkip} style={styles.skipLink}>
              <Text style={styles.skipText}>Skip this card  ›</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.ratingRow}>
              {schedulingOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.rating}
                  style={styles.ratingBtn}
                  onPress={() => handleRate(opt.rating)}
                  disabled={submitRating.isPending}
                >
                  <View style={[styles.ratingDot, { backgroundColor: RATING_COLORS[opt.rating] }]} />
                  <Text style={styles.ratingLabel}>{opt.label}</Text>
                  <Text style={styles.ratingInterval}>{opt.intervalLabel}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={handleSkip} style={styles.skipLink}>
              <Text style={styles.skipText}>Skip this card  ›</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <CardPopover
        visible={showPopover}
        onClose={() => setShowPopover(false)}
        onEdit={handleEdit}
        onDelete={() => {
          setShowPopover(false);
          setShowDeleteModal(true);
        }}
      />

      <DeleteModal
        visible={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  topBarClose: {
    width: 24,
    alignItems: 'center',
  },
  closeBtn: {
    fontFamily: 'Inter',
    fontSize: 18,
    color: colors.textMuted,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  counter: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: colors.textMuted,
    minWidth: 40,
    textAlign: 'right',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  topicLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1,
    flex: 1,
    marginRight: 8,
  },
  moreBtn: {
    fontFamily: 'Inter',
    fontSize: 18,
    color: colors.textMuted,
    letterSpacing: 2,
  },
  dueLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  question: {
    fontFamily: 'Fraunces',
    fontSize: 22,
    color: colors.textPrimary,
    lineHeight: 30,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  answerLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  answer: {
    fontFamily: 'Fraunces-Light',
    fontSize: 17,
    color: colors.textPrimary,
    lineHeight: 26,
  },
  bottomActions: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  goldPill: {
    backgroundColor: colors.accent,
    borderRadius: 26,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldPillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.background,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  skipText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.textMuted,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  ratingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  ratingLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  ratingInterval: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  completeTitle: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 24,
    color: colors.textPrimary,
    marginTop: 8,
  },
  completeSubtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.textMuted,
  },
  // Popover
  popoverOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  popover: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 160,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  popoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  popoverText: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.textPrimary,
  },
  popoverDelete: {
    color: '#E05252',
  },
  popoverDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  // Delete modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    width: 280,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
  },
  dialogTitle: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 20,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  dialogSubtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  dialogRule: {
    height: 1,
    backgroundColor: colors.border,
  },
  dialogButtons: {
    flexDirection: 'row',
  },
  dialogBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dialogDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  dialogBtnCancel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  dialogBtnConfirm: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#E05252',
  },
});
