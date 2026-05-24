import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View>
      <Text>Conversation {id}</Text>
    </View>
  );
}
