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
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';
import { createConversation, insertMessage, updateConversationTitle } from '@/lib/db/conversations';
import { generateConversationTitle, streamChatResponse, REFUSAL_TEXT } from '@/lib/ai/chat';
import { generateCardsForExchange } from '@/lib/ai/card-generation';
import { generateFollowUpSuggestions } from '@/lib/ai/suggestions';
import { getCardFrontsForConversation, insertCards } from '@/lib/db/cards';
import { useConversation, useDeleteConversation, useMessages } from '@/hooks/useConversations';
import { useCardCount } from '@/hooks/useCards';
import { useAuthStore } from '@/stores/authStore';
import { useAutoGenCardsStore } from '@/stores/autoGenCardsStore';
import { useToastStore } from '@/stores/toastStore';
import { useUnviewedCardsStore } from '@/stores/unviewedCardsStore';
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

// react-native-markdown-display re-parses and rebuilds its entire tree on every render.
// While the answer is streaming that's invisible (the text is actively growing), but once
// it's final any unrelated re-render — suggestions loading/storing, the spacer releasing —
// would re-run that rebuild on static content and flicker it. Memoizing on `content` keeps
// the finished answer mounted untouched until its text actually changes.
const AssistantMarkdown = React.memo(function AssistantMarkdown({ content }: { content: string }) {
  return <Markdown style={serifBodyMarkdownStyles}>{content}</Markdown>;
});

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

// When a new turn begins we scroll the user's question this far below the top of
// the viewport, leaving the rest of the screen as reserved space for the answer.
const PIN_OFFSET = 12;

// Show the jump-to-bottom button once the bottom of the content is more than this
// far below the viewport.
const SCROLL_BOTTOM_THRESHOLD = 80;

type ConversationViewProps = {
  // 'existing' opens a saved conversation (routeId required); 'draft' is the new-conversation
  // entry — no row exists until the first message is sent (lazy creation, no orphan rows).
  mode: 'existing' | 'draft';
  routeId?: string;
};

export function ConversationView({ mode, routeId }: ConversationViewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // The conversation's real id. In draft mode this is null until the first message creates the
  // row; from then on everything keys off `cid`. `id` is an empty-string-safe key for query
  // hooks / stores (an empty key keeps queries disabled and store lookups on their defaults).
  const [createdId, setCreatedId] = useState<string | null>(null);
  const cid = createdId ?? (mode === 'draft' ? null : routeId ?? null);
  const id = cid ?? '';
  const isDraft = mode === 'draft';

  const [inputText, setInputText] = useState('');
  // Driven by the TextInput's content size so the box grows with wrapped lines — also
  // when the text is set programmatically (e.g. from a Keep Exploring suggestion), which
  // doesn't auto-grow a multiline input on its own.
  const [inputHeight, setInputHeight] = useState(20);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [optimisticUserMsg, setOptimisticUserMsg] = useState<Message | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const menuBtnRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const { width: screenWidth } = useWindowDimensions();
  const showToast = useToastStore((s) => s.showToast);
  const userId = useAuthStore((s) => s.userId);
  const autoGenCards = useAutoGenCardsStore((s) => s.autoGenByConversation[id] !== false);
  const setAutoGenCards = useAutoGenCardsStore((s) => s.setAutoGen);
  const hasNewCards = useUnviewedCardsStore((s) => !!s.unviewedByConversation[id]);
  const markCardsUnviewed = useUnviewedCardsStore((s) => s.markUnviewed);
  const cardsIconColor = hasNewCards ? colors.textPrimary : colors.textMuted;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const deleteConversation = useDeleteConversation();
  const { suggestionsByConversation, setSuggestions: storeSuggestions, clearSuggestions } = useSuggestionsStore();
  const suggestions = suggestionsByConversation[id] ?? [];
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  // Whether the latest turn is rendered in the pinned wrapper (true from the first send
  // until unmount — each new send re-pins the latest turn and folds the prior one into
  // history) and whether we're still reserving a screenful below it to keep it pinned.
  const [turnActive, setTurnActive] = useState(false);
  const [reserveSpace, setReserveSpace] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  // Height of the visible scroll area and of the current (user + streaming answer)
  // turn. The trailing spacer (viewportH - turnH) keeps the user's question pinned
  // to the top so the answer streams into pre-allocated space without scroll jumps.
  const [viewportH, setViewportH] = useState(0);
  const [turnH, setTurnH] = useState(0);
  // Set when a new turn starts so the next layout pass pins the question to the top once.
  const pendingPinRef = useRef(false);
  // Latest scroll geometry, used to decide whether we're at the bottom.
  const scrollMetrics = useRef({ offsetY: 0, viewportH: 0 });
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollBtnOpacity = useRef(new Animated.Value(0)).current;
  const scrollBtnScale = useRef(new Animated.Value(1)).current;
  // Auto-scroll to the latest message only on first entry, never after the user has
  // started sending — past that point the scroll position is the user's to control.
  const didInitialScrollRef = useRef(false);
  const hasSentRef = useRef(false);

  const { data: conversation, isLoading: convLoading } = useConversation(id);
  const { data: messages = [], isLoading: msgsLoading } = useMessages(id);
  const { data: cardCount = 0 } = useCardCount(id);
  // A draft with no row yet has nothing to load; only show the loader for a saved conversation.
  const isInitialLoad = !!cid && (convLoading || msgsLoading);

  const title = conversation?.title || 'New conversation';

  // Merge DB messages with the optimistic user message, deduplicating once DB confirms it
  const baseMessages = optimisticUserMsg
    ? messages.some((m) => m.role === 'user' && m.content === optimisticUserMsg.content)
      ? messages // DB has it — drop optimistic copy
      : [...messages, optimisticUserMsg].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
    : messages;

  // The "active turn" — the latest question plus its answer — stays in one measured wrapper
  // from the moment it's sent until the next send. Keeping it mounted past the end of
  // streaming (rather than collapsing it back into the history immediately) is what makes the
  // streaming → "Keep Exploring" handoff seamless: the answer never blanks out waiting for the
  // DB round-trip, and the suggestions load into the same reserved space below it.
  let currentUserMsg: Message | null = null;
  let historicalMessages = baseMessages;
  if (turnActive && baseMessages.length > 0) {
    const last = baseMessages[baseMessages.length - 1];
    if (last.role === 'assistant') {
      // The answer's DB row has landed; the turn's question is the row before it. We still
      // render the answer from in-memory text below, so slice both out of the history.
      currentUserMsg = baseMessages[baseMessages.length - 2] ?? null;
      historicalMessages = baseMessages.slice(0, currentUserMsg ? -2 : -1);
    } else {
      // Still streaming, or the answer hasn't been persisted yet — the question is last.
      currentUserMsg = last;
      historicalMessages = baseMessages.slice(0, -1);
    }
  }
  // The answer shown in the active turn: live tokens while streaming, the completed text
  // afterwards. We hold onto it past stream end (rather than clearing it) so the turn never
  // momentarily renders an empty answer before the persisted message arrives.
  const streamingMsg: DisplayMessage = {
    id: 'streaming',
    role: 'assistant',
    content: streamingText,
    created_at: '',
  };
  // Reserve a screenful below the active turn so the question pins to the top. As the answer
  // — and then the suggestions — grow, the spacer shrinks by the same amount (content size
  // stays constant → no scroll jump). We keep reserving until the suggestions have settled,
  // then release back to natural flow.
  const spacerHeight = reserveSpace ? Math.max(0, viewportH - turnH) : 0;

  const recomputeScrollButton = (contentH: number) => {
    const { offsetY, viewportH: vh } = scrollMetrics.current;
    setShowScrollButton(contentH - (offsetY + vh) > SCROLL_BOTTOM_THRESHOLD);
  };

  const hasMessages = baseMessages.length > 0 || isStreaming;

  const renderRow = (msg: DisplayMessage) => (
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
            <AssistantMarkdown content={msg.content} />
          )}
        </View>
      )}
      {msg.created_at && msg.role === 'user' ? (
        <Text style={[styles.timestamp, styles.timestampUser]}>
          {formatTime(msg.created_at)}
        </Text>
      ) : null}
    </View>
  );

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Draft mode opens straight to the input — focus it so the keyboard is ready.
  useEffect(() => {
    if (!isDraft) return;
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [isDraft]);

  useEffect(() => {
    Animated.timing(scrollBtnOpacity, {
      toValue: showScrollButton ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [showScrollButton]);

  useEffect(() => {
    // Land at the latest message when first opening a conversation with history. After
    // the user starts sending, the pin/spacer logic and manual scrolling take over.
    if (messages.length > 0 && !didInitialScrollRef.current && !hasSentRef.current) {
      didInitialScrollRef.current = true;
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [messages.length]);

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    setInputText('');
    setInputHeight(20);

    // Lazily create the conversation row on the first message of a draft, then key everything
    // off the real id. Backing out before this point leaves no row behind.
    let activeId = cid;
    const isFirstMessage = !activeId || messages.length === 0;
    if (!activeId) {
      try {
        const convo = await createConversation(userId!);
        activeId = convo.id;
        setCreatedId(activeId);
        queryClient.setQueryData(['conversation', activeId], { ...convo, card_count: 0 });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      } catch {
        showToast('Failed to start conversation. Please try again.', 'error');
        setInputText(text);
        return;
      }
    }

    clearSuggestions(activeId);
    setSuggestionsLoading(false);

    // Build history before async operations so streaming starts immediately
    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: text },
    ];

    // Show user bubble immediately via optimistic state
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      conversation_id: activeId,
      user_id: userId!,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setOptimisticUserMsg(optimistic);

    // Insert user message to DB; invalidate so query refetches and includes it
    insertMessage(activeId, 'user', text).then(() => {
      queryClient.invalidateQueries({ queryKey: ['messages', activeId] });
    });

    // Generate title from first message
    if (isFirstMessage) {
      generateConversationTitle(text)
        .then((generatedTitle) => updateConversationTitle(activeId!, generatedTitle))
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['conversation', activeId] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        })
        .catch(() => { });
    }

    setTurnH(0);
    pendingPinRef.current = true;
    hasSentRef.current = true;
    setTurnActive(true);
    setReserveSpace(true);
    setIsStreaming(true);
    setStreamingText('');

    streamChatResponse(
      history,
      (token) => {
        // No per-token scrolling: text streams into the space reserved by the spacer.
        setStreamingText((prev) => prev + token);
      },
      (fullText) => {
        insertMessage(activeId!, 'assistant', fullText).then(async (assistantMsg) => {
          queryClient.invalidateQueries({ queryKey: ['messages', activeId] });
          if (!autoGenCards) return;
          try {
            const existingFronts = await getCardFrontsForConversation(activeId!);
            const drafts = await generateCardsForExchange(
              conversation?.title ?? '',
              text,
              fullText,
              existingFronts,
            );
            if (drafts.length > 0) {
              await insertCards(userId!, activeId!, assistantMsg.id, drafts);
              queryClient.invalidateQueries({ queryKey: ['cardCount', activeId] });
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
              markCardsUnviewed(activeId!);
              runPulse();
            }
          } catch (e) {
            showToast('Card generation failed', 'error');
          }
        });
        setIsStreaming(false);
        // Deliberately keep the streamed answer and the question's optimistic row mounted —
        // clearing them here is what used to blank the answer until the persisted message
        // arrived. The turn stays pinned (reserveSpace) while suggestions load, then releases
        // back to natural flow once they've settled.
        if (fullText.trim() !== REFUSAL_TEXT) {
          setSuggestionsLoading(true);
          generateFollowUpSuggestions(text, fullText)
            .then((results) => storeSuggestions(activeId!, results))
            .catch(() => { })
            .finally(() => {
              setSuggestionsLoading(false);
              setReserveSpace(false);
            });
        } else {
          setReserveSpace(false);
        }
      },
      (error) => {
        console.error('Stream error:', error);
        showToast('Failed to get a response. Please try again.', 'error');
        setOptimisticUserMsg(null);
        setStreamingText('');
        setIsStreaming(false);
        setTurnActive(false);
        setReserveSpace(false);
      },
    );
  }

  function runPulse() {
    pulseScale.setValue(1);
    Animated.sequence([
      Animated.timing(pulseScale, { toValue: 1.3, duration: 180, useNativeDriver: true }),
      Animated.timing(pulseScale, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
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
    if (!cid) return;
    try {
      await deleteConversation.mutateAsync({ id: cid, deleteCards });
      router.replace('/(tabs)/' as any);
    } catch {
      showToast('Failed to delete conversation', 'error');
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Nav Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navButton} hitSlop={8}>
          {isDraft ? (
            <SymbolView name="xmark" size={18} tintColor={colors.textPrimary} />
          ) : (
            <SymbolView name="chevron.left" size={20} tintColor={colors.textPrimary} />
          )}
        </TouchableOpacity>

        {cid ? (
          <Text style={styles.navTitle} numberOfLines={1}>
            {title}
          </Text>
        ) : (
          <View style={styles.navTitle} />
        )}

        {cid ? (
          <View style={styles.navRightGroup}>
            <TouchableOpacity onPress={() => router.push({ pathname: '/conversation/[id]/cards', params: { id: cid } })} style={styles.navCardsBtn} hitSlop={8}>
              <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
                <SymbolView name="square.stack.3d.up.fill" size={16} tintColor={cardsIconColor} />
              </Animated.View>
              <Text style={[styles.cardCount, { color: cardsIconColor }]}>{cardCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity ref={menuBtnRef} onPress={handleMenuPress} hitSlop={8}>
              <SymbolView name="ellipsis" size={18} tintColor={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.navButton} />
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Message area */}
        <View style={styles.messageArea}>
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
            scrollEventThrottle={16}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              setViewportH(h);
              scrollMetrics.current.viewportH = h;
            }}
            onScroll={(e) => {
              const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
              scrollMetrics.current = { offsetY: contentOffset.y, viewportH: layoutMeasurement.height };
              recomputeScrollButton(contentSize.height);
            }}
            onContentSizeChange={(_w, h) => recomputeScrollButton(h)}
          >
            {historicalMessages.map(renderRow)}
            {turnActive && (
              <View
                key="active-turn"
                style={styles.currentTurn}
                onLayout={(e) => {
                  const { y, height } = e.nativeEvent.layout;
                  setTurnH(height);
                  if (pendingPinRef.current) {
                    pendingPinRef.current = false;
                    scrollRef.current?.scrollTo({ y: Math.max(0, y - PIN_OFFSET), animated: true });
                  }
                }}
              >
                {currentUserMsg && renderRow(currentUserMsg)}
                {renderRow(streamingMsg)}
                {/* Rendered inside the measured turn so its height is folded into turnH —
                    the spacer shrinks to absorb it and the scroll position holds steady. */}
                {(suggestions.length > 0 || suggestionsLoading) && (
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
              </View>
            )}
            {reserveSpace && <View style={{ height: spacerHeight }} />}
            {/* Persisted suggestions from a previous session, shown when reopening a
                conversation before any new turn is sent. */}
            {!turnActive && (suggestions.length > 0 || suggestionsLoading) && (
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
          <Animated.View
            style={[styles.scrollDownWrap, { opacity: scrollBtnOpacity }]}
            pointerEvents={showScrollButton ? 'box-none' : 'none'}
          >
            <Animated.View style={{ transform: [{ scale: scrollBtnScale }] }}>
              <Pressable
                style={styles.scrollDownBtn}
                onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
                onPressIn={() =>
                  Animated.spring(scrollBtnScale, {
                    toValue: 0.85,
                    useNativeDriver: true,
                    bounciness: 0,
                    speed: 40,
                  }).start()
                }
                onPressOut={() =>
                  Animated.spring(scrollBtnScale, {
                    toValue: 1,
                    useNativeDriver: true,
                    bounciness: 6,
                    speed: 30,
                  }).start()
                }
                hitSlop={8}
              >
                <SymbolView name="chevron.down" size={18} tintColor={colors.textPrimary} />
              </Pressable>
            </Animated.View>
          </Animated.View>
        </View>

        {/* Input Bar */}
        <View style={[styles.inputContainer, { paddingBottom: keyboardVisible ? 8 : insets.bottom + 8 }]}>
          <View style={styles.inputBar}>
            <View style={styles.inputWrap}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { height: inputHeight }]}
                value={inputText}
                onChangeText={setInputText}
                placeholder="What are you curious about?"
                placeholderTextColor={colors.textMuted}
                multiline
                maxFontSizeMultiplier={1}
                scrollEnabled={inputHeight >= 96}
                onSubmitEditing={handleSend}
                editable={!isStreaming}
              />
              {/* Invisible mirror: always lays out, so it reports the wrapped text height
                  for both typed and programmatically-set text (Keep Exploring suggestions),
                  which a multiline TextInput does not do on its own. */}
              <Text
                style={[styles.input, styles.inputMeasure]}
                maxFontSizeMultiplier={1}
                onLayout={(e) =>
                  setInputHeight(Math.min(96, Math.max(20, Math.ceil(e.nativeEvent.layout.height))))
                }
              >
                {inputText.length ? inputText : ' '}
              </Text>
            </View>
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
            onPress={() => setAutoGenCards(id, !autoGenCards)}
          >
            <SymbolView name="sparkles" size={15} tintColor={colors.textPrimary} />
            <Text style={[styles.popoverText, styles.popoverTextFlex]}>Auto-create cards</Text>
            {autoGenCards && (
              <SymbolView name="checkmark" size={14} tintColor={colors.accent} />
            )}
          </TouchableOpacity>
          <View style={styles.popoverDivider} />
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
    minWidth: 220,
    overflow: 'hidden',
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
  popoverTextFlex: {
    flex: 1,
  },
  popoverTextDestructive: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#E05252',
  },
  popoverDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
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
  messageArea: {
    flex: 1,
  },
  currentTurn: {
    gap: 12,
  },
  scrollDownWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: 'center',
  },
  scrollDownBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
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
  inputWrap: {
    flex: 1,
  },
  input: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 20,
    padding: 0,
    margin: 0,
  },
  inputMeasure: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    opacity: 0,
    zIndex: -1,
  },
  inputIcon: {
    alignSelf: 'flex-end',
    marginBottom: 1,
  },
});
