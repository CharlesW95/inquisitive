import React, { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

type TORef = React.ElementRef<typeof TouchableOpacity>;
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';
import { useConversationCards, useDeleteCard } from '@/hooks/useCards';
import type { Card } from '@/lib/types';

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
          <Text style={styles.dialogTitle}>Are you sure?</Text>
          <Text style={styles.dialogSubtitle}>This action cannot be undone.</Text>
          <View style={styles.dialogRule} />
          <View style={styles.dialogButtons}>
            <TouchableOpacity style={styles.dialogBtn} onPress={onCancel}>
              <Text style={styles.dialogBtnCancel}>Cancel</Text>
            </TouchableOpacity>
            <View style={styles.dialogDivider} />
            <TouchableOpacity style={styles.dialogBtn} onPress={onConfirm}>
              <Text style={styles.dialogBtnConfirm}>Yes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CardMenuButton({ onPress }: { onPress: (ref: TORef) => void }) {
  const ref = useRef<TORef>(null);
  return (
    <TouchableOpacity ref={ref} onPress={() => ref.current && onPress(ref.current)} hitSlop={8}>
      <Text style={styles.menuDots}>···</Text>
    </TouchableOpacity>
  );
}

export default function CardsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const { data: cards = [] } = useConversationCards(id);
  const deleteCard = useDeleteCard();

  const [activeMenu, setActiveMenu] = useState<{
    card: Card;
    top: number;
    right: number;
  } | null>(null);
  const [pendingDeleteCard, setPendingDeleteCard] = useState<Card | null>(null);

  function handleMenuButtonPress(card: Card, button: TORef) {
    if (activeMenu?.card.id === card.id) {
      setActiveMenu(null);
      return;
    }
    button.measureInWindow((x: number, y: number, w: number, h: number) => {
      setActiveMenu({ card, top: y + h + 4, right: screenWidth - (x + w) });
    });
  }

  function handleConfirmDelete() {
    if (!pendingDeleteCard) return;
    deleteCard.mutate({ cardId: pendingDeleteCard.id, conversationId: id });
    setPendingDeleteCard(null);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Nav Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navButton} hitSlop={8}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{cards.length} Cards</Text>
        <View style={styles.navRight} />
      </View>

      {/* Body */}
      {cards.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <SymbolView name="square.stack" size={28} tintColor={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>No cards yet</Text>
          <Text style={styles.emptySubtitle}>
            As you have a conversation, cards will automatically be created here. You can also
            create your own cards.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.cardList}
          showsVerticalScrollIndicator={false}
        >
          {cards.map((card) => (
            <View key={card.id} style={styles.cardItem}>
              <View style={styles.cardTop}>
                <Text style={styles.cardFront}>{card.prompt}</Text>
                <CardMenuButton
                  onPress={(btn) => handleMenuButtonPress(card, btn)}
                />
              </View>
              <View style={styles.cardRule} />
              <Text style={styles.cardBack}>{card.answer}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* New card button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.newCardBtn}
          onPress={() => router.push({ pathname: '/card/new', params: { conversationId: id } })}
          activeOpacity={0.8}
        >
          <Text style={styles.newCardBtnText}>＋  New card</Text>
        </TouchableOpacity>
      </View>

      {/* Popover menu — rendered in a Modal so it floats above the scroll view */}
      <Modal
        visible={activeMenu !== null}
        transparent
        animationType="none"
        onRequestClose={() => setActiveMenu(null)}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveMenu(null)} />
        {activeMenu && (
          <View style={[styles.popover, { top: activeMenu.top, right: activeMenu.right }]}>
            <TouchableOpacity
              style={styles.popoverItem}
              onPress={() => {
                setActiveMenu(null);
                router.push({
                  pathname: '/card/[id]/edit',
                  params: { id: activeMenu.card.id, conversationId: id },
                });
              }}
            >
              <SymbolView name="pencil" size={15} tintColor={colors.textPrimary} />
              <Text style={styles.popoverText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.popoverItem}
              onPress={() => {
                const card = activeMenu.card;
                setActiveMenu(null);
                setPendingDeleteCard(card);
              }}
            >
              <SymbolView name="trash" size={15} tintColor={colors.textPrimary} />
              <Text style={styles.popoverText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>

      <DeleteModal
        visible={!!pendingDeleteCard}
        onCancel={() => setPendingDeleteCard(null)}
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
    gap: 8,
  },
  navButton: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    fontFamily: 'Fraunces-Bold',
    fontSize: 17,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  navRight: {
    width: 32,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  cardList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  cardItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardFront: {
    flex: 1,
    fontFamily: 'Fraunces-Bold',
    fontSize: 17,
    color: colors.textPrimary,
    paddingRight: 4,
  },
  menuDots: {
    fontFamily: 'Inter',
    fontSize: 18,
    color: colors.textMuted,
    lineHeight: 20,
  },
  popover: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 130,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  popoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  popoverText: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.textPrimary,
  },
  cardRule: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  cardBack: {
    fontFamily: 'Fraunces',
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  newCardBtn: {
    backgroundColor: colors.accent,
    borderRadius: 26,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCardBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.background,
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
