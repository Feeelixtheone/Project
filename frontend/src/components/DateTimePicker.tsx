import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

const MONTHS_RO = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
];

const DAYS_RO = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
}

export function DatePicker({ value, onChange, placeholder = 'Selectează data', label }: DatePickerProps) {
  const [visible, setVisible] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // Monday=0

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [year, month, firstDayOfWeek, daysInMonth]);

  const isPast = (day: number) => {
    const date = new Date(year, month, day);
    return date < today;
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return formatted === value;
  };

  const selectDay = (day: number) => {
    if (isPast(day)) return;
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(formatted);
    setVisible(false);
  };

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const displayValue = value
    ? (() => {
        const [y, m, d] = value.split('-').map(Number);
        return `${d} ${MONTHS_RO[m - 1]} ${y}`;
      })()
    : '';

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.inputButton} onPress={() => setVisible(true)}>
        <Ionicons name="calendar" size={20} color={COLORS.primary} />
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {displayValue || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.calendarContainer} onStartShouldSetResponder={() => true}>
            {/* Month Navigation */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{MONTHS_RO[month]} {year}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Day Headers */}
            <View style={styles.dayHeaders}>
              {DAYS_RO.map((d) => (
                <Text key={d} style={styles.dayHeader}>{d}</Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>
              {calendarDays.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    day && isSelected(day) && styles.dayCellSelected,
                    day && isPast(day) && styles.dayCellPast,
                  ]}
                  onPress={() => day && selectDay(day)}
                  disabled={!day || isPast(day)}
                >
                  {day && (
                    <Text
                      style={[
                        styles.dayText,
                        isSelected(day) && styles.dayTextSelected,
                        isPast(day) && styles.dayTextPast,
                      ]}
                    >
                      {day}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

interface TimePickerProps {
  value: string; // HH:MM
  onChange: (time: string) => void;
  placeholder?: string;
  label?: string;
}

export function TimePicker({ value, onChange, placeholder = 'Selectează ora', label }: TimePickerProps) {
  const [visible, setVisible] = useState(false);

  const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8:00 - 22:00
  const minutes = ['00', '15', '30', '45'];

  const selectTime = (hour: number, minute: string) => {
    const formatted = `${String(hour).padStart(2, '0')}:${minute}`;
    onChange(formatted);
    setVisible(false);
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.inputButton} onPress={() => setVisible(true)}>
        <Ionicons name="time" size={20} color={COLORS.primary} />
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={[styles.calendarContainer, { maxHeight: 400 }]} onStartShouldSetResponder={() => true}>
            <Text style={styles.timeTitle}>Selectează ora</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {hours.map((hour) => (
                <View key={hour} style={styles.timeRow}>
                  <Text style={styles.timeHour}>{String(hour).padStart(2, '0')}:</Text>
                  <View style={styles.minuteOptions}>
                    {minutes.map((minute) => {
                      const isActive = value === `${String(hour).padStart(2, '0')}:${minute}`;
                      return (
                        <TouchableOpacity
                          key={`${hour}-${minute}`}
                          style={[styles.minuteBtn, isActive && styles.minuteBtnActive]}
                          onPress={() => selectTime(hour, minute)}
                        >
                          <Text style={[styles.minuteText, isActive && styles.minuteTextActive]}>
                            {String(hour).padStart(2, '0')}:{minute}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  inputText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.text,
  },
  placeholderText: {
    color: COLORS.textMuted,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  calendarContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 380,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary,
  },
  dayCellPast: {
    opacity: 0.3,
  },
  dayText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.text,
  },
  dayTextSelected: {
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  dayTextPast: {
    color: COLORS.textMuted,
  },
  timeTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  timeHour: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.textSecondary,
    width: 35,
  },
  minuteOptions: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  minuteBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
  },
  minuteBtnActive: {
    backgroundColor: COLORS.primary,
  },
  minuteText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  minuteTextActive: {
    color: COLORS.text,
    fontFamily: FONTS.semiBold,
  },
});
