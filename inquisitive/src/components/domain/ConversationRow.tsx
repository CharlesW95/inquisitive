import { Text, TouchableOpacity, View } from 'react-native';

interface ConversationRowProps {
  conversation: {
    id: string;
    title: string;
    timestamp: string;
    cardCount: number;
  };
  onPress: () => void;
}

export function ConversationRow({ conversation, onPress }: ConversationRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-start py-3"
      activeOpacity={0.7}
    >
      <View className="flex-1 mr-4">
        <Text
          className="font-sans-semibold text-text-primary"
          style={{ fontSize: 17 }}
        >
          {conversation.title}
        </Text>
      </View>
      <View className="items-end">
        <Text
          className="font-sans text-text-muted uppercase"
          style={{ fontSize: 11, letterSpacing: 0.8 }}
        >
          {conversation.timestamp}
        </Text>
        <Text
          className="font-sans text-text-muted uppercase mt-0.5"
          style={{ fontSize: 11, letterSpacing: 0.8 }}
        >
          {conversation.cardCount} CARDS
        </Text>
      </View>
    </TouchableOpacity>
  );
}
