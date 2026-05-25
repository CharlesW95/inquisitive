import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';
import { insertMessage, updateConversationTitle } from '@/lib/db/conversations';
import { generateConversationTitle, streamChatResponse, REFUSAL_TEXT } from '@/lib/ai/chat';
import { generateCardsForExchange } from '@/lib/ai/card-generation';
import { generateFollowUpSuggestions } from '@/lib/ai/suggestions';
import { getCardFrontsForConversation, insertCards } from '@/lib/db/cards';
import { useConversation, useDeleteConversation, useMessages } from '@/hooks/useConversations';
import { useCardCount } from '@/hooks/useCards';
import { DEV_USER_ID } from '@/constants/dev';
import { useToastStore } from '@/stores/toastStore';
import { KeepExploring } from '@/components/domain/KeepExploring';
import { serifBodyMarkdownStyles } from '@/constants/typography';
import { useSuggestionsStore } from '@/stores/suggestionsStore';
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

function DeleteConversationModal({
  visible,
  onCancel,
  onDeleteWithCards,
  onDeleteKeepCards,
}: {
  visible: boolean;
  onCancel: () => void;
  onDeleteWithCards: () => void;
  onDeleteKeepCards: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>Delete Conversation</Text>
          <Text style={styles.dialogSubtitle}>
            What would you like to do with the cards from this conversation?
          </Text>
          <View style={styles.dialogRule} />
          <TouchableOpacity style={styles.dialogBtn} onPress={onDeleteWithCards}>
            <Text style={styles.dialogBtnDestructive}>Delete Cards Too</Text>
          </TouchableOpacity>
          <View style={styles.dialogRule} />
          <TouchableOpacity style={styles.dialogBtn} onPress={onDeleteKeepCards}>
            <Text style={styles.dialogBtnPrimary}>Keep My Cards</Text>
          </TouchableOpacity>
          <View style={styles.dialogRule} />
          <TouchableOpacity style={styles.dialogBtn} onPress={onCancel}>
            <Text style={styles.dialogBtnCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  const [optimisticUserMsg, setOptimisticUserMsg] = useState<Message | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const menuBtnRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const { width: screenWidth } = useWindowDimensions();
  const showToast = useToastStore((s) => s.showToast);
  const deleteConversation = useDeleteConversation();
  const { suggestionsByConversation, setSuggestions: storeSuggestions, clearSuggestions } = useSuggestionsStore();
  const suggestions = suggestionsByConversation[id] ?? [];
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const { data: conversation, isLoading: convLoading } = useConversation(id);
  const { data: messages = [], isLoading: msgsLoading } = useMessages(id);
  const { data: cardCount = 0 } = useCardCount(id);
  const isInitialLoad = convLoading || msgsLoading;

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
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (hasMessages) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    setInputText('');
    clearSuggestions(id);
    setSuggestionsLoading(false);

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
        insertMessage(id, 'assistant', fullText).then(async (assistantMsg) => {
          queryClient.invalidateQueries({ queryKey: ['messages', id] });
          try {
            const existingFronts = await getCardFrontsForConversation(id);
            const drafts = await generateCardsForExchange(
              conversation?.title ?? '',
              text,
              fullText,
              existingFronts,
            );
            if (drafts.length > 0) {
              await insertCards(DEV_USER_ID, id, assistantMsg.id, drafts);
              queryClient.invalidateQueries({ queryKey: ['cardCount', id] });
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
            }
          } catch (e) {
            showToast('Card generation failed', 'error');
          }
        });
        setOptimisticUserMsg(null);
        setStreamingText('');
        setIsStreaming(false);
        if (fullText.trim() !== REFUSAL_TEXT) {
          setSuggestionsLoading(true);
          generateFollowUpSuggestions(text, fullText)
            .then((results) => storeSuggestions(id, results))
            .catch(() => {})
            .finally(() => setSuggestionsLoading(false));
        }
      },
      (error) => {
        console.error('Stream error:', error);
        showToast('Failed to get a response. Please try again.', 'error');
        setOptimisticUserMsg(null);
        setIsStreaming(false);
      },
    );
  }

  function handleMenuPress() {
    if (menuOpen) { setMenuOpen(false); return; }
    menuBtnRef.current?.measureInWindow((x, y, w, h) => {
      setMenuPos({ top: y + h + 4, right: screenWidth - (x + w) });
      setMenuOpen(true);
    });
  }

  async function executeDelete(deleteCards: boolean) {
    setShowDeleteModal(false);
    try {
      await deleteConversation.mutateAsync({ id, deleteCards });
      router.replace('/(tabs)/');
    } catch {
      showToast('Failed to delete conversation', 'error');
    }
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

        <View style={styles.navRightGroup}>
          <TouchableOpacity onPress={() => router.push({ pathname: '/conversation/[id]/cards', params: { id } })} style={styles.navCardsBtn} hitSlop={8}>
            <SymbolView name="square.stack" size={16} tintColor={colors.textMuted} />
            <Text style={styles.cardCount}>{cardCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity ref={menuBtnRef} onPress={handleMenuPress} hitSlop={8}>
            <SymbolView name="ellipsis" size={18} tintColor={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Message area */}
        {isInitialLoad ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.textMuted} size="large" />
          </View>
        ) : hasMessages ? (
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
                {msg.role === 'user' ? (
                  <View style={[styles.bubble, styles.bubbleUser]}>
                    <Text style={[styles.bubbleText, styles.bubbleTextUser]}>{msg.content}</Text>
                  </View>
                ) : (
                  <View style={styles.assistantProse}>
                    {msg.id === 'streaming' && streamingText === '' ? (
                      <TypingIndicator />
                    ) : (
                      <Markdown style={serifBodyMarkdownStyles}>{msg.content}</Markdown>
                    )}
                  </View>
                )}
                {msg.created_at && msg.role === 'user' ? (
                  <Text style={[styles.timestamp, styles.timestampUser]}>
                    {formatTime(msg.created_at)}
                  </Text>
                ) : null}
              </View>
            ))}
            {!isStreaming && (suggestions.length > 0 || suggestionsLoading) && (
              <View style={styles.keepExploringContainer}>
                <KeepExploring
                  suggestions={suggestions}
                  isLoading={suggestionsLoading}
                  onSelectSuggestion={(suggestionText) => {
                    setInputText(suggestionText);
                    inputRef.current?.focus();
                  }}
                />
              </View>
            )}
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

      {/* Ellipsis popover */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="none"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
        <View style={[styles.popover, { top: menuPos.top, right: menuPos.right }]}>
          <TouchableOpacity
            style={styles.popoverItem}
            onPress={() => { setMenuOpen(false); setShowDeleteModal(true); }}
          >
            <SymbolView name="trash" size={15} tintColor="#E05252" />
            <Text style={styles.popoverTextDestructive}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <DeleteConversationModal
        visible={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onDeleteWithCards={() => executeDelete(true)}
        onDeleteKeepCards={() => executeDelete(false)}
      />
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  navButton: {
    width: 32,
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
  navRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navCardsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardCount: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: colors.textMuted,
  },
  // Ellipsis popover
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
  popoverTextDestructive: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#E05252',
  },
  // Delete conversation modal
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
    overflow: 'hidden',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 8,
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
    lineHeight: 20,
    marginBottom: 16,
  },
  dialogRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dialogBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  dialogBtnDestructive: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#E05252',
  },
  dialogBtnPrimary: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  dialogBtnCancel: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.textMuted,
  },
  // Message list
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
  keepExploringContainer: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: colors.surfaceInput,
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
    color: colors.textPrimary,
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
  // Input bar
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
