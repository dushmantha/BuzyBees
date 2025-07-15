import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList,
  Modal,
  Linking
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useImagePicker from '../hooks/useImagePicker';
import mockService from '../services/api/mock/index';

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address?: string;
  bio?: string;
  avatar_url: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  date: string;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  description: string;
  pdf_url: string;
  is_new: boolean;
}

const ProfileScreen = ({ navigation }: { navigation: any }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'invoices'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [tempProfile, setTempProfile] = useState<ProfileData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const { signOut } = useAuth();
  const { showImagePickerOptions, isLoading: isImageLoading } = useImagePicker();

  const userId = '1';

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const response = await mockService.getUserById(userId);
        
        if (response.data) {
          const userData: ProfileData = {
            id: response.data.id,
            full_name: response.data.full_name,
            email: response.data.email,
            phone: response.data.phone,
            address: response.data.address || '',
            bio: response.data.bio || '',
            avatar_url: response.data.avatar_url,
          };
          setProfile(userData);
        } else {
          Alert.alert('Error', response.error || 'Failed to load profile');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        Alert.alert('Error', 'Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    try {
      setIsLoadingInvoices(true);
      // Mock API call - replace with actual API
      const response = await mockInvoiceService.getInvoices(userId);
      setInvoices(response.data || []);
      
      // Count unread invoices
      const newInvoicesCount = response.data?.filter((invoice: Invoice) => invoice.is_new).length || 0;
      setUnreadCount(newInvoicesCount);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      Alert.alert('Error', 'Failed to load invoices');
    } finally {
      setIsLoadingInvoices(false);
    }
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'invoices') {
      fetchInvoices();
    }
  }, [activeTab, fetchInvoices]);

  const handleEdit = useCallback(() => {
    if (profile) {
      setTempProfile({ ...profile });
      setIsEditing(true);
    }
  }, [profile]);

  const handleSave = useCallback(async () => {
    if (!tempProfile) return;

    const validateForm = (): boolean => {
      if (!tempProfile.full_name.trim()) {
        Alert.alert('Validation Error', 'Please enter your name');
        return false;
      }
      if (!/^\S+@\S+\.\S+$/.test(tempProfile.email)) {
        Alert.alert('Validation Error', 'Please enter a valid email address');
        return false;
      }
      if (!tempProfile.phone.trim()) {
        Alert.alert('Validation Error', 'Please enter your phone number');
        return false;
      }
      return true;
    };

    if (!validateForm()) return;
    
    try {
      setIsSaving(true);
      
      // API call to update profile
      const response = await mockService.updateUser(userId, tempProfile);
      
      if (response.success) {
        setProfile({ ...tempProfile });
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Error', response.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [tempProfile, userId]);

  const handleCancel = () => {
    setIsEditing(false);
    setTempProfile(null);
  };

  const updateField = (field: keyof ProfileData, value: string) => {
    if (tempProfile) {
      setTempProfile(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const handleChoosePhoto = useCallback(async () => {
    try {
      const imageUri = await showImagePickerOptions();
      if (imageUri && tempProfile) {
        setTempProfile(prev => prev ? { ...prev, avatar_url: imageUri } : null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error in image picker:', error);
      Alert.alert('Error', 'Failed to pick an image. Please try again.');
      return false;
    }
  }, [showImagePickerOptions, tempProfile]);

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      const response = await mockInvoiceService.markAsPaid(invoiceId);
      if (response.success) {
        setInvoices(prev => prev.map(invoice => 
          invoice.id === invoiceId 
            ? { ...invoice, status: 'paid' as const }
            : invoice
        ));
        Alert.alert('Success', 'Invoice marked as paid');
      } else {
        Alert.alert('Error', 'Failed to update invoice status');
      }
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      Alert.alert('Error', 'Failed to update invoice status');
    }
  };

  const handleMarkAsRead = async (invoiceId: string) => {
    try {
      const response = await mockInvoiceService.markAsRead(invoiceId);
      if (response.success) {
        setInvoices(prev => prev.map(invoice => 
          invoice.id === invoiceId 
            ? { ...invoice, is_new: false }
            : invoice
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking invoice as read:', error);
    }
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      if (invoice.pdf_url) {
        await Linking.openURL(invoice.pdf_url);
      } else {
        Alert.alert('Error', 'PDF not available');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Error', 'Failed to download PDF');
    }
  };

  const renderField = (label: string, field: keyof ProfileData, isTextArea = false) => {
    const currentProfile = isEditing ? tempProfile : profile;
    if (!currentProfile) return null;

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        {isEditing ? (
          <TextInput
            style={[styles.input, isTextArea && styles.textArea]}
            value={currentProfile[field] as string}
            onChangeText={(text) => updateField(field, text)}
            multiline={isTextArea}
            numberOfLines={isTextArea ? 3 : 1}
          />
        ) : (
          <Text style={styles.value}>{currentProfile[field] || 'Not provided'}</Text>
        )}
      </View>
    );
  };

  const renderInvoiceItem = ({ item }: { item: Invoice }) => (
    <TouchableOpacity 
      style={[styles.invoiceItem, item.is_new && styles.newInvoiceItem]}
      onPress={() => {
        setSelectedInvoice(item);
        setShowInvoiceModal(true);
        if (item.is_new) {
          handleMarkAsRead(item.id);
        }
      }}
    >
      <View style={styles.invoiceHeader}>
        <View style={styles.invoiceInfo}>
          <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
          <Text style={styles.invoiceDate}>{new Date(item.date).toLocaleDateString()}</Text>
        </View>
        <View style={styles.invoiceActions}>
          {item.is_new && <View style={styles.newBadge} />}
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => {
              setSelectedInvoice(item);
              setShowInvoiceModal(true);
            }}
          >
            <Ionicons name="ellipsis-vertical" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.invoiceDescription}>{item.description}</Text>
      
      <View style={styles.invoiceFooter}>
        <Text style={styles.invoiceAmount}>
          {item.currency} {item.amount.toFixed(2)}
        </Text>
        <View style={[
          styles.statusBadge,
          item.status === 'paid' && styles.statusPaid,
          item.status === 'pending' && styles.statusPending,
          item.status === 'overdue' && styles.statusOverdue,
        ]}>
          <Text style={[
            styles.statusText,
            item.status === 'paid' && styles.statusTextPaid,
            item.status === 'pending' && styles.statusTextPending,
            item.status === 'overdue' && styles.statusTextOverdue,
          ]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderInvoiceModal = () => (
    <Modal
      visible={showInvoiceModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Invoice Details</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowInvoiceModal(false)}
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        {selectedInvoice && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.invoiceDetail}>
              <Text style={styles.detailLabel}>Invoice Number</Text>
              <Text style={styles.detailValue}>{selectedInvoice.invoice_number}</Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.detailValue}>
                {selectedInvoice.currency} {selectedInvoice.amount.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>
                {new Date(selectedInvoice.date).toLocaleDateString()}
              </Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={styles.detailValue}>
                {new Date(selectedInvoice.due_date).toLocaleDateString()}
              </Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={[
                styles.statusBadge,
                selectedInvoice.status === 'paid' && styles.statusPaid,
                selectedInvoice.status === 'pending' && styles.statusPending,
                selectedInvoice.status === 'overdue' && styles.statusOverdue,
              ]}>
                <Text style={[
                  styles.statusText,
                  selectedInvoice.status === 'paid' && styles.statusTextPaid,
                  selectedInvoice.status === 'pending' && styles.statusTextPending,
                  selectedInvoice.status === 'overdue' && styles.statusTextOverdue,
                ]}>
                  {selectedInvoice.status.toUpperCase()}
                </Text>
              </View>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>{selectedInvoice.description}</Text>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDownloadPDF(selectedInvoice)}
              >
                <Ionicons name="download-outline" size={20} color="#1A2533" />
                <Text style={styles.actionButtonText}>Download PDF</Text>
              </TouchableOpacity>
              
              {selectedInvoice.status !== 'paid' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.paidButton]}
                  onPress={() => {
                    handleMarkAsPaid(selectedInvoice.id);
                    setShowInvoiceModal(false);
                  }}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={[styles.actionButtonText, styles.paidButtonText]}>
                    Mark as Paid
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Failed to load profile</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => window.location.reload()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentProfile = isEditing ? tempProfile : profile;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons 
            name={activeTab === 'profile' ? 'person' : 'person-outline'} 
            size={20} 
            color={activeTab === 'profile' ? '#1A2533' : '#6B7280'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'profile' && styles.activeTabText
          ]}>
            Profile
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invoices' && styles.activeTab]}
          onPress={() => setActiveTab('invoices')}
        >
          <View style={styles.tabIconContainer}>
            <Ionicons 
              name={activeTab === 'invoices' ? 'receipt' : 'receipt-outline'} 
              size={20} 
              color={activeTab === 'invoices' ? '#1A2533' : '#6B7280'} 
            />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.tabText, 
            activeTab === 'invoices' && styles.activeTabText
          ]}>
            Invoices
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'profile' ? (
        <ScrollView style={styles.content}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center' }]}>
              {currentProfile?.avatar_url ? (
                <Image 
                  source={{ uri: currentProfile.avatar_url }} 
                  style={[styles.avatar, { position: 'absolute' }]}
                  onError={() => {
                    console.log('Error loading profile image');
                    if (isEditing && tempProfile) {
                      setTempProfile(prev => prev ? { ...prev, avatar_url: '' } : null);
                    }
                  }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ color: 'white', fontSize: 40, fontWeight: 'bold' }}>
                  {currentProfile?.full_name ? currentProfile.full_name.charAt(0).toUpperCase() : 'U'}
                </Text>
              )}
            </View>
            {isEditing && (
              <TouchableOpacity 
                style={styles.editPhotoButton}
                onPress={handleChoosePhoto}
                disabled={isSaving || isImageLoading}
              >
                {isSaving || isImageLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            )}
          </View>

          {renderField('Full Name', 'full_name')}
          {renderField('Email', 'email')}
          {renderField('Phone', 'phone')}
          {renderField('Address', 'address')}
          {renderField('Bio', 'bio', true)}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <TouchableOpacity style={styles.preferenceItem}>
              <Ionicons name="notifications-outline" size={20} color="#6B7280" />
              <Text style={styles.preferenceText}>Notifications</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.preferenceItem}>
              <Ionicons name="card-outline" size={20} color="#6B7280" />
              <Text style={styles.preferenceText}>Payment Methods</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.preferenceItem}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
              <Text style={styles.preferenceText}>Privacy</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            <TouchableOpacity style={styles.preferenceItem}>
              <Ionicons name="help-circle-outline" size={20} color="#6B7280" />
              <Text style={styles.preferenceText}>Help Center</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.preferenceItem}>
              <Ionicons name="document-text-outline" size={20} color="#6B7280" />
              <Text style={styles.preferenceText}>Terms & Conditions</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={async () => {
              try {
                await signOut();
                navigation.navigate('Login');
              } catch (error) {
                console.error('Error signing out:', error);
                Alert.alert('Error', 'Failed to sign out. Please try again.');
              }
            }}
          >
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.invoicesContainer}>
          {isLoadingInvoices ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1A2533" />
              <Text style={styles.loadingText}>Loading invoices...</Text>
            </View>
          ) : (
            <FlatList
              data={invoices}
              renderItem={renderInvoiceItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.invoicesList}
              showsVerticalScrollIndicator={false}
              refreshing={isLoadingInvoices}
              onRefresh={fetchInvoices}
            />
          )}
        </View>
      )}

      {/* Bottom Action Buttons */}
      {activeTab === 'profile' && (
        <>
          {isEditing ? (
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.saveButton, isSaving && styles.disabledButton]} 
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={[styles.buttonText, styles.saveButtonText]}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={handleEdit}
            >
              <Ionicons name="create-outline" size={20} color="#FFFFFF" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {renderInvoiceModal()}
    </SafeAreaView>
  );
};

// Mock Invoice Service
const mockInvoiceService = {
  async getInvoices(userId: string) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockInvoices: Invoice[] = [
      {
        id: '1',
        invoice_number: 'INV-2024-001',
        amount: 1250.00,
        currency: '$',
        date: '2024-01-15',
        due_date: '2024-02-15',
        status: 'pending',
        description: 'Monthly subscription - Premium Plan',
        pdf_url: 'https://example.com/invoice-001.pdf',
        is_new: true,
      },
      {
        id: '2',
        invoice_number: 'INV-2024-002',
        amount: 750.50,
        currency: '$',
        date: '2024-01-01',
        due_date: '2024-01-31',
        status: 'paid',
        description: 'One-time setup fee',
        pdf_url: 'https://example.com/invoice-002.pdf',
        is_new: false,
      },
      {
        id: '3',
        invoice_number: 'INV-2023-045',
        amount: 2100.00,
        currency: '$',
        date: '2023-12-15',
        due_date: '2023-12-31',
        status: 'overdue',
        description: 'Annual maintenance contract',
        pdf_url: 'https://example.com/invoice-045.pdf',
        is_new: false,
      },
    ];
    
    return { data: mockInvoices, success: true };
  },

  async markAsPaid(invoiceId: string) {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  },

  async markAsRead(invoiceId: string) {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true };
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9F8',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1A2533',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#1A2533',
  },
  tabIconContainer: {
    position: 'relative',
    marginRight: 8,
  },
  tabText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#1A2533',
    fontWeight: '600',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#1A2533',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: '#1A2533',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    color: '#1A2533',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  input: {
    fontSize: 16,
    color: '#1A2533',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        paddingVertical: 12,
      },
      android: {
        paddingVertical: 8,
      },
    }),
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  section: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  preferenceText: {
    flex: 1,
    fontSize: 15,
    color: '#1A2533',
    marginLeft: 12,
  },
  chevron: {
    marginLeft: 'auto',
  },
  logoutButton: {
    marginTop: 24,
    padding: 16,
    alignItems: 'center',
    marginBottom: 100,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  // Invoice Styles
  invoicesContainer: {
    flex: 1,
    backgroundColor: '#F8F9F8',
  },
  invoicesList: {
    padding: 16,
  },
  invoiceItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  newInvoiceItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  invoiceDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  invoiceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginRight: 8,
  },
  moreButton: {
    padding: 4,
  },
  invoiceDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2533',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPaid: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusOverdue: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextPaid: {
    color: '#065F46',
  },
  statusTextPending: {
    color: '#92400E',
  },
  statusTextOverdue: {
    color: '#991B1B',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9F8',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2533',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  invoiceDetail: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#1A2533',
    fontWeight: '500',
  },
  modalActions: {
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paidButton: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginLeft: 8,
  },
  paidButtonText: {
    color: '#FFFFFF',
  },
  // Bottom Action Buttons
  editButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#1A2533',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#1A2533',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#6B7280',
  },
  saveButtonText: {
    color: '#FFFFFF',
  },
});

export default ProfileScreen;