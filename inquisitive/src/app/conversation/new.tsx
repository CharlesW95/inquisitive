import { Text, View } from "react-native";

export default function NewConversationScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="font-sans text-text-primary" style={{ fontSize: 15 }}>
        New Conversation
      </Text>
    </View>
  );
}
