import { Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { TopicTag } from '@/components/ui/TopicTag';

const MODALITY_LABELS: Record<string, string> = {
  flashcard: 'FLASHCARD',
  multiple_choice: 'QUIZ',
  active: 'ACTIVE RECALL',
  teach_me: 'TEACH ME',
};

interface ReviewCardProps {
  card: {
    id: string;
    modality: string;
    topicTag: string;
    prompt: string;
    dueLabel: string;
  };
  onPress: () => void;
}

export function ReviewCard({ card, onPress }: ReviewCardProps) {
  const { width } = useWindowDimensions();
  const cardWidth = width * 0.72;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-surface rounded-[10px] overflow-hidden"
      style={{ width: cardWidth, height: 160 }}
      activeOpacity={0.8}
    >
      <View className="flex-1 p-4 justify-between">
        <View>
          <View className="flex-row justify-between">
            <Text
              className="font-sans text-text-muted uppercase"
              style={{ fontSize: 11, letterSpacing: 0.8 }}
            >
              {MODALITY_LABELS[card.modality] ?? card.modality.toUpperCase()}
            </Text>
            <Text
              className="font-sans text-text-muted uppercase"
              style={{ fontSize: 11, letterSpacing: 0.8 }}
            >
              {card.dueLabel}
            </Text>
          </View>
          <View className="mt-1">
            <TopicTag label={card.topicTag} />
          </View>
          <Text
            className="font-serif-bold text-text-primary mt-2"
            style={{ fontSize: 17 }}
            numberOfLines={3}
          >
            {card.prompt}
          </Text>
        </View>
        <View className="bg-accent" style={{ width: 48, height: 2 }} />
      </View>
    </TouchableOpacity>
  );
}
