import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';

interface NotificationTimePickerProps {
  hour: number;
  minute: number;
  onConfirm: (hour: number, minute: number) => void;
}

export function NotificationTimePicker({
  hour,
  minute,
  onConfirm,
}: NotificationTimePickerProps) {
  const [visible, setVisible] = useState(false);
  const [selectedHour, setSelectedHour] = useState(hour);
  const [selectedMinute, setSelectedMinute] = useState(minute);

  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  };

  const handleConfirm = () => {
    onConfirm(selectedHour, selectedMinute);
    setVisible(false);
  };

  return (
    <>
      <Pressable
        style={styles.trigger}
        onPress={() => {
          setSelectedHour(hour);
          setSelectedMinute(minute);
          setVisible(true);
        }}
      >
        <Text style={styles.timeText}>{formatTime(hour, minute)}</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Set Reminder Time</Text>

            <View style={styles.pickers}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Hour</Text>
                <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <Pressable
                      key={h}
                      style={[
                        styles.option,
                        selectedHour === h && styles.optionSelected,
                      ]}
                      onPress={() => setSelectedHour(h)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selectedHour === h && styles.optionTextSelected,
                        ]}
                      >
                        {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Minute</Text>
                <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <Pressable
                      key={m}
                      style={[
                        styles.option,
                        selectedMinute === m && styles.optionSelected,
                      ]}
                      onPress={() => setSelectedMinute(m)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selectedMinute === m && styles.optionTextSelected,
                        ]}
                      >
                        :{String(m).padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
                <Text style={styles.confirmText}>Set</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    color: '#a78bfa',
    fontSize: 16,
    fontWeight: '600',
  },
  chevron: {
    color: '#475569',
    fontSize: 20,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f0f1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  sheetTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickers: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  scroll: {
    height: 200,
  },
  option: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  optionSelected: {
    backgroundColor: '#2d2d4e',
  },
  optionText: {
    color: '#64748b',
    fontSize: 15,
  },
  optionTextSelected: {
    color: '#a78bfa',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
  },
  cancelText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6c63ff',
    alignItems: 'center',
  },
  confirmText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
