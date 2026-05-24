import { Text } from 'react-native';

interface TopicTagProps {
  label: string;
}

export function TopicTag({ label }: TopicTagProps) {
  return (
    <Text
      className="font-sans-bold text-accent uppercase"
      style={{ fontSize: 11, letterSpacing: 0.8 }}
    >
      {label}
    </Text>
  );
}
