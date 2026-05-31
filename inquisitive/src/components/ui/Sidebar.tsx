import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { supabase } from '@/lib/db/client';
import { useProfileStore } from '@/stores/profileStore';
import { useFirstName } from '@/hooks/useFirstName';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const PANEL_WIDTH = Dimensions.get('window').width * 0.7;

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

export function Sidebar({ visible, onClose }: SidebarProps) {
  const insets = useSafeAreaInsets();
  const firstName = useFirstName();
  const initial = firstName?.trim()?.charAt(0)?.toUpperCase() ?? '';
  const translateX = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [showSignOut, setShowSignOut] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -PANEL_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  async function confirmSignOut() {
    setShowSignOut(false);
    onClose();
    await supabase.auth.signOut();
    useProfileStore.getState().clear();
  }

  return (
    <Animated.View
      style={styles.root}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: '#000', opacity: backdropOpacity },
          ]}
        />
      </Pressable>

      <Animated.View
        style={[
          styles.panel,
          { paddingTop: insets.top + spacing.lg, transform: [{ translateX }] },
        ]}
      >
        {/* Profile header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {firstName ?? ''}
            </Text>
            <Text style={styles.brand}>INQUISITIVE</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={8} activeOpacity={0.7}>
            <SymbolView name="xmark" size={18} tintColor={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          onPress={() => setShowSignOut(true)}
          activeOpacity={0.7}
          style={styles.row}
        >
          <SymbolView
            name="rectangle.portrait.and.arrow.right"
            size={20}
            tintColor={colors.textSecondary}
          />
          <Text style={styles.rowLabel}>Sign Out</Text>
        </TouchableOpacity>
      </Animated.View>

      <ConfirmDialog
        visible={showSignOut}
        title="Sign out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign out"
        destructive
        onConfirm={confirmSignOut}
        onCancel={() => setShowSignOut(false)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: colors.surface,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 18,
    color: colors.accent,
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 18,
    color: colors.textPrimary,
  },
  brand: {
    fontFamily: 'Inter',
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rowLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: spacing.md,
  },
});
