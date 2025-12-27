import React, { useState, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ScrollView,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { SPACING, BORDER_RADIUS } from '../constants'

interface ScheduleDateTimeModalProps {
  visible: boolean
  onConfirm: (dateTime: Date) => void
  onCancel: () => void
  minDateTime?: Date
}

const { height } = Dimensions.get('window')

export default function ScheduleDateTimeModal({
  visible,
  onConfirm,
  onCancel,
  minDateTime = new Date(),
}: ScheduleDateTimeModalProps) {
  const [selectedDateTime, setSelectedDateTime] = useState(minDateTime)
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date')
  const [selectedDay, setSelectedDay] = useState(minDateTime.getDate())
  const [selectedMonth, setSelectedMonth] = useState(minDateTime.getMonth())
  const [selectedYear, setSelectedYear] = useState(minDateTime.getFullYear())
  const [selectedHour, setSelectedHour] = useState(minDateTime.getHours())
  const [selectedMinute, setSelectedMinute] = useState(minDateTime.getMinutes())

  useEffect(() => {
    if (visible) {
      setSelectedDateTime(minDateTime)
      setSelectedDay(minDateTime.getDate())
      setSelectedMonth(minDateTime.getMonth())
      setSelectedYear(minDateTime.getFullYear())
      setSelectedHour(minDateTime.getHours())
      setSelectedMinute(minDateTime.getMinutes())
    }
  }, [visible, minDateTime])

  useEffect(() => {
    const newDate = new Date(selectedYear, selectedMonth, selectedDay, selectedHour, selectedMinute)
    setSelectedDateTime(newDate)
  }, [selectedDay, selectedMonth, selectedYear, selectedHour, selectedMinute])

  const months = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate()
  const daysInSelectedMonth = getDaysInMonth(selectedMonth, selectedYear)
  const days = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1)
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)

  const formatDate = (day: number, month: number, year: number) => `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`
  const formatTime = (hour: number, minute: number) => `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  
  const formatFullDateTime = (date: Date) => {
    const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
    const dayOfWeek = daysOfWeek[date.getDay()]
    return `${dayOfWeek}, ${formatDate(date.getDate(), date.getMonth(), date.getFullYear())} lúc ${formatTime(date.getHours(), date.getMinutes())}`
  }

  const handleConfirm = () => {
    onConfirm(selectedDateTime)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.backdrop} />

        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chọn thời gian hẹn</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Selected DateTime Display */}
          <View style={styles.displayContainer}>
            <View style={styles.displayContent}>
              <MaterialIcons name="schedule" size={32} color="#FF6B00" />
              <Text style={styles.displayText}>
                {formatFullDateTime(selectedDateTime)}
              </Text>
            </View>
          </View>

          {/* Mode Selector */}
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeButton, pickerMode === 'date' && styles.modeButtonActive]}
              onPress={() => setPickerMode('date')}
            >
              <MaterialIcons name="calendar-today" size={20} color={pickerMode === 'date' ? '#FF6B00' : '#94a3b8'} />
              <Text style={[styles.modeText, pickerMode === 'date' && styles.modeTextActive]}>Ngày</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, pickerMode === 'time' && styles.modeButtonActive]}
              onPress={() => setPickerMode('time')}
            >
              <MaterialIcons name="access-time" size={20} color={pickerMode === 'time' ? '#FF6B00' : '#94a3b8'} />
              <Text style={[styles.modeText, pickerMode === 'time' && styles.modeTextActive]}>Giờ</Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          {pickerMode === 'date' && (
            <View style={styles.pickerContainer}>
              <View style={styles.wheelContainer}>
                <ScrollView style={styles.wheel} scrollEventThrottle={16}>
                  <View style={{ height: 75 }} />
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.wheelItem,
                        selectedDay === day && styles.wheelItemSelected,
                      ]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text style={[styles.wheelText, selectedDay === day && styles.wheelTextSelected]}>
                        {day.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <View style={{ height: 75 }} />
                </ScrollView>

                <ScrollView style={styles.wheel} scrollEventThrottle={16}>
                  <View style={{ height: 75 }} />
                  {months.map((month, idx) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.wheelItem,
                        selectedMonth === idx && styles.wheelItemSelected,
                      ]}
                      onPress={() => setSelectedMonth(idx)}
                    >
                      <Text style={[styles.wheelText, selectedMonth === idx && styles.wheelTextSelected]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <View style={{ height: 75 }} />
                </ScrollView>

                <ScrollView style={styles.wheel} scrollEventThrottle={16}>
                  <View style={{ height: 75 }} />
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.wheelItem,
                        selectedYear === year && styles.wheelItemSelected,
                      ]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text style={[styles.wheelText, selectedYear === year && styles.wheelTextSelected]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <View style={{ height: 75 }} />
                </ScrollView>
              </View>
            </View>
          )}

          {/* Time Picker */}
          {pickerMode === 'time' && (
            <View style={styles.pickerContainer}>
              <View style={styles.wheelContainer}>
                <ScrollView style={styles.wheel} scrollEventThrottle={16}>
                  <View style={{ height: 75 }} />
                  {hours.map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.wheelItem,
                        selectedHour === hour && styles.wheelItemSelected,
                      ]}
                      onPress={() => setSelectedHour(hour)}
                    >
                      <Text style={[styles.wheelText, selectedHour === hour && styles.wheelTextSelected]}>
                        {hour.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <View style={{ height: 75 }} />
                </ScrollView>

                <ScrollView style={styles.wheel} scrollEventThrottle={16}>
                  <View style={{ height: 75 }} />
                  {minutes.map((minute) => (
                    <TouchableOpacity
                      key={minute}
                      style={[
                        styles.wheelItem,
                        selectedMinute === minute && styles.wheelItemSelected,
                      ]}
                      onPress={() => setSelectedMinute(minute)}
                    >
                      <Text style={[styles.wheelText, selectedMinute === minute && styles.wheelTextSelected]}>
                        {minute.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <View style={{ height: 75 }} />
                </ScrollView>
              </View>
            </View>
          )}

          {/* Info Message */}
          <View style={styles.infoContainer}>
            <MaterialIcons name="info" size={20} color="#FF6B00" />
            <Text style={styles.infoText}>
              Tài xế sẽ đón bạn đúng vào giờ đã chọn
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    backgroundColor: '#1a202c',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: height * 0.85,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayContainer: {
    backgroundColor: '#0f172a',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.2)',
  },
  displayContent: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  displayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeButtonActive: {
    backgroundColor: '#374151',
    borderColor: '#FF6B00',
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  modeTextActive: {
    color: '#FF6B00',
  },
  pickerContainer: {
    backgroundColor: '#0f172a',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    height: 220,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  wheelContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  wheel: {
    flex: 1,
    height: 220,
  },
  wheelItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  wheelItemSelected: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderRadius: BORDER_RADIUS.lg,
  },
  wheelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#94a3b8',
    textAlign: 'center',
  },
  wheelTextSelected: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B00',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#FF6B00',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94a3b8',
  },
  confirmButton: {
    flex: 1,
    height: 56,
    backgroundColor: '#FF6B00',
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
})
