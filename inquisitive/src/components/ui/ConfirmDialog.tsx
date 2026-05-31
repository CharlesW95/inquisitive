import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/colors';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  // Tints the confirm action red for irreversible/destructive actions (delete, sign out).
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.subtitle}>{message}</Text> : null}
          </View>
          <View style={styles.rule} />
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.button} onPress={onCancel}>
              <Text style={styles.cancelLabel}>{cancelLabel}</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.button} onPress={onConfirm}>
              <Text style={[styles.confirmLabel, destructive && styles.confirmDestructive]}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    width: 280,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 20,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  rule: {
    height: 1,
    backgroundColor: colors.border,
  },
  buttons: {
    flexDirection: 'row',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
  },
  cancelLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  confirmLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  confirmDestructive: {
    color: '#E05252',
  },
});
