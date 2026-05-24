import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';
import { insertMessage, updateConversationTitle } from '@/lib/db/conversations';
import { generateConversationTitle, streamChatResponse } from '@/lib/ai/chat';
import { useConversation, useMessages } from '@/hooks/useConversations';
import type { Message } from '@/lib/types';

const TOPIC_CHIPS: { label: string; prompt: string }[] = [
  { label: 'Roman Empire', prompt: 'Tell me about the rise of the Roman Empire' },
  { label: 'Stoic Philosophy', prompt: 'What is Stoic philosophy and how can I apply it?' },
  { label: "Kant's Ethics", prompt: "Explain Kant's categorical imperative in plain terms" },
  { label: 'Causes of WWI', prompt: 'What were the main causes of World War I?' },
  { label: 'Quantum Mechanics', prompt: 'What is quantum mechanics and why is it strange?' },
  { label: 'French Revolution', prompt: 'What caused the French Revolution?' },
];

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

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

type DisplayMessage = Message | { id: 'streaming'; role: 'assistant'; content: string; created_at: '' };

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [inputText, setInputText] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [optimisticUserMsg, setOptimisticUserMsg] = useState<Message | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const { data: conversation } = useConversation(id);
  const { data: messages = [] } = useMessages(id);

  const title = conversation?.title || 'New conversation';

  // Merge DB messages with the optimistic user message, deduplicating once DB confirms it
  const baseMessages = optimisticUserMsg
    ? messages.some((m) => m.role === 'user' && m.content === optimisticUserMsg.content)
      ? messages // DB has it — drop optimistic copy
      : [...messages, optimisticUserMsg].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )
    : messages;

  const displayMessages: DisplayMessage[] = [
    ...baseMessages,
    ...(isStreaming
      ? [{ id: 'streaming' as const, role: 'assistant' as const, content: streamingText, created_at: '' as const }]
      : []),
  ];

  const hasMessages = messages.length > 0 || isStreaming;

  useEffect(() => {
    if (hasMessages) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    setInputText('');
    setSendError(null);

    // Build history before async operations so streaming starts immediately
    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: text },
    ];

    // Show user bubble immediately via optimistic state
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      conversation_id: id,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setOptimisticUserMsg(optimistic);

    // Insert user message to DB; invalidate so query refetches and includes it
    insertMessage(id, 'user', text).then(() => {
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
    });

    // Generate title from first message
    if (messages.length === 0) {
      generateConversationTitle(text)
        .then((generatedTitle) => updateConversationTitle(id, generatedTitle))
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['conversation', id] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        })
        .catch(() => {});
    }

    setIsStreaming(true);
    setStreamingText('');

    streamChatResponse(
      history,
      (token) => {
        setStreamingText((prev) => prev + token);
        scrollRef.current?.scrollToEnd({ animated: false });
      },
      (fullText) => {
        insertMessage(id, 'assistant', fullText).then(() => {
          queryClient.invalidateQueries({ queryKey: ['messages', id] });
        });
        setOptimisticUserMsg(null);
        setStreamingText('');
        setIsStreaming(false);
      },
      (error) => {
        console.error('Stream error:', error);
        setSendError('Failed to get a response. Please try again.');
        setOptimisticUserMsg(null);
        setIsStreaming(false);
      },
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Nav Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navButton} hitSlop={8}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.navTitle} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.navRight}>
          <SymbolView name="square.stack" size={16} tintColor={colors.textMuted} />
          <Text style={styles.cardCount}>0</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 52}
      >
        {/* Message area */}
        {hasMessages ? (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {displayMessages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  msg.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                  ]}
                >
                  {msg.id === 'streaming' && streamingText === '' ? (
                    <TypingIndicator />
                  ) : (
                    <Text
                      style={[
                        styles.bubbleText,
                        msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant,
                      ]}
                    >
                      {msg.content}
                    </Text>
                  )}
                </View>
                {msg.created_at ? (
                  <Text
                    style={[
                      styles.timestamp,
                      msg.role === 'user' ? styles.timestampUser : styles.timestampAssistant,
                    ]}
                  >
                    {formatTime(msg.created_at)}
                  </Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
        ) : (
          /* Empty state */
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.emptyState}
            keyboardShouldPersistTaps="handled"
          >
            {/* Center content */}
            <View style={styles.emptyCenter}>
              <View style={styles.sparkleCircle}>
                <SymbolView name="sparkles" size={28} tintColor={colors.accent} />
              </View>
              <Text style={styles.emptyHeading}>Ask anything.</Text>
              <Text style={styles.emptySubtitle}>
                Start a conversation about any topic and begin learning.
              </Text>
            </View>

            {/* Topic chips */}
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

        {/* Error */}
        {sendError && (
          <Text style={styles.errorText}>{sendError}</Text>
        )}

        {/* Input Bar */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
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
              {inputText.trim() ? (
                <SymbolView name="arrow.up.circle.fill" size={28} tintColor={colors.accent} />
              ) : (
                <SymbolView name="mic" size={20} tintColor={colors.textMuted} />
              )}
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
  // Nav bar
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
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  navRight: {
    width: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  cardCount: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: colors.textMuted,
  },
  // Message list
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  messageRow: {
    maxWidth: '80%',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageRowAssistant: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: colors.accent,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 16,
  },
  bubbleText: {
    fontFamily: 'Inter',
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: colors.background,
  },
  bubbleTextAssistant: {
    color: colors.background,
  },
  timestamp: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  timestampUser: {
    alignSelf: 'flex-end',
  },
  timestampAssistant: {
    alignSelf: 'flex-start',
  },
  // Typing indicator
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
    backgroundColor: colors.background,
  },
  // Empty state
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
    fontFamily: 'PlayfairDisplay',
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
  // Input bar
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
    padding: 0,
    margin: 0,
  },
  inputIcon: {
    alignSelf: 'flex-end',
    marginBottom: 1,
  },
  // Error
  errorText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#E05252',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
});
