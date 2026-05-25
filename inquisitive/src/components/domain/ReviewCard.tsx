import { Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { TopicTag } from '@/components/ui/TopicTag';
import { reviewCardQuestionMarkdownStyles } from '@/constants/typography';

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
          <Text
            className="font-sans text-text-muted uppercase"
            style={{ fontSize: 11, letterSpacing: 0.8 }}
          >
            {card.dueLabel}
          </Text>
          <View className="mt-2">
            <TopicTag label={card.topicTag} />
          </View>
          <View style={{ marginTop: 8, overflow: 'hidden', maxHeight: 60 }}>
            <Markdown style={reviewCardQuestionMarkdownStyles}>{card.prompt}</Markdown>
          </View>
        </View>
        <View className="bg-accent" style={{ width: 48, height: 2 }} />
      </View>
    </TouchableOpacity>
  );
}
