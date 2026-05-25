import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';
import { useConversationCards, useDeleteCard, useUpdateCard } from '@/hooks/useCards';

const FRONT_MAX = 200;
const BACK_MAX = 500;
const FRONT_COUNTER_THRESHOLD = 160;
const BACK_COUNTER_THRESHOLD = 400;

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

export default function EditCardScreen() {
  const { id: cardId, conversationId } = useLocalSearchParams<{
    id: string;
    conversationId: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: cards = [] } = useConversationCards(conversationId);
  const card = cards.find((c) => c.id === cardId);

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (card) {
      setFront(card.prompt);
      setBack(card.answer);
    }
  }, [card?.id]);

  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();

  const canSave = front.trim().length > 0 && back.trim().length > 0;

  async function handleSave() {
    if (!canSave || !card) return;
    await updateCard.mutateAsync({ cardId, conversationId, front, back });
    router.back();
  }

  async function handleConfirmDelete() {
    if (!card) return;
    setShowDelete(false);
    await deleteCard.mutateAsync({ cardId, conversationId });
    router.back();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Nav Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navButton} hitSlop={8}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Edit card</Text>
        <TouchableOpacity
          style={styles.navButton}
          onPress={handleSave}
          disabled={!canSave || updateCard.isPending}
          hitSlop={8}
        >
          <Text style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}>✓ Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 52}
      >
        <View style={styles.body}>
          {/* Question section */}
          <View style={styles.section}>
            <Text style={styles.labelAccent}>QUESTION</Text>
            <TextInput
              style={styles.inputFront}
              value={front}
              onChangeText={(t) => setFront(t.slice(0, FRONT_MAX))}
              placeholder="What's the question on the front of the card?"
              placeholderTextColor={colors.textMuted}
              multiline
              maxFontSizeMultiplier={1}
            />
            {front.length >= FRONT_COUNTER_THRESHOLD && (
              <Text style={[styles.counter, front.length >= FRONT_MAX && styles.counterLimit]}>
                {front.length} / {FRONT_MAX}
              </Text>
            )}
          </View>
          <View style={styles.rule} />

          {/* Answer section */}
          <View style={styles.section}>
            <Text style={styles.labelMuted}>ANSWER</Text>
            <TextInput
              style={styles.inputBack}
              value={back}
              onChangeText={(t) => setBack(t.slice(0, BACK_MAX))}
              placeholder="What's the answer or explanation?"
              placeholderTextColor={colors.textMuted}
              multiline
              maxFontSizeMultiplier={1}
            />
            {back.length >= BACK_COUNTER_THRESHOLD && (
              <Text style={[styles.counter, back.length >= BACK_MAX && styles.counterLimit]}>
                {back.length} / {BACK_MAX}
              </Text>
            )}
          </View>

          {/* Delete link */}
          <TouchableOpacity
            style={styles.deleteLink}
            onPress={() => setShowDelete(true)}
          >
            <SymbolView name="trash" size={15} tintColor={colors.textSecondary} />
            <Text style={styles.deleteLinkText}>Delete this card</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <DeleteModal
        visible={showDelete}
        onCancel={() => setShowDelete(false)}
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
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  saveBtn: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.accent,
  },
  saveBtnDisabled: {
    color: colors.textMuted,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    paddingVertical: 8,
  },
  labelAccent: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  labelMuted: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  inputFront: {
    fontFamily: 'Fraunces',
    fontSize: 20,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  inputBack: {
    fontFamily: 'Fraunces',
    fontSize: 17,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  counter: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: 'right',
  },
  counterLimit: {
    color: '#E05252',
  },
  rule: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  deleteLink: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteLinkText: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.textSecondary,
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
