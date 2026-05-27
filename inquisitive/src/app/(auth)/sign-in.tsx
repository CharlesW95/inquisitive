import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.wordmarkContainer}>
        <Text style={styles.wordmark}>INQUISITIVE</Text>
        <Text style={styles.tagline}>Curiosity-driven learning</Text>
      </View>

      <TouchableOpacity
        style={styles.phoneButton}
        onPress={() => router.push('/(auth)/phone-entry' as any)}
        activeOpacity={0.8}
      >
        <Text style={styles.phoneButtonText}>Sign in with phone number</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  wordmarkContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: 3,
  },
  tagline: {
    fontFamily: 'Fraunces-Italic',
    fontSize: 17,
    color: colors.textSecondary,
    marginTop: 10,
  },
  phoneButton: {
    width: '100%',
    height: 52,
    backgroundColor: colors.accent,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.background,
  },
});
