import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';
import { cardQuestionMarkdownStyles } from '@/constants/typography';
import { DEV_USER_ID } from '@/constants/dev';
import { useAllCardsPaginated, useDueCards } from '@/hooks/useDueCards';
import { useDeleteCard } from '@/hooks/useCards';
import type { DueCard } from '@/lib/db/cards';

type FilterMode = 'due' | 'all';

function formatDueDateLabel(due: string): string {
  const now = new Date();
  const dueDate = new Date(due);
  const diffDays = Math.round((dueDate.getTime() - now.getTime()) / 86_400_000);
  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Due today';
  return `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
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

export default function CardExplorerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterMode>('due');
  const [popoverCard, setPopoverCard] = useState<DueCard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DueCard | null>(null);

  const { data: dueCards = [] } = useDueCards(DEV_USER_ID);
  const { data: allPages, fetchNextPage, hasNextPage, isFetchingNextPage } = useAllCardsPaginated(DEV_USER_ID);
  const deleteCard = useDeleteCard();

  const allCards = useMemo(() => allPages?.pages.flat() ?? [], [allPages]);
  const displayCards = filter === 'due' ? dueCards : allCards;

  function handleEndReached() {
    if (filter === 'all' && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    await deleteCard.mutateAsync({
      cardId: deleteTarget.id,
      conversationId: deleteTarget.conversation_id ?? '',
    });
    setDeleteTarget(null);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBack} hitSlop={8}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Cards</Text>
        <View style={styles.navBack} />
      </View>

      {/* Filter toggle */}
      <View style={styles.toggleRow}>
        {(['due', 'all'] as FilterMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.toggleBtn, filter === mode && styles.toggleBtnActive]}
            onPress={() => setFilter(mode)}
          >
            <Text style={[styles.toggleLabel, filter === mode && styles.toggleLabelActive]}>
              {mode === 'due' ? 'Due' : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Card list */}
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={displayCards}
        keyExtractor={(item) => item.id}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {filter === 'due' ? 'No cards due for review.' : 'No cards yet.'}
          </Text>
        }
        ListFooterComponent={
          isFetchingNextPage && filter === 'all'
            ? <ActivityIndicator color={colors.textMuted} style={styles.loadingMore} />
            : null
        }
        renderItem={({ item: card }) => (
          <TouchableOpacity
            style={styles.cardItem}
            onPress={() => router.push({ pathname: '/review/session' as any, params: { startCardId: card.id } })}
            activeOpacity={0.7}
          >
            <View style={styles.cardItemRow}>
              <Text style={styles.cardTopic} numberOfLines={1}>
                {card.conversationTitle?.toUpperCase() ?? 'CARD'}
              </Text>
              <TouchableOpacity onPress={() => setPopoverCard(card)} hitSlop={8}>
                <Text style={styles.moreBtn}>···</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardDue}>{formatDueDateLabel(card.schedule.due)}</Text>
            <Markdown style={cardQuestionMarkdownStyles}>{card.prompt}</Markdown>
          </TouchableOpacity>
        )}
      />

      {/* Bottom CTA */}
      <View style={[styles.bottomCta, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.goldPill, dueCards.length === 0 && styles.goldPillDisabled]}
          onPress={() => router.push('/review/session' as any)}
          disabled={dueCards.length === 0}
        >
          <Text style={[styles.goldPillText, dueCards.length === 0 && styles.goldPillTextDisabled]}>
            Review due cards ({dueCards.length})
          </Text>
        </TouchableOpacity>
      </View>

      <CardPopover
        visible={!!popoverCard}
        onClose={() => setPopoverCard(null)}
        onEdit={() => {
          if (!popoverCard) return;
          setPopoverCard(null);
          router.push({ pathname: '/card/[id]/edit' as any, params: { id: popoverCard.id, conversationId: popoverCard.conversation_id ?? '' } });
        }}
        onDelete={() => {
          setDeleteTarget(popoverCard);
          setPopoverCard(null);
        }}
      />

      <DeleteModal
        visible={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  navBack: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    fontFamily: 'Fraunces',
    fontSize: 17,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  toggleBtn: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 7,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.accent,
  },
  toggleLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.textMuted,
  },
  toggleLabelActive: {
    color: colors.background,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  cardItem: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 16,
    gap: 4,
  },
  cardItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTopic: {
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
  cardDue: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: colors.textMuted,
  },
  cardQuestion: {
    fontFamily: 'Fraunces-Light',
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 24,
    marginTop: 4,
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  loadingMore: {
    marginVertical: 20,
  },
  bottomCta: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  goldPill: {
    backgroundColor: colors.accent,
    borderRadius: 26,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldPillDisabled: {
    backgroundColor: colors.surface,
  },
  goldPillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.background,
  },
  goldPillTextDisabled: {
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
