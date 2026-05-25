import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";
import { DEV_USER_ID } from "@/constants/dev";
import { useDueCards } from "@/hooks/useDueCards";

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: dueCards = [] } = useDueCards(DEV_USER_ID);

  const now = new Date().toISOString();
  const dueCount = dueCards.filter((c) => c.schedule.due <= now).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.count}>
        {dueCount} card{dueCount === 1 ? '' : 's'} due
      </Text>
      <TouchableOpacity
        style={[styles.goldPill, dueCount === 0 && styles.goldPillDisabled]}
        onPress={() => router.push('/review/session' as any)}
        disabled={dueCount === 0}
      >
        <Text style={[styles.goldPillText, dueCount === 0 && styles.goldPillTextDisabled]}>
          Review now
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/review/explorer' as any)} style={styles.browseLink}>
        <Text style={styles.browseLinkText}>Browse cards</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  count: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 28,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  goldPill: {
    backgroundColor: colors.accent,
    borderRadius: 26,
    height: 52,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  goldPillDisabled: {
    backgroundColor: colors.surface,
  },
  goldPillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.background,
  },
  goldPillTextDisabled: {
    color: colors.textMuted,
  },
  browseLink: {
    paddingVertical: 4,
  },
  browseLinkText: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.textMuted,
  },
});
