import { Text, TouchableOpacity, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';

interface ChatBarProps {
  onPress: () => void;
}

export function ChatBar({ onPress }: ChatBarProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="mx-4 bg-surface-input rounded-full flex-row items-center px-4"
      style={{ height: 52 }}
      activeOpacity={0.8}
    >
      <SymbolView name="paperclip" size={18} tintColor={colors.textMuted} />
      <Text
        className="flex-1 font-sans text-text-muted mx-3"
        style={{ fontSize: 15 }}
      >
        What are you curious about?
      </Text>
      <SymbolView name="mic" size={18} tintColor={colors.textMuted} />
    </TouchableOpacity>
  );
}
