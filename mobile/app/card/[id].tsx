import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function CardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View>
      <Text>Card {id}</Text>
    </View>
  );
}
