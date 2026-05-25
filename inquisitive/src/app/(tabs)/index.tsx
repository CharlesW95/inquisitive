import { ActivityIndicator, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { colors } from "@/constants/colors";
import { DEV_USER_ID } from "@/constants/dev";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ChatBar } from "@/components/ui/ChatBar";
import { ReviewCard } from "@/components/domain/ReviewCard";
import { ExploreCard } from "@/components/domain/ExploreCard";
import { ConversationRow } from "@/components/domain/ConversationRow";
import { useRecentConversations } from "@/hooks/useConversations";
import { useDueCards } from "@/hooks/useDueCards";

function formatDueLabel(due: string): string {
  const now = new Date();
  const dueDate = new Date(due);
  const diffDays = Math.round((dueDate.getTime() - now.getTime()) / 86_400_000);
  if (diffDays < 0) return 'OVERDUE';
  if (diffDays === 0) return 'DUE TODAY';
  return `DUE IN ${diffDays} DAY${diffDays === 1 ? '' : 'S'}`;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}M AGO`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}H AGO`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}D AGO`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  return arr.reduce((chunks, item, i) => {
    if (i % size === 0) chunks.push([item]);
    else chunks[chunks.length - 1].push(item);
    return chunks;
  }, [] as T[][]);
}

const EXPLORE_TOPICS = [
  {
    id: "1",
    category: "PHILOSOPHY",
    title: "Theories of Consciousness",
    description: "What is consciousness, and why does it exist?",
  },
  {
    id: "2",
    category: "HISTORY",
    title: "The Fall of the Roman Republic",
    description: "How did Rome transition from republic to empire?",
  },
  {
    id: "3",
    category: "SCIENCE",
    title: "The Nature of Time",
    description: "Is time real, and does it flow in one direction?",
  },
  {
    id: "4",
    category: "PHILOSOPHY",
    title: "Free Will and Determinism",
    description:
      "Do humans truly have free will, or is everything predetermined?",
  },
  {
    id: "5",
    category: "HISTORY",
    title: "The Silk Road",
    description: "How did trade routes shape the ancient world?",
  },
  {
    id: "6",
    category: "SCIENCE",
    title: "Evolution and Natural Selection",
    description: "How does life adapt and diversify over time?",
  },
];


export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const exploreCardWidth = (screenWidth - 20 * 2 - 12) / 2;
  const exploreRows = chunkArray(EXPLORE_TOPICS, 2);
  const { data: recentConversations, isLoading: conversationsLoading } = useRecentConversations();
  const { data: dueCards, isLoading: dueCardsLoading } = useDueCards(DEV_USER_ID);
  const reviewCards = (dueCards ?? []).slice(0, 5);

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top }}
    >
      {/* Top Nav Bar */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <Text
          className="font-sans text-text-muted uppercase"
          style={{ fontSize: 11, letterSpacing: 1.2 }}
        >
          INQUISITIVE
        </Text>
        <View className="flex-row items-center" style={{ gap: 16 }}>
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <SymbolView name="flame.fill" size={16} tintColor={colors.accent} />
            <Text
              className="font-sans text-text-primary"
              style={{ fontSize: 13 }}
            >
              12
            </Text>
          </View>
          <SymbolView name="gearshape" size={20} tintColor={colors.textMuted} />
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Section 1 — Greeting */}
        <View className="px-5 pt-4" style={{ marginBottom: 20 }}>
          <Text
            className="font-serif-bold text-text-primary"
            style={{ fontSize: 24 }}
          >
            {getGreeting()}, Charles.
          </Text>
          <Text
            className="font-sans text-text-secondary mt-2"
            style={{ fontSize: 15 }}
          >
            What are you curious about today?
          </Text>
        </View>

        {/* Section 2 — Review */}
        {(dueCardsLoading || reviewCards.length > 0) && (
          <View style={{ marginBottom: 40 }}>
            <View className="px-5 mb-4">
              <SectionHeader
                title="Review"
                subtitle="Engage with knowledge you've explored"
                ctaLabel="SEE ALL ›"
                onCtaPress={() => router.push("/review/explorer" as any)}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 20, paddingRight: 20, gap: 12 }}
            >
              {dueCardsLoading ? (
                <ActivityIndicator color={colors.textMuted} style={{ marginLeft: 8, marginTop: 60 }} />
              ) : (
                reviewCards.map((card) => (
                  <ReviewCard
                    key={card.id}
                    card={{
                      id: card.id,
                      modality: card.modality,
                      topicTag: card.conversationTitle?.toUpperCase() ?? 'CARD',
                      prompt: card.prompt,
                      dueLabel: formatDueLabel(card.schedule.due),
                    }}
                    onPress={() => router.push({ pathname: '/review/session' as any, params: { startCardId: card.id } })}
                  />
                ))
              )}
            </ScrollView>
          </View>
        )}

        {/* Section 3 — Explore */}
        <View className="px-5" style={{ marginBottom: 40 }}>
          <SectionHeader
            title="Explore"
            subtitle="Discover new knowledge by starting new threads"
          />
          <View className="mt-4" style={{ gap: 12 }}>
            {exploreRows.map((row, i) => (
              <View key={i} className="flex-row" style={{ gap: 12 }}>
                {row.map((topic) => (
                  <ExploreCard
                    key={topic.id}
                    card={topic}
                    width={exploreCardWidth}
                    onPress={() => { }}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Section 4 — Continue */}
        <View className="px-5" style={{ marginBottom: 40 }}>
          <SectionHeader
            title="Continue"
            subtitle="Deepen your exploration by continuing existing threads"
          />
          <View className="mt-4" style={{ gap: 4 }}>
            {conversationsLoading ? (
              <ActivityIndicator color={colors.textMuted} style={{ marginTop: 12 }} />
            ) : recentConversations && recentConversations.length > 0 ? (
              recentConversations.map((convo) => (
                <ConversationRow
                  key={convo.id}
                  conversation={{
                    id: convo.id,
                    title: convo.title || "Untitled",
                    timestamp: formatRelativeTime(convo.updated_at),
                    cardCount: convo.card_count ?? 0,
                  }}
                  onPress={() => router.push(`/conversation/${convo.id}`)}
                />
              ))
            ) : (
              <Text
                className="font-sans text-text-muted"
                style={{ fontSize: 14, marginTop: 12 }}
              >
                No conversations yet — start one below
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Chat Bar */}
      <View style={{ paddingBottom: insets.bottom + 8, paddingTop: 8 }}>
        <ChatBar onPress={() => router.push("/conversation/new")} />
      </View>
    </View>
  );
}
