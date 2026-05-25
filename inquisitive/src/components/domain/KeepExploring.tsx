import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';

interface KeepExploringProps {
  suggestions: string[];
  isLoading: boolean;
  onSelectSuggestion: (text: string) => void;
}

function ShimmerRow() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(opacity);
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.row}>
      <Animated.View style={[animStyle, styles.shimmerNumber]} />
      <Animated.View style={[animStyle, styles.shimmerText]} />
    </View>
  );
}

function SuggestionRow({
  index,
  text,
  onPress,
  isLast,
}: {
  index: number;
  text: string;
  onPress: () => void;
  isLast: boolean;
}) {
  return (
    <>
      <Pressable onPress={onPress} style={styles.row}>
        {({ pressed }) => (
          <>
            <Text style={styles.number}>0{index + 1}</Text>
            <Text style={styles.questionText}>{text}</Text>
            <SymbolView
              name="arrow.up.right"
              size={14}
              tintColor={pressed ? colors.accent : colors.textMuted}
              style={styles.arrow}
            />
          </>
        )}
      </Pressable>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

export function KeepExploring({ suggestions, isLoading, onSelectSuggestion }: KeepExploringProps) {
  if (!isLoading && suggestions.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLine} />
        <Text style={styles.headerLabel}>KEEP EXPLORING</Text>
      </View>

      {/* Rows */}
      {isLoading
        ? [0, 1, 2].map((i) => <ShimmerRow key={i} />)
        : suggestions.map((s, i) => (
          <SuggestionRow
            key={i}
            index={i}
            text={s}
            onPress={() => onSelectSuggestion(s)}
            isLast={i === suggestions.length - 1}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerLine: {
    width: 32,
    height: 1,
    backgroundColor: colors.textMuted,
  },
  headerLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 18,
    gap: 16,
  },
  number: {
    fontFamily: 'Inter',
    fontSize: 13,
    lineHeight: 26,
    color: colors.textSecondary,
    width: 24,
  },
  questionText: {
    fontFamily: 'Fraunces',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    flex: 1,
  },
  arrow: {
    marginTop: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  shimmerNumber: {
    width: 20,
    height: 13,
    borderRadius: 4,
    backgroundColor: colors.surface,
    marginTop: 6,
  },
  shimmerText: {
    flex: 1,
    height: 18,
    borderRadius: 6,
    backgroundColor: colors.surface,
    marginTop: 4,
  },
});
