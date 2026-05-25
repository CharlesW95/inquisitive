import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';
import { DEV_USER_ID } from '@/constants/dev';
import { createConversation, insertMessage, updateConversationTitle } from '@/lib/db/conversations';
import { generateConversationTitle, streamChatResponse } from '@/lib/ai/chat';
import { serifBodyMarkdownStyles } from '@/constants/typography';

const TOPIC_CHIPS: { label: string; prompt: string }[] = [
  { label: 'Roman Empire', prompt: 'Tell me about the rise of the Roman Empire' },
  { label: 'Stoic Philosophy', prompt: 'What is Stoic philosophy and how can I apply it?' },
  { label: "Kant's Ethics", prompt: "Explain Kant's categorical imperative in plain terms" },
  { label: 'Causes of WWI', prompt: 'What were the main causes of World War I?' },
  { label: 'Quantum Mechanics', prompt: 'What is quantum mechanics and why is it strange?' },
  { label: 'French Revolution', prompt: 'What caused the French Revolution?' },
];

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;
  const dots = [dot1, dot2, dot3];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay((dots.length - 1 - i) * 150),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.typingDots}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[styles.typingDot, { opacity: dot }]} />
      ))}
    </View>
  );
}

export default function NewConversationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sentUserText, setSentUserText] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    setInputText('');
    setSentUserText(text);

    const convo = await createConversation(DEV_USER_ID);
    const id = convo.id;
    setConversationId(id);

    const userMsg = await insertMessage(id, 'user', text);

    setIsStreaming(true);
    setStreamingText('');

    streamChatResponse(
      [{ role: 'user', content: text }],
      (token) => {
        setStreamingText((prev) => prev + token);
        scrollRef.current?.scrollToEnd({ animated: false });
      },
      async (fullText) => {
        const [assistantMsg, generatedTitle] = await Promise.all([
          insertMessage(id, 'assistant', fullText),
          generateConversationTitle(text),
        ]);
        await updateConversationTitle(id, generatedTitle);

        queryClient.setQueryData(['messages', id], [userMsg, assistantMsg]);
        queryClient.setQueryData(['conversation', id], {
          id,
          user_id: DEV_USER_ID,
          title: generatedTitle,
          created_at: convo.created_at,
          updated_at: new Date().toISOString(),
          card_count: 0,
        });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });

        router.replace(`/conversation/${id}`);
      },
      (error) => {
        console.error('Stream error:', error);
        setIsStreaming(false);
      },
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Close button */}
      <View style={styles.closeBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {sentUserText ? (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.messageRow, styles.messageRowUser]}>
              <View style={[styles.bubble, styles.bubbleUser]}>
                <Text style={[styles.bubbleText]}>{sentUserText}</Text>
              </View>
            </View>
            {isStreaming && (
              <View style={[styles.messageRow, styles.messageRowAssistant]}>
                <View style={styles.assistantProse}>
                  {streamingText === '' ? (
                    <TypingIndicator />
                  ) : (
                    <Markdown style={serifBodyMarkdownStyles}>{streamingText}</Markdown>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.emptyState}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.emptyCenter}>
              <View style={styles.sparkleCircle}>
                <SymbolView name="sparkles" size={28} tintColor={colors.accent} />
              </View>
              <Text style={styles.emptyHeading}>Ask anything.</Text>
              <Text style={styles.emptySubtitle}>
                Start a conversation about any topic and begin learning.
              </Text>
            </View>
            <View style={styles.chipsSection}>
              <Text style={styles.chipsLabel}>OR TRY ONE OF THESE</Text>
              <View style={styles.chipsRow}>
                {TOPIC_CHIPS.map((chip) => (
                  <TouchableOpacity
                    key={chip.label}
                    style={styles.chip}
                    onPress={() => {
                      setInputText(chip.prompt);
                      inputRef.current?.focus();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipText}>{chip.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        )}

        {/* Input Bar */}
        <View style={[styles.inputContainer, { paddingBottom: keyboardVisible ? 8 : insets.bottom + 8 }]}>
          <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="What are you curious about?"
              placeholderTextColor={colors.textMuted}
              multiline
              maxFontSizeMultiplier={1}
              onSubmitEditing={handleSend}
              editable={!isStreaming}
            />
            <TouchableOpacity
              onPress={inputText.trim() ? handleSend : undefined}
              hitSlop={8}
              style={styles.inputIcon}
            >
              <SymbolView
                name="arrow.up.circle.fill"
                size={28}
                tintColor={inputText.trim() ? colors.accent : colors.textMuted}
              />
            </TouchableOpacity>
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
  closeBar: {
    height: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontFamily: 'Inter',
    fontSize: 18,
    color: colors.textMuted,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  messageRow: {},
  messageRowUser: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    maxWidth: '80%',
  },
  messageRowAssistant: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
  },
  assistantProse: {
    width: '100%',
    paddingVertical: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surfaceInput,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  bubbleUser: {},
  bubbleText: {
    fontFamily: 'Inter',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.textMuted,
  },
  emptyState: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCenter: {
    alignItems: 'center',
    marginBottom: 40,
  },
  sparkleCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyHeading: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 28,
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  chipsSection: {
    alignItems: 'center',
    gap: 14,
  },
  chipsLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chipText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: colors.textPrimary,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceInput,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 96,
    lineHeight: 20,
    minHeight: 20,
    padding: 0,
    margin: 0,
  },
  inputIcon: {
    alignSelf: 'flex-end',
    marginBottom: 1,
  },
});
