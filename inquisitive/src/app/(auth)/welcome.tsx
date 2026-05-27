import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { upsertProfile } from '@/lib/db/profiles';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.userId);
  const showToast = useToastStore((s) => s.showToast);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGetStarted() {
    const trimmed = name.trim();
    if (!trimmed || !userId) return;
    setLoading(true);
    try {
      await upsertProfile(userId, { first_name: trimmed });
      router.replace('/(tabs)/' as any);
    } catch {
      showToast('Failed to save your name. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.body}>
          <Text style={styles.heading}>Welcome to{'\n'}Inquisitive</Text>
          <Text style={styles.subtext}>What should we call you?</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="First name"
            placeholderTextColor={colors.textMuted}
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleGetStarted}
            maxFontSizeMultiplier={1}
          />
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity
            style={[styles.button, (!name.trim() || loading) && styles.buttonDisabled]}
            onPress={handleGetStarted}
            disabled={!name.trim() || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.buttonText, (!name.trim()) && styles.buttonTextDisabled]}>
                Get started
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  heading: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 28,
    color: colors.textPrimary,
    lineHeight: 36,
    marginBottom: 10,
  },
  subtext: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  input: {
    fontFamily: 'Fraunces',
    fontSize: 22,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 12,
    padding: 0,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  button: {
    height: 52,
    backgroundColor: colors.accent,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.surface,
  },
  buttonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.background,
  },
  buttonTextDisabled: {
    color: colors.textMuted,
  },
});
