import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { normalizedShopService } from '../../lib/supabase/normalized';
import { useAccount } from '../../navigation/AppNavigator';

const { width } = Dimensions.get('window');

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalBookings: number;
  totalSpent: number;
  lastBooking: string;
  status: 'active' | 'inactive';
  joinDate: string;
  selected?: boolean;
}

interface PromotionData {
  type: 'email' | 'sms';
  subject: string;
  message: string;
  customerIds: string[];
}

const CustomersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { userProfile } = useAccount();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionData, setPromotionData] = useState<PromotionData>({
    type: 'email',
    subject: '',
    message: '',
    customerIds: []
  });
  const [isSendingPromotion, setIsSendingPromotion] = useState(false);

  // Mock data for now - replace with real API call
  const mockCustomers: Customer[] = [
    {
      id: '1',
      name: 'Anna Andersson',
      email: 'anna.andersson@email.com',
      phone: '+46701234567',
      totalBookings: 8,
      totalSpent: 2400,
      lastBooking: '2025-08-03',
      status: 'active',
      joinDate: '2024-06-15',
    },
    {
      id: '2',
      name: 'Erik Johansson',
      email: 'erik.johansson@email.com',
      phone: '+46702345678',
      totalBookings: 12,
      totalSpent: 3600,
      lastBooking: '2025-08-01',
      status: 'active',
      joinDate: '2024-04-20',
    },
    {
      id: '3',
      name: 'Maria Garcia',
      email: 'maria.garcia@email.com',
      phone: '+46703456789',
      totalBookings: 5,
      totalSpent: 1500,
      lastBooking: '2025-07-28',
      status: 'active',
      joinDate: '2024-08-10',
    },
    {
      id: '4',
      name: 'David Wilson',
      email: 'david.wilson@email.com',
      phone: '+46704567890',
      totalBookings: 3,
      totalSpent: 900,
      lastBooking: '2025-06-15',
      status: 'inactive',
      joinDate: '2024-05-05',
    },
    {
      id: '5',
      name: 'Lisa Chen',
      email: 'lisa.chen@email.com',
      phone: '+46705678901',
      totalBookings: 15,
      totalSpent: 4500,
      lastBooking: '2025-08-04',
      status: 'active',
      joinDate: '2024-03-12',
    },
  ];

  // Load customers data
  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with real API call
      // const response = await normalizedShopService.getCustomers(userProfile?.id);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCustomers(mockCustomers);
      setFilteredCustomers(mockCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
      Alert.alert('Error', 'Failed to load customers');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userProfile?.id]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Filter customers based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadCustomers();
  }, [loadCustomers]);

  const toggleCustomerSelection = useCallback((customerId: string) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  }, []);

  const selectAllCustomers = useCallback(() => {
    const allIds = new Set(filteredCustomers.map(c => c.id));
    setSelectedCustomers(allIds);
  }, [filteredCustomers]);

  const deselectAllCustomers = useCallback(() => {
    setSelectedCustomers(new Set());
  }, []);

  const handleSendPromotion = useCallback(() => {
    if (selectedCustomers.size === 0) {
      Alert.alert('No Customers Selected', 'Please select at least one customer to send promotions.');
      return;
    }
    
    setPromotionData({
      type: 'email',
      subject: '',
      message: '',
      customerIds: Array.from(selectedCustomers)
    });
    setShowPromotionModal(true);
  }, [selectedCustomers]);

  const sendPromotionToCustomers = useCallback(async () => {
    if (!promotionData.subject.trim() || !promotionData.message.trim()) {
      Alert.alert('Missing Information', 'Please fill in both subject and message.');
      return;
    }

    try {
      setIsSendingPromotion(true);
      
      // TODO: Replace with real API call
      // await normalizedShopService.sendPromotionToCustomers(promotionData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Promotion Sent!',
        `Successfully sent ${promotionData.type} promotion to ${selectedCustomers.size} customers.`,
        [{ text: 'OK', onPress: () => {
          setShowPromotionModal(false);
          setSelectedCustomers(new Set());
          setPromotionData({
            type: 'email',
            subject: '',
            message: '',
            customerIds: []
          });
        }}]
      );
    } catch (error) {
      console.error('Error sending promotion:', error);
      Alert.alert('Error', 'Failed to send promotion. Please try again.');
    } finally {
      setIsSendingPromotion(false);
    }
  }, [promotionData, selectedCustomers.size]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} kr`;
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => {
    const isSelected = selectedCustomers.has(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.customerCard, isSelected && styles.selectedCustomerCard]}
        onPress={() => toggleCustomerSelection(item.id)}
        activeOpacity={0.7}
      >
        {/* Header: Avatar + Name + Status + Selection */}
        <View style={styles.customerHeader}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerAvatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.customerMainInfo}>
            <View style={styles.customerTopRow}>
              <Text style={styles.customerName}>{item.name}</Text>
              <TouchableOpacity style={styles.selectionButton}>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                ) : (
                  <View style={styles.unselectedCircle} />
                )}
              </TouchableOpacity>
            </View>
            
            <View style={[styles.statusBadge, 
              item.status === 'active' ? styles.activeBadge : styles.inactiveBadge
            ]}>
              <Text style={[styles.statusText,
                item.status === 'active' ? styles.activeText : styles.inactiveText
              ]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.contactSection}>
          <View style={styles.contactItem}>
            <Ionicons name="mail" size={16} color="#6B7280" />
            <Text style={styles.contactText}>{item.email}</Text>
          </View>
          <View style={styles.contactItem}>
            <Ionicons name="call" size={16} color="#6B7280" />
            <Text style={styles.contactText}>{item.phone}</Text>
          </View>
        </View>

        {/* Statistics Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <View style={styles.statHeader}>
              <Ionicons name="calendar" size={14} color="#3B82F6" />
              <Text style={styles.statLabel}>Bookings</Text>
            </View>
            <Text style={styles.statValue}>{item.totalBookings}</Text>
          </View>
          
          <View style={styles.statBox}>
            <View style={styles.statHeader}>
              <Ionicons name="cash" size={14} color="#10B981" />
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
            <Text style={styles.statValue}>{formatCurrency(item.totalSpent)}</Text>
          </View>
          
          <View style={styles.statBox}>
            <View style={styles.statHeader}>
              <Ionicons name="time" size={14} color="#F59E0B" />
              <Text style={styles.statLabel}>Last Booking</Text>
            </View>
            <Text style={styles.statValue}>{formatDate(item.lastBooking)}</Text>
          </View>
          
          <View style={styles.statBox}>
            <View style={styles.statHeader}>
              <Ionicons name="person" size={14} color="#8B5CF6" />
              <Text style={styles.statLabel}>Joined</Text>
            </View>
            <Text style={styles.statValue}>{formatDate(item.joinDate)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPromotionModal = () => (
    <Modal
      visible={showPromotionModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowPromotionModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowPromotionModal(false)}>
            <Ionicons name="close" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Send Promotion</Text>
          <TouchableOpacity
            onPress={sendPromotionToCustomers}
            disabled={isSendingPromotion}
          >
            <Text style={[styles.sendButton, isSendingPromotion && styles.disabledButton]}>
              Send
            </Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.promotionTypeSection}>
            <Text style={styles.sectionTitle}>Promotion Type</Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[styles.typeButton, 
                  promotionData.type === 'email' && styles.activeTypeButton
                ]}
                onPress={() => setPromotionData(prev => ({ ...prev, type: 'email' }))}
              >
                <Ionicons name="mail" size={20} color={
                  promotionData.type === 'email' ? '#FFFFFF' : '#6B7280'
                } />
                <Text style={[styles.typeButtonText,
                  promotionData.type === 'email' && styles.activeTypeButtonText
                ]}>
                  Email
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.typeButton,
                  promotionData.type === 'sms' && styles.activeTypeButton
                ]}
                onPress={() => setPromotionData(prev => ({ ...prev, type: 'sms' }))}
              >
                <Ionicons name="chatbubble" size={20} color={
                  promotionData.type === 'sms' ? '#FFFFFF' : '#6B7280'
                } />
                <Text style={[styles.typeButtonText,
                  promotionData.type === 'sms' && styles.activeTypeButtonText
                ]}>
                  SMS
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>
              {promotionData.type === 'email' ? 'Subject' : 'Message Title'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={promotionData.subject}
              onChangeText={(text) => setPromotionData(prev => ({ ...prev, subject: text }))}
              placeholder="Enter subject..."
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.textInput, styles.messageInput]}
              value={promotionData.message}
              onChangeText={(text) => setPromotionData(prev => ({ ...prev, message: text }))}
              placeholder="Enter your promotion message..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
          
          <View style={styles.selectedCustomersSection}>
            <Text style={styles.sectionTitle}>
              Selected Customers ({selectedCustomers.size})
            </Text>
            {Array.from(selectedCustomers).map(customerId => {
              const customer = customers.find(c => c.id === customerId);
              return customer ? (
                <View key={customerId} style={styles.selectedCustomerItem}>
                  <Text style={styles.selectedCustomerName}>{customer.name}</Text>
                  <Text style={styles.selectedCustomerEmail}>{customer.email}</Text>
                </View>
              ) : null;
            })}
          </View>
        </ScrollView>
        
        {isSendingPromotion && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={styles.loadingText}>Sending promotion...</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customers</Text>
        <View style={{ width: 24 }} />
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Selection Controls */}
      <View style={styles.selectionControls}>
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            {selectedCustomers.size} of {filteredCustomers.length} selected
          </Text>
        </View>
        <View style={styles.selectionButtons}>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={selectAllCustomers}
          >
            <Text style={styles.selectButtonText}>Select All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={deselectAllCustomers}
          >
            <Text style={styles.selectButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Customer List */}
      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerItem}
        keyExtractor={(item) => item.id}
        style={styles.customerList}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#F59E0B']}
            tintColor="#F59E0B"
          />
        }
        showsVerticalScrollIndicator={false}
      />
      
      {/* Send Promotion Button */}
      {selectedCustomers.size > 0 && (
        <View style={styles.promotionButtonContainer}>
          <TouchableOpacity
            style={styles.promotionButton}
            onPress={handleSendPromotion}
          >
            <Ionicons name="mail" size={20} color="#FFFFFF" />
            <Text style={styles.promotionButtonText}>
              Send Promotion to {selectedCustomers.size} customers
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {renderPromotionModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectionInfo: {
    flex: 1,
  },
  selectionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  selectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  selectButtonText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  customerList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  // Customer Card Styles
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginVertical: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  selectedCustomerCard: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
    shadowColor: '#10B981',
    shadowOpacity: 0.2,
  },

  // Header Section (Avatar + Name + Status + Selection)
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  customerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  customerAvatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  customerMainInfo: {
    flex: 1,
  },
  customerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    flex: 1,
  },
  selectionButton: {
    padding: 4,
  },
  unselectedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  activeText: {
    color: '#065F46',
  },
  inactiveText: {
    color: '#991B1B',
  },

  // Contact Section
  contactSection: {
    marginBottom: 20,
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },

  // Statistics Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
  },
  promotionButtonContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  promotionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  promotionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  sendButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  promotionTypeSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  activeTypeButton: {
    backgroundColor: '#F59E0B',
  },
  typeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTypeButtonText: {
    color: '#FFFFFF',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  selectedCustomersSection: {
    marginTop: 12,
  },
  selectedCustomerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedCustomerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  selectedCustomerEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CustomersScreen;