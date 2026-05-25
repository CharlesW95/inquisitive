import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { useCreateCard } from '@/hooks/useCards';
import { DEV_USER_ID } from '@/constants/dev';

const FRONT_MAX = 200;
const BACK_MAX = 500;
const FRONT_COUNTER_THRESHOLD = 160;
const BACK_COUNTER_THRESHOLD = 400;

export default function NewCardScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  const createCard = useCreateCard();
  const canSave = front.trim().length > 0 && back.trim().length > 0;

  async function handleSave() {
    if (!canSave) return;
    await createCard.mutateAsync({ userId: DEV_USER_ID, conversationId, front, back });
    router.back();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Nav Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navButton} hitSlop={8}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>New card</Text>
        <TouchableOpacity
          style={styles.navButton}
          onPress={handleSave}
          disabled={!canSave || createCard.isPending}
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
              <Text
                style={[
                  styles.counter,
                  front.length >= FRONT_MAX && styles.counterLimit,
                ]}
              >
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
              <Text
                style={[
                  styles.counter,
                  back.length >= BACK_MAX && styles.counterLimit,
                ]}
              >
                {back.length} / {BACK_MAX}
              </Text>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
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
});
