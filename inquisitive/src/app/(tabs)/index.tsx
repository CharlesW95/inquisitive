import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ChatBar } from "@/components/ui/ChatBar";
import { ReviewCard } from "@/components/domain/ReviewCard";
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

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: recentConversations, isLoading: conversationsLoading } = useRecentConversations();
  const { data: dueCards, isLoading: dueCardsLoading } = useDueCards();
  const reviewCards = (dueCards ?? []).slice(0, 5);

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top }}
    >
      {/* Top Nav Bar */}
      <View className="flex-row items-center px-5 py-3">
        <Text
          className="font-sans text-text-muted uppercase"
          style={{ fontSize: 11, letterSpacing: 1.2 }}
        >
          INQUISITIVE
        </Text>
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

        {/* Section 3 — Continue */}
        <View className="px-5" style={{ marginBottom: 40 }}>
          <SectionHeader
            title="Continue"
            subtitle="Deepen your exploration by continuing existing threads"
            ctaLabel="SEE ALL ›"
            onCtaPress={() => router.push('/conversations' as any)}
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
