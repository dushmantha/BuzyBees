import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Image,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ServiceManagementAPI, { 
  Shop, 
  Service, 
  QuickBooking, 
  ServiceAvailability 
} from '../../services/ServiceManagementAPI';
import { useAuth } from '../../navigation/AppNavigator';

const { width } = Dimensions.get('window');

// Safe avatar URL helper function
const getSafeAvatarUrl = (avatar_url: any): string | undefined => {
  if (!avatar_url) return undefined;
  if (typeof avatar_url === 'string') return avatar_url;
  if (Array.isArray(avatar_url)) {
    console.warn('🚨 Staff avatar URL is array, using first item:', avatar_url);
    return avatar_url.length > 0 ? avatar_url[0] : undefined;
  }
  console.warn('🚨 Invalid staff avatar URL format:', typeof avatar_url, avatar_url);
  return undefined;
};

// Enhanced utility functions with better error handling
const parseTimeString = (timeString: string): number => {
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) throw new Error('Invalid time format');
    return (hours * 60) + minutes;
  } catch (error) {
    console.warn('Invalid time string:', timeString);
    return 0;
  }
};

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const isDateAvailable = (date: string, availability: ServiceAvailability): boolean => {
  if (!availability || !date) return false;
  
  try {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    
    if (availability.closed_days?.includes(dayOfWeek)) return false;
    if (availability.special_closures?.includes(date)) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateObj < today) return false;
    
    return true;
  } catch (error) {
    console.warn('Error checking date availability:', error);
    return false;
  }
};

const isDateFullyBooked = (date: string, availability: ServiceAvailability, serviceDuration: number): boolean => {
  if (!availability || !isDateAvailable(date, availability)) return true;
  
  try {
    const businessStart = parseTimeString(availability.business_hours?.start || '09:00');
    const businessEnd = parseTimeString(availability.business_hours?.end || '17:00');
    
    if (businessStart >= businessEnd || serviceDuration <= 0) return true;
    
    const totalPossibleSlots = Math.floor((businessEnd - businessStart) / serviceDuration);
    const bookedSlots = availability.booked_slots?.[date] || [];
    
    let blockedSlots = 0;
    for (let time = businessStart; time <= businessEnd - serviceDuration; time += serviceDuration) {
      const slotEnd = time + serviceDuration;
      
      const isBlocked = bookedSlots.some(booked => {
        try {
          const bookedStart = parseTimeString(booked.start);
          const bookedEnd = parseTimeString(booked.end);
          return (time < bookedEnd && slotEnd > bookedStart);
        } catch (error) {
          console.warn('Error parsing booked slot:', booked);
          return false;
        }
      });
      
      if (isBlocked) blockedSlots++;
    }
    
    return blockedSlots >= totalPossibleSlots;
  } catch (error) {
    console.warn('Error checking if date is fully booked:', error);
    return true;
  }
};

const getDateStatus = (date: string, availability: ServiceAvailability, serviceDuration: number): 'available' | 'fully_booked' | 'closed' => {
  if (!isDateAvailable(date, availability)) return 'closed';
  if (isDateFullyBooked(date, availability, serviceDuration)) return 'fully_booked';
  return 'available';
};

const generateTimeSlotsForDate = (date: string, availability: ServiceAvailability, serviceDuration: number): any[] => {
  if (!availability || !isDateAvailable(date, availability)) return [];

  try {
    const businessStart = parseTimeString(availability.business_hours?.start || '09:00');
    const businessEnd = parseTimeString(availability.business_hours?.end || '17:00');
    const bookedSlots = availability.booked_slots?.[date] || [];

    if (businessStart >= businessEnd || serviceDuration <= 0) return [];

    const slots = [];
    
    for (let time = businessStart; time <= businessEnd - serviceDuration; time += serviceDuration) {
      const slotEnd = time + serviceDuration;
      
      const isConflict = bookedSlots.some(booked => {
        try {
          const bookedStart = parseTimeString(booked.start);
          const bookedEnd = parseTimeString(booked.end);
          return (time < bookedEnd && slotEnd > bookedStart);
        } catch (error) {
          console.warn('Error parsing booked slot:', booked);
          return false;
        }
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
  } catch (error) {
    console.warn('Error generating time slots:', error);
    return [];
  }
};

// Enhanced Quick Booking Modal Component with better performance
const QuickBookingModal = ({ 
  visible, 
  onClose, 
  selectedService, 
  selectedShop,
  onBookingComplete 
}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [serviceAvailability, setServiceAvailability] = useState<ServiceAvailability | null>(null);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [shopStaff, setShopStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Memoized date range calculation
  const dateRange = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 60);
    return {
      today,
      maxDate: maxDate.toISOString().split('T')[0]
    };
  }, []);

  // Load service-specific staff
  const loadServiceStaff = useCallback(async (shopId: string, serviceId: string) => {
    if (!shopId || !serviceId) return;
    
    try {
      setLoadingStaff(true);
      const response = await ServiceManagementAPI.getServiceStaff(shopId, serviceId);
      
      if (response.success && response.data) {
        setShopStaff(response.data);
        console.log('📋 Service staff loaded:', response.data.length, 'staff members assigned to service');
      } else {
        console.warn('⚠️ Failed to load service staff:', response.message);
        setShopStaff([]);
      }
    } catch (error) {
      console.error('❌ Error loading service staff:', error);
      setShopStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  // Load service availability with retry logic
  const loadServiceAvailability = useCallback(async (serviceId: string, retryCount = 0) => {
    try {
      setLoading(true);
      const response = await ServiceManagementAPI.getServiceAvailability(serviceId);
      
      if (response.success && response.data) {
        setServiceAvailability(response.data);
      } else {
        throw new Error(response.message || 'Failed to load service availability');
      }
    } catch (error) {
      console.error('Error loading service availability:', error);
      
      // Retry logic
      if (retryCount < 2) {
        setTimeout(() => {
          loadServiceAvailability(serviceId, retryCount + 1);
        }, 1000);
      } else {
        Alert.alert('Error', 'Failed to load service availability. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Load availability and staff when service/shop changes
  useEffect(() => {
    if (selectedService?.id && visible) {
      loadServiceAvailability(selectedService.id);
    }
  }, [selectedService?.id, visible, loadServiceAvailability]);

  useEffect(() => {
    if (selectedShop?.id && selectedService?.id && visible) {
      loadServiceStaff(selectedShop.id, selectedService.id);
    }
  }, [selectedShop?.id, selectedService?.id, visible, loadServiceStaff]);

  // Memoized calendar marked dates calculation
  const calculatedMarkedDates = useMemo(() => {
    if (!selectedService || !serviceAvailability || !visible) return {};
    
    const marks = {};
    const today = new Date();
    
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const status = getDateStatus(dateStr, serviceAvailability, selectedService.duration_minutes);
      
      switch (status) {
        case 'closed':
          marks[dateStr] = {
            disabled: true,
            disableTouchEvent: true,
            customStyles: {
              container: { backgroundColor: '#6B6B6B' },
              text: { color: 'white', fontWeight: 'bold' }
            }
          };
          break;
          
        case 'fully_booked':
          marks[dateStr] = {
            disabled: true,
            disableTouchEvent: true,
            customStyles: {
              container: { backgroundColor: '#FECACA' },
              text: { color: '#991B1B', fontWeight: 'bold' }
            }
          };
          break;
          
        case 'available':
          marks[dateStr] = {
            marked: true,
            dotColor: '#22C55E',
            customStyles: {
              container: { backgroundColor: 'transparent' },
              text: { color: '#2D2A24' }
            }
          };
          break;
      }
    }
    
    // Highlight selected date
    if (selectedDate && marks[selectedDate] && !marks[selectedDate].disabled) {
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: '#F59E0B',
        customStyles: {
          container: { backgroundColor: '#F59E0B' },
          text: { color: 'white', fontWeight: 'bold' }
        }
      };
    }
    
    return marks;
  }, [selectedService, serviceAvailability, selectedDate, visible]);

  // Update markedDates when calculation changes
  useEffect(() => {
    setMarkedDates(calculatedMarkedDates);
  }, [calculatedMarkedDates]);

  // Generate time slots with debouncing
  useEffect(() => {
    if (selectedDate && selectedService && serviceAvailability && visible) {
      setLoading(true);
      
      const timeoutId = setTimeout(() => {
        const slots = generateTimeSlotsForDate(
          selectedDate, 
          serviceAvailability, 
          selectedService.duration_minutes
        );
        setAvailableSlots(slots);
        setLoading(false);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [selectedDate, selectedService, serviceAvailability, visible]);

  const handleDatePress = useCallback((day) => {
    setSelectedDate(day.dateString);
    setSelectedTime('');
    setShowCalendar(false);
  }, []);

  const handleTimePress = useCallback((time) => {
    setSelectedTime(time);
  }, []);

  const validateForm = useCallback(() => {
    const errors = [];
    
    if (!customerName.trim()) errors.push('Customer name is required');
    if (!customerPhone.trim()) errors.push('Customer phone number is required');
    if (!selectedDate) errors.push('Please select a date');
    if (!selectedTime) errors.push('Please select a time');
    
    // Phone number validation
    if (customerPhone.trim() && !/^[\+]?[1-9][\d]{0,15}$/.test(customerPhone.replace(/\s/g, ''))) {
      errors.push('Please enter a valid phone number');
    }
    
    // Email validation (if provided)
    if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      errors.push('Please enter a valid email address');
    }
    
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return false;
    }
    
    return true;
  }, [customerName, customerPhone, customerEmail, selectedDate, selectedTime]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const bookingData: QuickBooking = {
        service_id: selectedService.id,
        service_name: selectedService.name,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || undefined,
        date: selectedDate,
        time: selectedTime,
        duration: selectedService.duration_minutes,
        price: selectedService.price,
        notes: notes.trim() || undefined,
        assigned_staff_id: selectedStaffId || undefined
      };

      const response = await ServiceManagementAPI.createQuickBooking({
        ...bookingData,
        shop_id: selectedShop.id
      });
      
      if (response.success) {
        onBookingComplete(response.data);
        resetForm();
      } else {
        throw new Error(response.message || 'Failed to create booking');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert('Error', error.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  }, [validateForm, selectedService, customerName, customerPhone, customerEmail, selectedDate, selectedTime, notes, onBookingComplete]);

  const resetForm = useCallback(() => {
    setSelectedDate('');
    setSelectedTime('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setNotes('');
    setSelectedStaffId('');
    setShowCalendar(true);
    setServiceAvailability(null);
    setAvailableSlots([]);
    setShopStaff([]);
  }, []);

  const formatDisplayDate = useCallback((dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      console.warn('Error formatting date:', error);
      return dateStr;
    }
  }, []);

  const formatDisplayTime = useCallback((timeStr) => {
    if (!timeStr) return '';
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      return `${displayHour}:${minutes} ${period}`;
    } catch (error) {
      console.warn('Error formatting time:', error);
      return timeStr;
    }
  }, []);

  // Memoized time slots grid for better performance
  const TimeSlotGrid = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading times...</Text>
        </View>
      );
    }

    if (availableSlots.length === 0) {
      return (
        <View style={styles.noSlotsContainer}>
          <Text style={styles.noSlotsText}>No available times</Text>
          <Text style={styles.noSlotsSubtext}>Please select another date</Text>
        </View>
      );
    }

    return (
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
            <Text style={[
              styles.timeText,
              selectedTime === slot.startTime && styles.selectedTimeText,
            ]}>
              {slot.startTime}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [loading, availableSlots, selectedTime, handleTimePress]);

  const isFormValid = useMemo(() => {
    return customerName.trim() && customerPhone.trim() && selectedDate && selectedTime && !loading;
  }, [customerName, customerPhone, selectedDate, selectedTime, loading]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.quickBookingModal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Quick Booking</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color="#4B5563" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.quickBookingContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Service Information */}
          {selectedService && (
            <View style={styles.serviceNameText}>
              <Text style={styles.serviceTitle}>{selectedService.name}</Text>
              <Text style={styles.serviceSubtitle}>
                {selectedService.duration_minutes} min • ${selectedService.price}
              </Text>
            </View>
          )}

          {/* Customer Information */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Customer Name *</Text>
            <TextInput
              style={styles.textInput}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Enter customer name"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput
              style={styles.textInput}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="+46 xxx xxx xxx"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={customerEmail}
              onChangeText={setCustomerEmail}
              placeholder="customer@email.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Staff Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Assign Staff Member</Text>
            <Text style={styles.inputSubLabel}>Only staff assigned to this service are shown</Text>
            {loadingStaff ? (
              <View style={styles.staffLoadingContainer}>
                <ActivityIndicator size="small" color="#F59E0B" />
                <Text style={styles.staffLoadingText}>Loading assigned staff...</Text>
              </View>
            ) : shopStaff.length > 0 ? (
              <View style={styles.staffSelection}>
                <TouchableOpacity
                  style={[
                    styles.staffOption,
                    !selectedStaffId && styles.selectedStaffOption
                  ]}
                  onPress={() => setSelectedStaffId('')}
                >
                  {/* Generic Staff Avatar */}
                  <View style={styles.staffAvatarContainer}>
                    <View style={styles.genericStaffAvatarPlaceholder}>
                      <Ionicons name="people-outline" size={20} color="#FFFFFF" />
                    </View>
                  </View>

                  {/* Staff Info */}
                  <View style={styles.staffInfo}>
                    <Text style={[
                      styles.staffOptionText,
                      !selectedStaffId && styles.selectedStaffOptionText
                    ]}>
                      Any available staff
                    </Text>
                    <Text style={styles.staffSpecialties}>
                      System will assign automatically
                    </Text>
                  </View>

                  {/* Selection Checkmark */}
                  {!selectedStaffId && (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
                
                {shopStaff.map((staff) => {
                  const avatarUrl = getSafeAvatarUrl(staff.avatar_url);
                  return (
                    <TouchableOpacity
                      key={staff.id}
                      style={[
                        styles.staffOption,
                        selectedStaffId === staff.id && styles.selectedStaffOption
                      ]}
                      onPress={() => setSelectedStaffId(staff.id)}
                    >
                      {/* Staff Avatar */}
                      <View style={styles.staffAvatarContainer}>
                        {avatarUrl ? (
                          <Image
                            source={{ uri: avatarUrl }}
                            style={styles.staffAvatar}
                            onError={() => console.warn('Failed to load staff avatar:', avatarUrl)}
                          />
                        ) : (
                          <View style={styles.staffAvatarPlaceholder}>
                            <Text style={styles.staffAvatarInitials}>
                              {staff.name ? staff.name.charAt(0).toUpperCase() : '?'}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Staff Info */}
                      <View style={styles.staffInfo}>
                        <Text style={[
                          styles.staffOptionText,
                          selectedStaffId === staff.id && styles.selectedStaffOptionText
                        ]}>
                          {staff.name}
                        </Text>
                        {staff.specialties && staff.specialties.length > 0 && (
                          <Text style={styles.staffSpecialties}>
                            {staff.specialties.join(', ')}
                          </Text>
                        )}
                        {staff.experience_years && (
                          <Text style={styles.staffExperience}>
                            {staff.experience_years} years experience
                          </Text>
                        )}
                      </View>

                      {/* Selection Checkmark */}
                      {selectedStaffId === staff.id && (
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noStaffContainer}>
                <Text style={styles.noStaffText}>No staff assigned to this service</Text>
                <Text style={styles.noStaffSubtext}>Booking will be assigned to any available staff</Text>
              </View>
            )}
          </View>

          {/* Date Selection */}
          <View style={styles.dateTimeSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Select Date & Time</Text>
              {selectedDate && (
                <TouchableOpacity 
                  onPress={() => setShowCalendar(!showCalendar)}
                  style={styles.toggleCalendarButton}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <Text style={styles.toggleCalendarText}>
                    {showCalendar ? 'Hide' : 'Show'} Calendar
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {selectedDate && (
              <View style={styles.selectedDateTime}>
                <View style={styles.selectedDateTimeItem}>
                  <Ionicons name="calendar-outline" size={16} color="#F59E0B" />
                  <Text style={styles.selectedDateTimeText}>{formatDisplayDate(selectedDate)}</Text>
                </View>
                {selectedTime && (
                  <View style={styles.selectedDateTimeItem}>
                    <Ionicons name="time-outline" size={16} color="#F59E0B" />
                    <Text style={styles.selectedDateTimeText}>{formatDisplayTime(selectedTime)}</Text>
                  </View>
                )}
              </View>
            )}

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
                <View style={[styles.legendDot, { backgroundColor: '#4B5563' }]} />
                <Text style={styles.legendText}>Closed</Text>
              </View>
            </View>

            {showCalendar && serviceAvailability && (
              <View style={styles.calendarContainer}>
                <Calendar
                  onDayPress={handleDatePress}
                  markedDates={markedDates}
                  minDate={dateRange.today}
                  maxDate={dateRange.maxDate}
                  hideExtraDays={true}
                  disableAllTouchEventsForDisabledDays={true}
                  enableSwipeMonths={true}
                  theme={{
                    selectedDayBackgroundColor: '#F59E0B',
                    selectedDayTextColor: '#FFFFFF',
                    todayTextColor: '#F59E0B',
                    dayTextColor: '#1F2937',
                    textDisabledColor: '#D1D5DB',
                    dotColor: '#10B981',
                    selectedDotColor: '#FFFFFF',
                    arrowColor: '#F59E0B',
                    monthTextColor: '#1F2937',
                    textDayFontSize: 14,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 12,
                  }}
                />
              </View>
            )}

            {/* Loading state for availability */}
            {!serviceAvailability && selectedService && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#F59E0B" />
                <Text style={styles.loadingText}>Loading availability...</Text>
              </View>
            )}

            {/* Time Selection */}
            {selectedDate && serviceAvailability && (
              <View style={styles.timeSlotsContainer}>
                <Text style={styles.timeSlotsTitle}>Available Times</Text>
                {TimeSlotGrid}
              </View>
            )}
          </View>

          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Special requirements or notes..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.quickBookingFooter}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={onClose}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.createButton,
              !isFormValid && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>Create Booking</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const ServiceManagementScreen = ({ navigation }) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [showShopSelector, setShowShopSelector] = useState(false);
  const [showQuickBooking, setShowQuickBooking] = useState(false);
  const [showAvailabilityEditor, setShowAvailabilityEditor] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debug authentication state
  useEffect(() => {
    console.log('🔐 ServiceManagement Auth State:', {
      user: user ? { id: user.id, email: user.email } : null,
      authLoading,
      isAuthenticated,
      renderCondition: !authLoading && (!isAuthenticated || !user) ? 'SHOW_NOT_AUTHENTICATED' : 
                     authLoading ? 'SHOW_INITIALIZING' : 
                     isLoading ? 'SHOW_LOADING' : 'SHOW_MAIN'
    });
  }, [user, authLoading, isAuthenticated, isLoading]);

  // Load initial data
  useEffect(() => {
    if (user?.id) {
      console.log('🚀 Starting to load shops for user:', user.id);
      loadShops();
    } else {
      console.log('🚫 Cannot load shops - no user ID');
    }
  }, [user?.id]);

  const loadShops = useCallback(async () => {
    if (!user?.id) {
      console.log('🚫 No user ID, skipping shop load');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🏪 Loading shops for user:', user.id);
      setIsLoading(true);
      setError(null);
      const response = await ServiceManagementAPI.getShops(user.id);
      
      console.log('🏪 Shop load response:', response);
      
      if (response.success) {
        console.log('✅ Shops loaded successfully:', response.data?.length || 0, 'shops');
        setShops(response.data || []);
        
        if (response.data && response.data.length > 0) {
          const firstActiveShop = response.data.find(shop => shop.is_active);
          if (firstActiveShop) {
            console.log('🎯 Selected first active shop:', firstActiveShop.name);
            setSelectedShop(firstActiveShop);
            await loadServices(firstActiveShop.id);
          } else {
            console.log('📋 No active shops found');
          }
        } else {
          console.log('📋 No shops found for user');
        }
      } else {
        throw new Error(response.message || 'Failed to load shops');
      }
    } catch (error) {
      console.error('❌ Error loading shops:', error);
      setError('Failed to load shops');
      Alert.alert('Error', 'Failed to load shops. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const loadServices = useCallback(async (shopId: string) => {
    try {
      const response = await ServiceManagementAPI.getServicesByShop(shopId);
      
      if (response.success && response.data) {
        // Debug logging
        console.log('📋 Raw services from API:', response.data.length);
        console.log('📋 Services:', response.data.map(s => ({ id: s.id, name: s.name, is_active: s.is_active })));
        
        // Ensure unique services by ID
        const uniqueServices = Array.from(
          new Map(response.data.map(service => [service.id, service])).values()
        );
        
        console.log('📋 Unique services:', uniqueServices.length);
        setServices(uniqueServices);
      } else {
        throw new Error(response.message || 'Failed to load services');
      }
    } catch (error) {
      console.error('Error loading services:', error);
      Alert.alert('Error', 'Failed to load services. Please try again.');
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadShops();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadShops]);

  const handleShopSelect = useCallback(async (shop: Shop) => {
    setSelectedShop(shop);
    setShowShopSelector(false);
    await loadServices(shop.id);
  }, [loadServices]);

  const toggleServiceStatus = useCallback(async (service: Service) => {
    try {
      const response = await ServiceManagementAPI.toggleServiceStatus(service.id, !service.is_active);
      
      if (response.success) {
        setServices(prevServices =>
          prevServices.map(s =>
            s.id === service.id ? { ...s, is_active: !s.is_active } : s
          )
        );
      } else {
        throw new Error(response.message || 'Failed to update service status');
      }
    } catch (error) {
      console.error('Error toggling service status:', error);
      Alert.alert('Error', 'Failed to update service status');
    }
  }, []);

  const createQuickBooking = useCallback((service: Service) => {
    setSelectedService(service);
    setShowQuickBooking(true);
  }, []);

  const handleDeleteService = useCallback((service: Service) => {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete ${service.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await ServiceManagementAPI.deleteService(service.id);
              
              if (response.success) {
                setServices(prevServices =>
                  prevServices.filter(s => s.id !== service.id)
                );
                Alert.alert('Success', 'Service deleted successfully');
              } else {
                throw new Error(response.message || 'Failed to delete service');
              }
            } catch (error) {
              console.error('Error deleting service:', error);
              Alert.alert('Error', 'Failed to delete service');
            }
          }
        }
      ]
    );
  }, []);

  const handleQuickBookingComplete = useCallback(async (bookingData: any) => {
    Alert.alert(
      'Booking Confirmed!',
      `Successfully booked ${bookingData.customer_name} on ${bookingData.date} at ${bookingData.time}.\n\nStatus: Confirmed & Ready for Service`,
      [{ text: 'OK' }]
    );
    setShowQuickBooking(false);
    
    // Refresh services to update availability
    if (selectedShop) {
      await loadServices(selectedShop.id);
    }
  }, [selectedShop, loadServices]);

  // Memoized utility functions
  const formatDuration = useCallback((minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return `${amount.toFixed(0)}`;
  }, []);

  // Memoized statistics calculations
  const serviceStats = useMemo(() => {
    const activeServices = services.filter(s => s.is_active);
    const totalServices = services.length;
    
    const avgPrice = totalServices > 0 
      ? services.reduce((sum, service) => sum + service.price, 0) / totalServices 
      : 0;
    
    const avgDuration = totalServices > 0 
      ? Math.round(services.reduce((sum, service) => sum + service.duration_minutes, 0) / totalServices)
      : 0;

    return {
      activeCount: activeServices.length,
      totalCount: totalServices,
      avgPrice: formatCurrency(avgPrice),
      avgDuration: `${avgDuration}m`
    };
  }, [services, formatCurrency]);

  const renderShopSelector = () => (
    <Modal visible={showShopSelector} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.shopSelectorModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Shop</Text>
            <TouchableOpacity 
              onPress={() => setShowShopSelector(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#4B5563" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.shopList}>
            {shops.map((shop) => (
              <TouchableOpacity
                key={shop.id}
                style={[
                  styles.shopItem,
                  selectedShop?.id === shop.id && styles.selectedShopItem
                ]}
                onPress={() => handleShopSelect(shop)}
              >
                <View style={styles.shopItemInfo}>
                  <Text style={styles.shopItemName}>{shop.name}</Text>
                  <Text style={styles.shopItemLocation}>{shop.location}</Text>
                  <Text style={styles.shopItemCategory}>{shop.category}</Text>
                </View>
                <View style={[
                  styles.shopStatusDot,
                  shop.is_active ? styles.activeShopDot : styles.inactiveShopDot
                ]} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderAvailabilityEditor = () => (
    <Modal visible={showAvailabilityEditor} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.availabilityModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Availability</Text>
            <TouchableOpacity 
              onPress={() => setShowAvailabilityEditor(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#6B6B6B" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.availabilityContent}>
            <View style={styles.serviceNameText}>
              <Text style={styles.serviceTitle}>{selectedService?.name}</Text>
            </View>
            
            <View style={styles.availabilitySection}>
              <Text style={styles.sectionTitle}>Available Dates</Text>
              <View style={styles.datesList}>
                {selectedService?.available_dates?.map((date, index) => (
                  <View key={index} style={styles.dateChip}>
                    <Text style={styles.dateText}>{date}</Text>
                  </View>
                )) || []}
              </View>
            </View>

            <View style={styles.availabilitySection}>
              <Text style={styles.sectionTitle}>Unavailable Dates</Text>
              <View style={styles.datesList}>
                {selectedService?.unavailable_dates?.map((date, index) => (
                  <View key={index} style={[styles.dateChip, styles.unavailableDateChip]}>
                    <Text style={[styles.dateText, styles.unavailableDateText]}>{date}</Text>
                  </View>
                )) || []}
              </View>
            </View>

            <TouchableOpacity style={styles.editAvailabilityButton}>
              <Ionicons name="calendar-outline" size={20} color="#166534" />
              <Text style={styles.editAvailabilityText}>Edit Calendar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderServiceCard = useCallback(({ item }: { item: Service }) => (
    <View style={[styles.serviceCard, !item.is_active && styles.inactiveServiceCard]}>
      <View style={styles.serviceHeader}>
        <View style={styles.serviceInfo}>
          <View style={styles.serviceNameRow}>
            <Text style={[styles.serviceName, !item.is_active && styles.inactiveServiceName]}>
              {item.name}
            </Text>
            {!item.is_active && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
              </View>
            )}
          </View>
          <Text style={[styles.serviceCategory, !item.is_active && styles.inactiveServiceCategory]}>
            {item.category}
          </Text>
        </View>
        <View style={styles.serviceToggle}>
          <Switch
            value={item.is_active}
            onValueChange={() => toggleServiceStatus(item)}
            trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
            thumbColor={item.is_active ? '#10B981' : '#9CA3AF'}
          />
        </View>
      </View>
      
      <Text style={styles.serviceDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.serviceDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="cash-outline" size={16} color="#4B5563" />
          <Text style={styles.detailText}>{formatCurrency(item.price)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color="#4B5563" />
          <Text style={styles.detailText}>{formatDuration(item.duration_minutes)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={16} color="#4B5563" />
          <Text style={styles.detailText}>{item.available_dates?.length || 0} available days</Text>
        </View>
      </View>
      
      <View style={styles.serviceActions}>
        <TouchableOpacity 
          style={styles.quickBookingButton}
          onPress={() => createQuickBooking(item)}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <Ionicons name="calendar-outline" size={16} color="#3B82F6" />
          <Text style={styles.quickBookingButtonText}>Quick Book</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.deleteServiceButton}
          onPress={() => handleDeleteService(item)}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <Text style={styles.deleteServiceText}>Delete</Text>
        </TouchableOpacity>
        
        <View style={[
          styles.statusIndicator,
          item.is_active ? styles.activeStatus : styles.inactiveStatus
        ]}>
          <Text style={[
            styles.statusText,
            item.is_active ? styles.activeStatusText : styles.inactiveStatusText
          ]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
    </View>
  ), [toggleServiceStatus, formatCurrency, formatDuration, createQuickBooking, handleDeleteService]);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="construct-outline" size={64} color="#FCD34D" />
      <Text style={styles.emptyTitle}>No services found</Text>
      <Text style={styles.emptyDescription}>
        {selectedShop ? `Add services to ${selectedShop.name}` : 'Select a shop to view services'}
      </Text>
      {error && (
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [selectedShop, error, handleRefresh]);

  // Show loading while initializing authentication
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Initializing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show not authenticated if user is not logged in
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="person-outline" size={64} color="#FCD34D" />
          <Text style={styles.emptyTitle}>Not Authenticated</Text>
          <Text style={styles.emptyDescription}>
            Please login to manage services{'\n'}
            Debug: isAuthenticated={isAuthenticated ? 'true' : 'false'}, user={user ? 'exists' : 'null'}{'\n'}
            authLoading: {authLoading ? 'true' : 'false'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              console.log('🔄 Manual retry pressed');
              if (user?.id) loadShops();
            }}
          >
            <Text style={styles.retryButtonText}>Check Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show access denied if user is not a provider (temporarily commented out)
  // The Supabase User type might not have account_type property
  // if (user.account_type !== 'provider') {
  //   return (
  //     <SafeAreaView style={styles.container}>
  //       <View style={styles.loadingContainer}>
  //         <Ionicons name="business-outline" size={64} color="#FCD34D" />
  //         <Text style={styles.emptyTitle}>Provider Access Required</Text>
  //         <Text style={styles.emptyDescription}>Only providers can manage services. Current account: {user.account_type}</Text>
  //       </View>
  //     </SafeAreaView>
  //   );
  // }

  // Show loading while fetching data
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.shopSelector}>
          <View style={styles.shopSelectorContent}>
            <Text style={styles.headerTitle}>{selectedShop?.name || 'Select Shop'}</Text>
            <Text style={styles.shopLocation}>{selectedShop?.location}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setShowShopSelector(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-down" size={20} color="#6B6B6B" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{serviceStats.activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{serviceStats.totalCount}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{serviceStats.avgPrice}</Text>
          <Text style={styles.statLabel}>Avg Price</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{serviceStats.avgDuration}</Text>
          <Text style={styles.statLabel}>Avg Duration</Text>
        </View>
      </View>
      
      <FlatList
        data={services}
        renderItem={renderServiceCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#F59E0B']}
            tintColor="#F59E0B"
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={100}
        windowSize={10}
      />

      {renderShopSelector()}
      {renderAvailabilityEditor()}
      
      <QuickBookingModal
        visible={showQuickBooking}
        onClose={() => setShowQuickBooking(false)}
        selectedService={selectedService}
        selectedShop={selectedShop}
        onBookingComplete={handleQuickBookingComplete}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFCE8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B5563',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FEFCE8',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  shopSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shopSelectorContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  shopLocation: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#4B5563',
  },
  content: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  // Service Card Styles
  serviceCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  serviceCategory: {
    fontSize: 12,
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  serviceToggle: {
    marginLeft: 12,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  serviceDetails: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 4,
  },
  serviceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  editServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  editServiceText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  quickBookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  quickBookingButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
    marginLeft: 4,
  },
  deleteServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteServiceText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
    marginLeft: 4,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  activeStatus: {
    backgroundColor: '#ECFDF5',
    borderColor: '#D1FAE5',
  },
  inactiveStatus: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeStatusText: {
    color: '#10B981',
  },
  inactiveStatusText: {
    color: '#F59E0B',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  shopSelectorModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  availabilityModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  // Shop Selector Styles
  shopList: {
    maxHeight: 400,
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedShopItem: {
    backgroundColor: '#FEF3C7',
  },
  shopItemInfo: {
    flex: 1,
  },
  shopItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  shopItemLocation: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 2,
  },
  shopItemCategory: {
    fontSize: 12,
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  shopStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 12,
  },
  activeShopDot: {
    backgroundColor: '#10B981',
  },
  inactiveShopDot: {
    backgroundColor: '#9CA3AF',
  },
  // Availability Editor Styles
  availabilityContent: {
    padding: 20,
  },
  availabilitySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  datesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateChip: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  unavailableDateChip: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  dateText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  unavailableDateText: {
    color: '#EF4444',
  },
  editAvailabilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    marginTop: 20,
  },
  editAvailabilityText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 8,
  },
  // Quick Booking Modal Styles
  quickBookingModal: {
    flex: 1,
    backgroundColor: '#FEFCE8',
  },
  quickBookingContent: {
    flex: 1,
    padding: 16,
  },
  serviceNameText: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  serviceSubtitle: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
  inputGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  inputSubLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateTimeSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleCalendarButton: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  toggleCalendarText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  selectedDateTime: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  selectedDateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  selectedDateTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FEFCE8',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#4B5563',
    fontWeight: '500',
  },
  calendarContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timeSlotsContainer: {
    marginTop: 8,
  },
  timeSlotsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  timeSlot: {
    width: (width - 80) / 5,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#FEFCE8',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedTimeSlot: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  selectedTimeText: {
    color: '#FFFFFF',
  },
  noSlotsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noSlotsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  noSlotsSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  quickBookingFooter: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  createButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#FCD34D',
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Staff Selection Styles
  staffLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  staffLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4B5563',
  },
  staffSelection: {
    gap: 8,
  },
  staffOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FEFCE8',
  },
  selectedStaffOption: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  staffInfo: {
    flex: 1,
  },
  staffOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  selectedStaffOptionText: {
    color: '#10B981',
    fontWeight: '600',
  },
  staffSpecialties: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  staffExperience: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
    fontStyle: 'italic',
  },
  staffAvatarContainer: {
    marginRight: 12,
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  staffAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffAvatarInitials: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  genericStaffAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noStaffContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noStaffText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  noStaffSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },

  // Inactive service styles
  inactiveServiceCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    opacity: 0.9,
  },
  serviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inactiveServiceName: {
    color: '#6B7280',
  },
  inactiveServiceCategory: {
    color: '#9CA3AF',
  },
  inactiveBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
});

export default ServiceManagementScreen;