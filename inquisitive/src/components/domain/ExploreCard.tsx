import { Text, TouchableOpacity, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';

interface ExploreCardProps {
  card: {
    id: string;
    category: string;
    title: string;
    description: string;
  };
  width: number;
  onPress: () => void;
}

export function ExploreCard({ card, width, onPress }: ExploreCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="border border-border rounded-[10px] p-3"
      style={{ width, height: 140 }}
      activeOpacity={0.8}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className="font-sans text-accent uppercase flex-1 mr-2"
          style={{ fontSize: 11, letterSpacing: 0.8 }}
          numberOfLines={1}
        >
          {card.category}
        </Text>
        <SymbolView
          name="arrow.up.right"
          size={12}
          tintColor={colors.textMuted}
        />
      </View>
      <Text
        className="font-sans-bold text-text-primary mt-2"
        style={{ fontSize: 17 }}
        numberOfLines={2}
      >
        {card.title}
      </Text>
      <Text
        className="font-sans text-text-secondary mt-1"
        style={{ fontSize: 13 }}
        numberOfLines={2}
      >
        {card.description}
      </Text>
    </TouchableOpacity>
  );
}
