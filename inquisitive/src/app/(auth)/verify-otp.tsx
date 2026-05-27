import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';
import { supabase } from '@/lib/db/client';
import { getProfile } from '@/lib/db/profiles';
import { useToastStore } from '@/stores/toastStore';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const showToast = useToastStore((s) => s.showToast);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerify() {
    if (code.length < 6 || loading) return;
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });
    setLoading(false);
    if (error) {
      showToast('Invalid or expired code', 'error');
      setCode('');
      return;
    }
    const userId = data.session?.user?.id;
    if (userId) {
      const profile = await getProfile(userId);
      if (!profile?.first_name) {
        router.replace('/(auth)/welcome' as any);
      } else {
        router.replace('/(tabs)/' as any);
      }
    } else {
      router.replace('/(tabs)/' as any);
    }
  }

  async function handleResend() {
    if (resending) return;
    setResending(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true },
    });
    setResending(false);
    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('Code resent', 'info');
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBack} hitSlop={8}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.heading}>Check your messages</Text>
        <Text style={styles.subtext}>
          We sent a 6-digit code to{'\n'}{phone}
        </Text>

        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          maxFontSizeMultiplier={1}
          textAlign="center"
          onSubmitEditing={handleVerify}
        />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.button, (code.length < 6 || loading) && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={code.length < 6 || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.buttonText, code.length < 6 && styles.buttonTextDisabled]}>
              Verify
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendLink} onPress={handleResend} disabled={resending}>
          <Text style={styles.resendText}>
            {resending ? 'Sending...' : 'Resend code'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navBar: {
    height: 52,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  navBack: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  heading: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  subtext: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 48,
    alignSelf: 'flex-start',
  },
  codeInput: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 36,
    color: colors.textPrimary,
    letterSpacing: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    width: '100%',
    paddingVertical: 12,
    padding: 0,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 16,
    alignItems: 'center',
  },
  button: {
    width: '100%',
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
  resendLink: {
    paddingVertical: 8,
  },
  resendText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.textMuted,
  },
});
