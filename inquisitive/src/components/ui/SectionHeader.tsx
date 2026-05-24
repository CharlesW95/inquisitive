import { Text, TouchableOpacity, View } from 'react-native';

interface SectionHeaderProps {
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export function SectionHeader({ title, subtitle, ctaLabel, onCtaPress }: SectionHeaderProps) {
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text
          className="font-serif text-text-primary flex-1"
          style={{ fontSize: 28 }}
        >
          {title}
        </Text>
        {ctaLabel && onCtaPress && (
          <TouchableOpacity onPress={onCtaPress} className="ml-4">
            <Text
              className="font-sans text-accent uppercase"
              style={{ fontSize: 11, letterSpacing: 0.8 }}
            >
              {ctaLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <Text
        className="font-sans text-text-secondary mt-1"
        style={{ fontSize: 13 }}
      >
        {subtitle}
      </Text>
    </View>
  );
}
