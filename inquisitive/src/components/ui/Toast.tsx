import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/stores/toastStore';
import { colors } from '@/constants/colors';

export function Toast() {
  const { message, type, hideToast } = useToastStore();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const visibleRef = useRef(false);

  useEffect(() => {
    const showing = message !== null;
    if (showing === visibleRef.current) return;
    visibleRef.current = showing;

    if (showing) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -80, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [message]);

  return (
    <Animated.View
      style={[
        styles.container,
        type === 'error' ? styles.error : styles.info,
        { top: insets.top + 8, transform: [{ translateY }], opacity },
      ]}
      pointerEvents={message ? 'box-none' : 'none'}
    >
      <TouchableOpacity onPress={hideToast} activeOpacity={0.8} style={styles.inner}>
        <Text style={styles.text}>{message ?? ''}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  inner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  error: {
    backgroundColor: '#2A1A1A',
    borderLeftWidth: 3,
    borderLeftColor: '#E05252',
  },
  info: {
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  text: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
});
