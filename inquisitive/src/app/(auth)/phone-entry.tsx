import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLocales } from 'expo-localization';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';
import { COUNTRY_CODES, DEFAULT_COUNTRY, type CountryCode } from '@/constants/countryCodes';
import { supabase } from '@/lib/db/client';
import { useToastStore } from '@/stores/toastStore';

export default function PhoneEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.showToast);

  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  useEffect(() => {
    const locales = getLocales();
    const regionCode = locales[0]?.regionCode;
    if (regionCode) {
      const found = COUNTRY_CODES.find((c) => c.isoCode === regionCode);
      if (found) setSelectedCountry(found);
    }
  }, []);

  const filteredCountries = useMemo(() => {
    const q = countrySearch.toLowerCase().trim();
    if (!q) return COUNTRY_CODES;
    return COUNTRY_CODES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q),
    );
  }, [countrySearch]);

  async function handleSendCode() {
    if (!phoneNumber.trim() || loading) return;
    const fullNumber = `${selectedCountry.dialCode}${phoneNumber.trim()}`;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: fullNumber,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    router.push(`/(auth)/verify-otp?phone=${encodeURIComponent(fullNumber)}` as any);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBack} hitSlop={8}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.body}>
          <Text style={styles.heading}>Enter your phone number</Text>

          <View style={styles.inputRow}>
            {/* Country code selector */}
            <TouchableOpacity
              style={styles.countrySelector}
              onPress={() => setShowCountryPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.countrySelectorText}>
                {selectedCountry.flag} {selectedCountry.dialCode}
              </Text>
            </TouchableOpacity>

            {/* Phone number */}
            <TextInput
              style={styles.phoneInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Phone number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSendCode}
              maxFontSizeMultiplier={1}
            />
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity
            style={[styles.button, (!phoneNumber.trim() || loading) && styles.buttonDisabled]}
            onPress={handleSendCode}
            disabled={!phoneNumber.trim() || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.buttonText, !phoneNumber.trim() && styles.buttonTextDisabled]}>
                Send code
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Country picker modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={[styles.pickerContainer, { paddingTop: insets.top }]}>
          <View style={styles.pickerNav}>
            <TouchableOpacity onPress={() => { setShowCountryPicker(false); setCountrySearch(''); }} hitSlop={8}>
              <SymbolView name="xmark" size={18} tintColor={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>Select Country</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.pickerSearch}>
            <TextInput
              style={styles.pickerSearchInput}
              value={countrySearch}
              onChangeText={setCountrySearch}
              placeholder="Search countries..."
              placeholderTextColor={colors.textMuted}
              autoFocus
              maxFontSizeMultiplier={1}
            />
          </View>
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.isoCode}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.countryItem}
                onPress={() => {
                  setSelectedCountry(item);
                  setShowCountryPicker(false);
                  setCountrySearch('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.countryFlag}>{item.flag}</Text>
                <Text style={styles.countryName}>{item.name}</Text>
                <Text style={styles.countryDial}>{item.dialCode}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Modal>
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
  },
  heading: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: 32,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  countrySelector: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 90,
    alignItems: 'center',
  },
  countrySelectorText: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    fontFamily: 'Fraunces',
    fontSize: 20,
    color: colors.textPrimary,
    padding: 0,
    paddingVertical: 8,
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
  pickerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pickerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: {
    fontFamily: 'Fraunces',
    fontSize: 17,
    color: colors.textPrimary,
  },
  pickerSearch: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerSearchInput: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  countryFlag: {
    fontSize: 22,
  },
  countryName: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.textPrimary,
  },
  countryDial: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.textMuted,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 20,
  },
});
