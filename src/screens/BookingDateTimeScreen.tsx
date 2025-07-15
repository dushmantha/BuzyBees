import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ScrollView, 
  Alert, 
  Modal, 
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar } from 'react-native-calendars';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

import Ionicons from 'react-native-vector-icons/Ionicons';

// Mock Service Options Data
const mockServiceOptions = [
  {
    id: "opt_1_1",
    service_id: "1",
    name: "Classic Manicure",
    description: "Basic nail care with polish application",
    duration: 45,
    price: 450,
    is_default: true,
    salon_name: "Beauty and Me",
    professional_name: "Anna Andersson",
    location: "Lützengatan 1, Stockholm"
  },
  {
    id: "opt_1_2",
    service_id: "1",
    name: "Gel Manicure",
    description: "Long-lasting gel polish application",
    duration: 60,
    price: 550,
    is_default: false,
    salon_name: "Beauty and Me",
    professional_name: "Anna Andersson",
    location: "Lützengatan 1, Stockholm"
  },
  {
    id: "opt_2_1",
    service_id: "2",
    name: "Haircut & Style",
    description: "Professional haircut with styling",
    duration: 60,
    price: 500,
    is_default: true,
    salon_name: "Elite Hair Studio",
    professional_name: "Erik Johansson",
    location: "Götgatan 15, Stockholm"
  },
  {
    id: "opt_2_2",
    service_id: "2",
    name: "Cut, Color & Style",
    description: "Complete hair transformation with color",
    duration: 120,
    price: 850,
    is_default: false,
    salon_name: "Elite Hair Studio",
    professional_name: "Erik Johansson",
    location: "Götgatan 15, Stockholm"
  },
  {
    id: "opt_3_1",
    service_id: "3",
    name: "Swedish Massage",
    description: "Classic relaxing Swedish massage",
    duration: 60,
    price: 750,
    is_default: true,
    salon_name: "Wellness Spa Center",
    professional_name: "Maria Larsson",
    location: "Södermalm, Stockholm"
  }
];

// JSON Service Availability Data - Only contains business rules, booked slots, and closures
const mockServiceAvailability = {
  "1": {
    "business_hours": { 
      "start": "09:00", 
      "end": "18:00" 
    },
    "closed_days": [0], // 0 = Sunday
    "special_closures": [
      "2025-07-19", 
      "2025-07-26"
    ],
    "booked_slots": {
      "2025-07-15": [
        { "start": "09:00", "end": "09:45" },
        { "start": "10:30", "end": "11:15" },
        { "start": "13:00", "end": "13:45" },
        { "start": "14:30", "end": "15:15" },
        { "start": "16:00", "end": "16:45" }
      ],
      "2025-07-16": [
        { "start": "09:00", "end": "09:45" },
        { "start": "09:45", "end": "10:30" },
        { "start": "10:30", "end": "11:15" },
        { "start": "11:15", "end": "12:00" },
        { "start": "13:00", "end": "13:45" },
        { "start": "13:45", "end": "14:30" },
        { "start": "14:30", "end": "15:15" },
        { "start": "15:15", "end": "16:00" },
        { "start": "16:00", "end": "16:45" },
        { "start": "16:45", "end": "17:30" }
      ],
      "2025-07-17": [
        { "start": "11:00", "end": "11:45" },
        { "start": "15:00", "end": "15:45" }
      ],
      "2025-07-18": [
        { "start": "13:00", "end": "13:45" }
      ]
    }
  },
  "2": {
    "business_hours": { 
      "start": "10:00", 
      "end": "19:00" 
    },
    "closed_days": [0, 1], // Sunday and Monday
    "special_closures": [
      "2025-07-25"
    ],
    "booked_slots": {
      "2025-07-15": [
        { "start": "11:00", "end": "12:00" },
        { "start": "15:00", "end": "17:00" }
      ],
      "2025-07-17": [
        { "start": "10:00", "end": "11:00" },
        { "start": "11:00", "end": "12:00" },
        { "start": "12:00", "end": "13:00" },
        { "start": "13:00", "end": "14:00" },
        { "start": "14:00", "end": "15:00" },
        { "start": "15:00", "end": "16:00" },
        { "start": "16:00", "end": "17:00" },
        { "start": "17:00", "end": "18:00" },
        { "start": "18:00", "end": "19:00" }
      ]
    }
  },
  "3": {
    "business_hours": { 
      "start": "08:00", 
      "end": "20:00" 
    },
    "closed_days": [0], // Sunday only
    "special_closures": [],
    "booked_slots": {
      "2025-07-15": [
        { "start": "09:00", "end": "10:00" }
      ]
    }
  }
};

// Utility functions for availability calculations
const parseTimeString = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours * 60) + minutes;
};

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Function to check if a date is available for a service
const isDateAvailable = (date: string, serviceId: string): boolean => {
  const availability = mockServiceAvailability[serviceId];
  if (!availability) return false;
  
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  
  // Check if closed on this day of week
  if (availability.closed_days.includes(dayOfWeek)) {
    return false;
  }
  
  // Check if specially closed on this date
  if (availability.special_closures.includes(date)) {
    return false;
  }
  
  // Check if it's in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dateObj < today) {
    return false;
  }
  
  return true;
};

// Function to check if a date is fully booked
const isDateFullyBooked = (date: string, serviceId: string, serviceDuration: number): boolean => {
  const availability = mockServiceAvailability[serviceId];
  if (!availability) return true;
  
  // First check if date is available at all
  if (!isDateAvailable(date, serviceId)) {
    return true;
  }
  
  const businessStart = parseTimeString(availability.business_hours.start);
  const businessEnd = parseTimeString(availability.business_hours.end);
  
  // Calculate total possible slots
  const totalPossibleSlots = Math.floor((businessEnd - businessStart) / serviceDuration);
  
  // Get booked slots for this date
  const bookedSlots = availability.booked_slots[date] || [];
  
  // Calculate how many service slots are blocked by bookings
  let blockedSlots = 0;
  for (let time = businessStart; time <= businessEnd - serviceDuration; time += serviceDuration) {
    const slotEnd = time + serviceDuration;
    
    const isBlocked = bookedSlots.some(booked => {
      const bookedStart = parseTimeString(booked.start);
      const bookedEnd = parseTimeString(booked.end);
      return (time < bookedEnd && slotEnd > bookedStart);
    });
    
    if (isBlocked) {
      blockedSlots++;
    }
  }
  
  return blockedSlots >= totalPossibleSlots;
};

// Function to generate available dates for the next 60 days
const generateAvailableDates = (serviceId: string, serviceDuration: number): string[] => {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < 60; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    if (isDateAvailable(dateStr, serviceId)) {
      dates.push(dateStr);
    }
  }
  
  return dates;
};

// Function to get date status for calendar marking
const getDateStatus = (date: string, serviceId: string, serviceDuration: number): 'available' | 'fully_booked' | 'closed' => {
  if (!isDateAvailable(date, serviceId)) {
    return 'closed';
  }
  
  if (isDateFullyBooked(date, serviceId, serviceDuration)) {
    return 'fully_booked';
  }
  
  return 'available';
};

// Function to generate time slots for a specific date
const generateTimeSlotsForDate = (date: string, serviceId: string, serviceDuration: number): any[] => {
  const availability = mockServiceAvailability[serviceId];
  if (!availability || !isDateAvailable(date, serviceId)) {
    return [];
  }

  const businessStart = parseTimeString(availability.business_hours.start);
  const businessEnd = parseTimeString(availability.business_hours.end);
  const bookedSlots = availability.booked_slots[date] || [];

  const slots = [];
  
  // Generate slots with service duration intervals
  for (let time = businessStart; time <= businessEnd - serviceDuration; time += serviceDuration) {
    const slotEnd = time + serviceDuration;
    
    // Check if this slot conflicts with booked slots
    const isConflict = bookedSlots.some(booked => {
      const bookedStart = parseTimeString(booked.start);
      const bookedEnd = parseTimeString(booked.end);
      return (time < bookedEnd && slotEnd > bookedStart);
    });

    if (!isConflict && slotEnd <= businessEnd) {
      slots.push({
        id: minutesToTime(time),
        startTime: minutesToTime(time),
        endTime: minutesToTime(slotEnd),
        available: true,
        duration: serviceDuration
      });
    }
  }

  return slots;
};

const { width: windowWidth } = Dimensions.get('window');

const BookingDateTimeScreen: React.FC = () => {
  // Initialize with a default service option
  const [selectedServiceOption, setSelectedServiceOption] = useState(mockServiceOptions[0]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Calculate calendar marked dates when service changes
  useEffect(() => {
    if (selectedServiceOption) {
      console.log('Calculating calendar marks for service:', selectedServiceOption.name);
      const marks: any = {};
      
      // Generate dates for next 60 days and mark them
      const availableDates = generateAvailableDates(selectedServiceOption.service_id, selectedServiceOption.duration);
      console.log('Generated available dates:', availableDates.length);
      
      // Check all dates in the next 60 days
      const today = new Date();
      for (let i = 0; i < 60; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const status = getDateStatus(dateStr, selectedServiceOption.service_id, selectedServiceOption.duration);
        
        switch (status) {
          case 'closed':
            marks[dateStr] = {
              disabled: true,
              disableTouchEvent: true,
              customStyles: {
                container: { backgroundColor: '#6B7280' },
                text: { color: 'white', fontWeight: 'bold' }
              },
              marked: true,
              dotColor: '#6B7280'
            };
            break;
            
          case 'fully_booked':
            marks[dateStr] = {
              disabled: true,
              disableTouchEvent: true,
              customStyles: {
                container: { backgroundColor: '#FCA5A5' },
                text: { color: '#7F1D1D', fontWeight: 'bold' }
              },
              marked: true,
              dotColor: '#EF4444'
            };
            break;
            
          case 'available':
            marks[dateStr] = {
              marked: true,
              dotColor: '#10B981',
              customStyles: {
                container: { backgroundColor: 'transparent' },
                text: { color: '#1A2533' }
              }
            };
            break;
        }
      }
      
      // Mark selected date
      if (selectedDate && marks[selectedDate] && !marks[selectedDate].disabled) {
        marks[selectedDate] = {
          ...marks[selectedDate],
          selected: true,
          selectedColor: '#1A2533',
          customStyles: {
            container: { backgroundColor: '#1A2533' },
            text: { color: 'white', fontWeight: 'bold' }
          }
        };
      }
      
      setMarkedDates(marks);
      console.log('Calendar marks calculated:', Object.keys(marks).length, 'dates marked');
    }
  }, [selectedServiceOption, selectedDate]);

  // Check if a date is fully booked - using direct call to isDateFullyBooked

  // Generate time slots when date changes
  useEffect(() => {
    const fetchTimeSlots = () => {
      if (!selectedDate || !selectedServiceOption) {
        return;
      }
      
      setLoading(true);
      console.log('Generating time slots for:', selectedDate, selectedServiceOption.name);
      
      // Simulate API call for time slots
      setTimeout(() => {
        const slots = generateTimeSlotsForDate(
          selectedDate, 
          selectedServiceOption.service_id, 
          selectedServiceOption.duration
        );
        setAvailableSlots(slots);
        setLoading(false);
      }, 300);
    };
    
    fetchTimeSlots();
  }, [selectedDate, selectedServiceOption]);

  const generateTimeSlots = () => {
    setLoading(true);
    
    try {
      const slots = generateTimeSlotsForDate(selectedDate, selectedServiceOption.service_id, selectedServiceOption.duration);
      console.log('Generated slots:', slots.map(s => `${s.startTime} - ${s.endTime}`));
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error generating time slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelection = (serviceId: string) => {
    console.log('Service selected:', serviceId);
    const newService = mockServiceOptions.find(opt => opt.service_id === serviceId && opt.is_default);
    if (newService) {
      setSelectedServiceOption(newService);
      setSelectedDate('');
      setSelectedTime('');
    }
  };

  const handleDatePress = (day: { dateString: string }): void => {
    console.log('Date selected:', day.dateString);
    setSelectedDate(day.dateString);
    setSelectedTime('');
  };

  const handleTimePress = (time: string) => {
    console.log('Time selected:', time);
    setSelectedTime(time);
  };

    const navigation = useNavigation<NavigationProp>();

  const handleConfirm = (): void => {
    if (!selectedDate || !selectedTime) {
      return;
    }
    
    setShowSuccessModal(true);
    
    // Close modal after showing success and navigate to Home
    const timer = setTimeout(() => {
      setShowSuccessModal(false);
      // Reset form after successful booking
      setSelectedDate('');
      setSelectedTime('');
      console.log('Booking completed successfully!');
      
      // Navigate to MainTabs after successful booking
      navigation.navigate('MainTabs');
    }, 2500);
    
    // Cleanup function to clear timeout if component unmounts
    return (): void => clearTimeout(timer);
  };

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
    if (dateStr === todayStr) return 'Today';
    if (dateStr === tomorrowStr) return 'Tomorrow';
    
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const formatDisplayTime = (timeStr: string): string => {
    if (!timeStr) return 'Select a time';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${displayHour}:${minutes} ${period}`;
  };

  // Get today's date for calendar
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60); // 60 days in advance
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => console.log('Back button pressed')}
        >
          <Ionicons name="arrow-back" size={20} color="#1A2533" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Book Appointment</Text>
          <Text style={styles.headerSubtitle}>Select date and time</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Service Selector */}
        <View style={styles.serviceSelector}>
          <Text style={styles.summaryTitle}>Select Service</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.keys(mockServiceAvailability).map(serviceId => {
              const serviceOption = mockServiceOptions.find(opt => opt.service_id === serviceId && opt.is_default);
              if (!serviceOption) return null;
              
              const isSelected = selectedServiceOption?.service_id === serviceId;
              
              return (
                <TouchableOpacity
                  key={serviceId}
                  style={[styles.serviceOptionButton, isSelected && styles.selectedServiceOption]}
                  onPress={() => handleServiceSelection(serviceId)}
                >
                  <Text style={[styles.serviceOptionText, isSelected && styles.selectedServiceOptionText]}>
                    {serviceOption.salon_name}
                  </Text>
                  <Text style={[styles.serviceOptionSubtext, isSelected && styles.selectedServiceOptionText]}>
                    {serviceOption.name} ({serviceOption.duration}min)
                  </Text>
                  <Text style={[styles.serviceOptionSubtext, isSelected && styles.selectedServiceOptionText]}>
                    ${serviceOption.price}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Current Selection Summary */}
        {selectedServiceOption && (
          <View style={styles.servicesSummary}>
            <Text style={styles.summaryTitle}>Selected Service</Text>
            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceName}>{selectedServiceOption.name}</Text>
                <Text style={styles.servicePrice}>${selectedServiceOption.price}</Text>
              </View>
              <Text style={styles.serviceDescription}>{selectedServiceOption.description}</Text>
              <View style={styles.serviceDetails}>
                <View style={styles.serviceDetailItem}>
                  <Ionicons name="time-outline" size={14} color="#6B7280" />
                  <Text style={styles.serviceDetailText}>{selectedServiceOption.duration}min</Text>
                </View>
                <View style={styles.serviceDetailItem}>
                  <Ionicons name="business-outline" size={14} color="#6B7280" />
                  <Text style={styles.serviceDetailText}>{selectedServiceOption.salon_name}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Calendar Section */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="calendar-outline" size={20} color="#1A2533" />
            {' '}Choose Date
          </Text>
          
          {/* Calendar Legend */}
          <View style={styles.calendarLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>Fully Booked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#6B7280' }]} />
              <Text style={styles.legendText}>Closed</Text>
            </View>
          </View>
          
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>
              Service: {selectedServiceOption?.name} | 
              Selected: {selectedDate} | 
              Marked Dates: {Object.keys(markedDates).length}
            </Text>
          </View>
          
          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={handleDatePress}
              markedDates={markedDates}
              minDate={today}
              maxDate={maxDateStr}
              hideExtraDays={true}
              disableAllTouchEventsForDisabledDays={true}
              enableSwipeMonths={true}
              style={styles.calendar}
              theme={{
                textSectionTitleColor: '#1A2533',
                selectedDayBackgroundColor: '#1A2533',
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: '#1A2533',
                dayTextColor: '#2D2D2D',
                textDisabledColor: '#D1D5DB',
                dotColor: '#10B981',
                selectedDotColor: '#FFFFFF',
                arrowColor: '#1A2533',
                monthTextColor: '#1A2533',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 12,
              }}
            />
          </View>
        </View>

        {/* Time Slots */}
        {selectedDate && (
          <View style={styles.timeSlotsSection}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="time-outline" size={20} color="#1A2533" />
              {' '}Available Times for {formatDisplayDate(selectedDate)}
            </Text>
            
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                Available Slots: {availableSlots.length} | Duration: {selectedServiceOption?.duration}min | Loading: {loading ? 'Yes' : 'No'}
              </Text>
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1A2533" />
                <Text style={styles.loadingText}>Loading available times...</Text>
              </View>
            ) : availableSlots.length > 0 ? (
              <View style={styles.timeSlotsGrid}>
                {availableSlots.map(slot => (
                  <TouchableOpacity
                    key={slot.id}
                    style={[
                      styles.timeSlot, 
                      selectedTime === slot.startTime && styles.selectedTimeSlot,
                    ]}
                    onPress={() => handleTimePress(slot.startTime)}
                  >
                    <Text 
                      style={[
                        styles.timeText,
                        selectedTime === slot.startTime && styles.selectedTimeText,
                      ]}
                    >
                      {slot.startTime}
                    </Text>
                    <Text 
                      style={[
                        styles.durationText,
                        selectedTime === slot.startTime && styles.selectedTimeText,
                      ]}
                    >
                      {slot.duration}min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.noSlotsContainer}>
                <Ionicons name="calendar-clear-outline" size={48} color="#9CA3AF" />
                <Text style={styles.noSlotsText}>No available time slots</Text>
                <Text style={styles.noSlotsSubtext}>Please select another date</Text>
              </View>
            )}
          </View>
        )}

        {/* Booking Summary */}
        {selectedDate && selectedTime && selectedServiceOption && (
          <View style={styles.selectionSummary}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service</Text>
                <Text style={styles.summaryValue}>{selectedServiceOption.name}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Date</Text>
                <Text style={styles.summaryValue}>{formatDisplayDate(selectedDate)}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Time</Text>
                <Text style={styles.summaryValue}>{formatDisplayTime(selectedTime)}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Duration</Text>
                <Text style={styles.summaryValue}>{selectedServiceOption.duration} minutes</Text>
              </View>
              
              <View style={styles.summaryDivider} />
              
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalAmount}>${selectedServiceOption.price}</Text>
              </View>
            </View>
          </View>
        )}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Fixed Footer */}
      {selectedDate && selectedTime && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons 
              name="checkmark-circle" 
              size={64} 
              color="#10B981" 
              style={styles.successIcon} 
            />
            <Text style={styles.successTitle}>Booking Confirmed!</Text>
            <Text style={styles.successSubtitle}>
              Your appointment has been successfully scheduled.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Simplified Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerSpacer: {
    width: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  serviceSelector: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 12,
  },
  serviceOptionButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 140,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedServiceOption: {
    backgroundColor: '#1A2533',
    borderColor: '#1A2533',
  },
  serviceOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A2533',
    textAlign: 'center',
  },
  serviceOptionSubtext: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
  selectedServiceOptionText: {
    color: '#fff',
  },
  servicesSummary: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },
  serviceCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    flex: 1,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  serviceDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  serviceDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceDetailText: {
    fontSize: 11,
    color: '#6B7280',
  },
  debugInfo: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  debugText: {
    fontSize: 10,
    color: '#92400E',
  },
  calendarSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  calendar: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeSlotsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    width: (windowWidth - 64) / 3,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    elevation: 1,
  },
  selectedTimeSlot: {
    backgroundColor: '#1A2533',
    borderColor: '#1A2533',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
  },
  selectedTimeText: {
    color: '#ffffff',
  },
  durationText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 2,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '500',
  },
  noSlotsContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 2,
  },
  noSlotsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  noSlotsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  selectionSummary: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2533',
  },
  bottomSpacing: {
    height: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 8,
    padding: 16,
    paddingBottom: 34,
  },
  confirmButton: {
    backgroundColor: '#1A2533',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    elevation: 10,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A2533',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default BookingDateTimeScreen;