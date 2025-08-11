import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  Modal, 
  StatusBar,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar } from 'react-native-calendars';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { 
  generateStaffTimeSlots, 
  generateStaffCalendarMarks,
  getStaffAvailabilityForDate,
  StaffMember 
} from '../utils/staffAvailability';
import { bookingsAPI } from '../services/api/bookings/bookingsAPI';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

type RootStackParamList = {
  BookingDateTimeEnhanced: {
    selectedServices: any[];
    totalPrice: number;
    selectedStaff: StaffMember;
    selectedDiscount?: any;
    priceBreakdown?: {
      subtotal: number;
      discountAmount: number;
      discountedSubtotal: number;
      gstAmount: number;
      finalTotal: number;
      hasDiscount: boolean;
    };
    bookingDetails?: {
      serviceId: string;
      shopId: string;
      shopName: string;
      shopAddress: string;
      shopContact: string;
    };
  };
  [key: string]: any;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProp = RouteProp<RootStackParamList, 'BookingDateTimeEnhanced'>;

const { width: windowWidth } = Dimensions.get('window');

// Mock existing bookings for demo
const mockBookedSlots = {
  "2025-08-05": [
    { start: "09:00", end: "10:00" },
    { start: "14:00", end: "15:00" }
  ],
  "2025-08-06": [
    { start: "11:00", end: "12:00" },
    { start: "15:00", end: "16:30" }
  ]
};

const BookingDateTimeEnhancedScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { user } = useAuth();
  const { 
    selectedServices, 
    totalPrice, 
    selectedStaff, 
    selectedDiscount, 
    priceBreakdown, 
    bookingDetails 
  } = route.params || {};

  // Early return if required params are missing
  if (!selectedServices || !totalPrice || !selectedStaff) {
    console.error('❌ Missing required booking parameters');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Missing booking information. Please go back and try again.</Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  // Calculate service duration from selected services
  const serviceDuration = selectedServices.reduce((total, service) => {
    const duration = parseInt(service.duration) || 30;
    return total + duration;
  }, 0);

  // Generate calendar marks based on staff availability
  useEffect(() => {
    if (selectedStaff) {
      const marks = generateStaffCalendarMarks(selectedStaff);
      
      // Mark selected date
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
      
      setMarkedDates(marks);
    }
  }, [selectedStaff, selectedDate]);

  // Generate time slots when date changes
  useEffect(() => {
    const fetchTimeSlots = () => {
      if (!selectedDate || !selectedStaff) {
        return;
      }
      
      setLoading(true);
      
      // Get existing bookings for the date
      const bookedSlots = mockBookedSlots[selectedDate] || [];
      
      // Generate time slots based on staff schedule
      const slots = generateStaffTimeSlots(
        selectedDate, 
        selectedStaff, 
        serviceDuration, 
        bookedSlots
      );
      
      setAvailableSlots(slots);
      setLoading(false);
    };
    
    fetchTimeSlots();
  }, [selectedDate, selectedStaff, serviceDuration]);

  const handleDatePress = (day: { dateString: string }): void => {
    const availability = getStaffAvailabilityForDate(day.dateString, selectedStaff);
    
    if (!availability.isAvailable) {
      setWarningMessage(availability.reason || 'Staff member is not available on this date');
      setShowWarningModal(true);
      return;
    }
    
    setSelectedDate(day.dateString);
    setSelectedTime('');
  };

  const handleTimePress = (slot: any) => {
    if (!slot.available) {
      Alert.alert('Time Unavailable', 'This time slot is already booked.');
      return;
    }
    
    if (!slot.staffAvailable) {
      setWarningMessage('This time is outside the staff member\'s working hours. You can still book but the staff member may not be available.');
      setShowWarningModal(true);
      return;
    }
    
    setSelectedTime(slot.startTime);
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleConfirm = async (): Promise<void> => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Missing Information', 'Please select both date and time');
      return;
    }
    
    try {
      setLoading(true);
      
      // Calculate end time based on service duration
      const [startHour, startMinute] = selectedTime.split(':').map(Number);
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = startTotalMinutes + serviceDuration;
      const endHour = Math.floor(endTotalMinutes / 60);
      const endMinute = endTotalMinutes % 60;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      
      // UUID validation utility
      const isValidUUID = (str: string): boolean => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      // Prepare booking data with valid UUIDs
      console.log('🔍 Current user from auth context:', user);
      console.log('🔍 Current user ID:', user?.id);
      console.log('🔍 User email:', user?.email);
      console.log('🔍 User role:', user?.role);
      console.log('🔍 Is user ID valid UUID?:', user?.id ? isValidUUID(user.id) : 'No user ID');
      
      // Use the actual user ID - don't use a fallback UUID
      const customerId = user?.id || null;
      
      if (!customerId) {
        console.error('❌ No user ID available for booking');
        Alert.alert('Authentication Error', 'Please log in to create a booking.');
        setLoading(false);
        return;
      }
      
      // Debug: Log all available data to understand what we have
      console.log('🔍 Debug - bookingDetails:', bookingDetails);
      console.log('🔍 Debug - selectedStaff:', selectedStaff);
      console.log('🔍 Debug - selectedServices:', selectedServices);
      
      // Use shop ID from booking details, or from staff, or try service ID as fallback
      let shopId = null;
      
      if (bookingDetails?.shopId && isValidUUID(bookingDetails.shopId)) {
        console.log('✅ Using shop ID from bookingDetails');
        shopId = bookingDetails.shopId;
      } else if (selectedStaff.shop_id && isValidUUID(selectedStaff.shop_id)) {
        console.log('✅ Using shop ID from selectedStaff');
        shopId = selectedStaff.shop_id;
      } else if (selectedServices[0]?.id && isValidUUID(selectedServices[0].id)) {
        // Note: selectedServices here are actual service objects, not shop objects
        console.log('⚠️ Warning: Using service ID as last resort - this may be incorrect');
        shopId = selectedServices[0].id;
      } else {
        // If no valid shop ID, try to get any existing shop from database
        console.warn('⚠️ No valid UUID found in passed data, trying database lookup...');
        console.error('bookingDetails?.shopId:', bookingDetails?.shopId);
        console.error('selectedStaff.shop_id:', selectedStaff.shop_id);
        console.error('selectedServices[0]?.id:', selectedServices[0]?.id);
        
        try {
          // First check if provider_businesses table has any records at all
          const { data: allShops, error: allShopsError } = await supabase
            .from('provider_businesses')
            .select('id, name, is_active')
            .limit(5);
            
          console.log('🔍 All shops in database:', allShops);
          console.log('🔍 Database error (if any):', allShopsError);
          
          if (allShopsError) {
            console.error('❌ Database error:', allShopsError);
            Alert.alert('Database Error', `Unable to access provider database: ${allShopsError.message}`);
            setLoading(false);
            return;
          }
          
          if (!allShops || allShops.length === 0) {
            console.error('❌ No shops found in provider_businesses table');
            Alert.alert('Setup Required', 'No service providers are configured in the system. Please contact support.');
            setLoading(false);
            return;
          }
          
          // Try to find an active shop first
          const activeShop = allShops.find(shop => shop.is_active);
          const shopToUse = activeShop || allShops[0];
          
          shopId = shopToUse.id;
          console.log('✅ Using database shop as fallback:', shopToUse);
        } catch (error) {
          console.error('❌ Database lookup failed:', error);
          Alert.alert('Booking Error', 'Unable to connect to database. Please check your connection.');
          setLoading(false);
          return;
        }
      }
      
      console.log('📅 Booking with customer ID:', customerId);
      console.log('🏪 Booking with shop ID:', shopId);
      
      // Prepare services data
      const firstService = selectedServices[0];
      const totalDuration = selectedServices.reduce((sum, service) => sum + (parseInt(service.duration) || 30), 0);
      const finalPrice = priceBreakdown ? priceBreakdown.finalTotal : totalPrice;
      
      const bookingData = {
        customer_id: customerId,
        shop_id: shopId,
        staff_id: selectedStaff.id,
        booking_date: selectedDate,
        start_time: selectedTime,
        end_time: endTime,
        total_price: finalPrice,
        services: selectedServices.map(service => ({
          id: service.id,
          name: service.name,
          duration: parseInt(service.duration) || 30,
          price: parseFloat(service.price) || 0
        })),
        notes: `Booking with ${selectedStaff.name} for ${selectedServices.map(s => s.name).join(', ')}${selectedDiscount ? ` (${selectedDiscount.percentage}% discount applied)` : ''}`,
        discount_id: (selectedDiscount?.id && isValidUUID(selectedDiscount.id)) ? selectedDiscount.id : undefined,
        service_option_ids: []
      };
      
      console.log('📅 Creating booking:', bookingData);
      
      // Validate that the shop exists before creating booking
      console.log('🔍 Validating shop exists:', shopId);
      const { data: shopExists, error: shopError } = await supabase
        .from('provider_businesses')
        .select('id, name')
        .eq('id', shopId)
        .single();
        
      if (shopError || !shopExists) {
        console.error('❌ Shop validation failed:', shopError);
        console.log('❌ Trying to find any shop from provider_businesses...');
        
        // Try to find any active shop as a fallback
        const { data: anyShop, error: anyShopError } = await supabase
          .from('provider_businesses')
          .select('id, name')
          .eq('is_active', true)
          .limit(1)
          .single();
          
        if (anyShopError || !anyShop) {
          console.error('❌ No shops found in provider_businesses table');
          Alert.alert('Booking Error', 'No shops available for booking. Please try again later.');
          setLoading(false);
          return;
        }
        
        console.log('⚠️ Using fallback shop:', anyShop);
        shopId = anyShop.id;
      } else {
        console.log('✅ Shop validated:', shopExists);
      }
      
      // Save booking to Supabase
      const response = await bookingsAPI.createBooking(bookingData);
      
      if (response.success) {
        console.log('✅ Booking created successfully:', response.data);
        setShowSuccessModal(true);
        
        setTimeout(() => {
          setShowSuccessModal(false);
          setSelectedDate('');
          setSelectedTime('');
          // Navigate to bookings screen to see the new booking
          navigation.navigate('ConsumerTabs', { screen: 'BookingsTab' });
        }, 2500);
      } else {
        console.error('❌ Booking creation failed:', response.error);
        Alert.alert('Booking Failed', response.error || 'Failed to create booking. Please try again.');
      }
      
    } catch (error) {
      console.error('❌ Booking error:', error);
      Alert.alert('Error', 'Failed to confirm booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    if (dateStr === todayStr) return 'Today';
    if (dateStr === tomorrowStr) return 'Tomorrow';
    
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
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

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent={true} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Book with {selectedStaff?.name || 'Staff'}</Text>
          <Text style={styles.headerSubtitle}>Select date and time</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Staff Info */}
        <View style={styles.staffInfo}>
          <Text style={styles.sectionTitle}>Selected Staff Member</Text>
          <View style={styles.staffCard}>
            <View style={styles.staffHeader}>
              <Text style={styles.staffName}>{selectedStaff?.name}</Text>
              {selectedStaff?.rating > 0 && (
                <View style={styles.staffRating}>
                  <Ionicons name="star" size={16} color="#FFC107" />
                  <Text style={styles.staffRatingText}>{selectedStaff.rating}</Text>
                </View>
              )}
            </View>
            {selectedStaff?.specialties?.length > 0 && (
              <Text style={styles.staffSpecialties}>
                Specializes in: {selectedStaff.specialties.join(', ')}
              </Text>
            )}
          </View>
        </View>

        {/* Calendar Section */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="calendar-outline" size={20} color="#1F2937" />
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
              <Text style={styles.legendText}>On Leave</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#9CA3AF' }]} />
              <Text style={styles.legendText}>Not Working</Text>
            </View>
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
                textSectionTitleColor: '#1F2937',
                selectedDayBackgroundColor: '#F59E0B',
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: '#F59E0B',
                dayTextColor: '#2D2D2D',
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
        </View>

        {/* Time Slots */}
        {selectedDate && (
          <View style={styles.timeSlotsSection}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="time-outline" size={20} color="#1F2937" />
              {' '}Available Times for {formatDisplayDate(selectedDate)}
            </Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#F59E0B" />
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
                      !slot.available && styles.unavailableTimeSlot,
                    ]}
                    onPress={() => handleTimePress(slot)}
                  >
                    <Text 
                      style={[
                        styles.timeText,
                        selectedTime === slot.startTime && styles.selectedTimeText,
                        !slot.available && styles.unavailableTimeText,
                      ]}
                    >
                      {slot.startTime}
                    </Text>
                    {!slot.available && (
                      <Text style={styles.bookedText}>Booked</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.noSlotsContainer}>
                <Ionicons name="calendar-clear-outline" size={48} color="#9CA3AF" />
                <Text style={styles.noSlotsText}>No available time slots</Text>
                <Text style={styles.noSlotsSubtext}>
                  {selectedStaff?.name} is not working on this day
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Booking Summary */}
        {selectedDate && selectedTime && (
          <View style={styles.selectionSummary}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Staff Member</Text>
                <Text style={styles.summaryValue}>{selectedStaff?.name}</Text>
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
                <Text style={styles.summaryValue}>{serviceDuration} minutes</Text>
              </View>
              
              <View style={styles.summaryDivider} />
              
              {/* Pricing breakdown */}
              {priceBreakdown && priceBreakdown.hasDiscount && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>${priceBreakdown.subtotal}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, styles.discountText]}>
                      Discount ({selectedDiscount?.percentage}%)
                    </Text>
                    <Text style={[styles.summaryValue, styles.discountText]}>
                      -${priceBreakdown.discountAmount}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>After Discount</Text>
                    <Text style={styles.summaryValue}>${priceBreakdown.discountedSubtotal}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>GST (15%)</Text>
                    <Text style={styles.summaryValue}>${priceBreakdown.gstAmount}</Text>
                  </View>
                </>
              )}
              
              {!priceBreakdown?.hasDiscount && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>${totalPrice}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>GST (15%)</Text>
                    <Text style={styles.summaryValue}>${Math.round(totalPrice * 0.15)}</Text>
                  </View>
                </>
              )}
              
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalAmount}>
                  ${priceBreakdown ? priceBreakdown.finalTotal : Math.round(totalPrice * 1.15)}
                </Text>
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
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Warning Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showWarningModal}
        onRequestClose={() => setShowWarningModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons 
              name="warning" 
              size={64} 
              color="#F59E0B" 
              style={styles.warningIcon} 
            />
            <Text style={styles.warningTitle}>Staff Not Available</Text>
            <Text style={styles.warningText}>
              {warningMessage}
            </Text>
            <TouchableOpacity 
              style={styles.warningButton}
              onPress={() => setShowWarningModal(false)}
            >
              <Text style={styles.warningButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              Your appointment with {selectedStaff?.name} has been scheduled.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFCE8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  headerSpacer: {
    width: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(254, 243, 199, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
  staffInfo: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  staffCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  staffRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffRatingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 2,
  },
  staffSpecialties: {
    fontSize: 12,
    color: '#6B7280',
  },
  calendarSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
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
    borderWidth: 1,
    borderColor: '#FEF3C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  calendar: {
    borderRadius: 12,
    overflow: 'hidden',
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FCD34D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedTimeSlot: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  unavailableTimeSlot: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    opacity: 0.6,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  selectedTimeText: {
    color: '#FFFFFF',
  },
  unavailableTimeText: {
    color: '#9CA3AF',
  },
  bookedText: {
    fontSize: 10,
    color: '#EF4444',
    marginTop: 2,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
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
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
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
  discountText: {
    color: '#059669', // Green for discount
  },
  summaryValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#FCD34D',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F59E0B',
  },
  bottomSpacing: {
    height: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#FCD34D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    padding: 16,
    paddingBottom: 34,
  },
  confirmButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  warningIcon: {
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  warningButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  warningButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BookingDateTimeEnhancedScreen;