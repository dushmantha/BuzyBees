import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  Dimensions,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Import the UpgradeModal component
import UpgradeModal from '../../components/UpgradeModal'; // Adjust the import path as needed

const { width, height } = Dimensions.get('window');

const EarningsScreen = ({ navigation }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  
  // API data states
  const [earningsData, setEarningsData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Track where upgrade was triggered from
  const [upgradeSource, setUpgradeSource] = useState('general');
  
  // Helper function to get date ranges
  const getDateRange = (period) => {
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        const dayOfWeek = now.getDay() || 7;
        startDate.setDate(now.getDate() - dayOfWeek + 1);
        startDate.setHours(0, 0, 0, 0);
        break;
        
      case 'month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
        
      case 'year':
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
        
      default:
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0]
    };
  };

  // Mock API functions - replace with your actual API calls
  const fetchEarningsData = async (period) => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(period);
      
      const mockData = await new Promise(resolve => {
        setTimeout(() => {
          resolve({
            total: period === 'week' ? 680 : period === 'month' ? 2450 : 12450,
            thisMonth: 2450,
            thisWeek: 680,
            pending: 320,
            period: period,
            dateRange: { startDate, endDate }
          });
        }, 500);
      });
      
      setEarningsData(mockData);
    } catch (err) {
      setError('Failed to fetch earnings data');
      console.error('Error fetching earnings:', err);
    }
  };

  const fetchTransactions = async (period, filter = 'all') => {
    try {
      const { startDate, endDate } = getDateRange(period);
      
      const allTransactions = [
        {
          id: '1',
          client: 'John Doe',
          service: 'Plumbing Repair',
          amount: 150,
          date: '2024-01-15',
          status: 'completed',
          category: 'plumbing',
        },
        {
          id: '2',
          client: 'Jane Smith',
          service: 'Electrical Work',
          amount: 220,
          date: '2024-01-14',
          status: 'pending',
          category: 'electrical',
        },
        {
          id: '3',
          client: 'Mike Johnson',
          service: 'Carpentry',
          amount: 180,
          date: '2024-01-13',
          status: 'completed',
          category: 'carpentry',
        },
        {
          id: '4',
          client: 'Sarah Wilson',
          service: 'HVAC Service',
          amount: 320,
          date: '2024-01-12',
          status: 'completed',
          category: 'hvac',
        },
        {
          id: '5',
          client: 'David Brown',
          service: 'Painting',
          amount: 280,
          date: '2024-01-11',
          status: 'pending',
          category: 'painting',
        },
        {
          id: '6',
          client: 'Lisa Davis',
          service: 'Plumbing Installation',
          amount: 450,
          date: '2024-01-10',
          status: 'completed',
          category: 'plumbing',
        },
        {
          id: '7',
          client: 'Tom Wilson',
          service: 'Emergency Repair',
          amount: 190,
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'completed',
          category: 'electrical',
        },
        {
          id: '8',
          client: 'Emma Johnson',
          service: 'Quick Fix',
          amount: 250,
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'pending',
          category: 'hvac',
        },
        {
          id: '9',
          client: 'Robert Smith',
          service: 'Major Renovation',
          amount: 1200,
          date: '2023-12-15',
          status: 'completed',
          category: 'carpentry',
        },
        {
          id: '10',
          client: 'Maria Garcia',
          service: 'Annual Maintenance',
          amount: 800,
          date: '2023-11-20',
          status: 'completed',
          category: 'hvac',
        },
      ];

      const mockData = await new Promise(resolve => {
        setTimeout(() => {
          const filteredByDate = allTransactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return transactionDate >= start && transactionDate <= end;
          });

          const filteredData = filter === 'all' ? filteredByDate : 
            filteredByDate.filter(transaction => {
              if (filter === 'completed' || filter === 'pending') {
                return transaction.status === filter;
              }
              return transaction.category === filter;
            });

          resolve(filteredData.sort((a, b) => new Date(b.date) - new Date(a.date)));
        }, 300);
      });
      
      setTransactions(mockData);
    } catch (err) {
      setError('Failed to fetch transactions');
      console.error('Error fetching transactions:', err);
    }
  };

  const fetchMonthlyData = async (period) => {
    try {
      const { startDate, endDate } = getDateRange(period);
      
      const allMonthlyData = [
        { id: '1', month: 'January 2024', amount: 2450, jobs: 12, status: 'completed', date: '2024-01-31' },
        { id: '2', month: 'December 2023', amount: 2180, jobs: 11, status: 'completed', date: '2023-12-31' },
        { id: '3', month: 'November 2023', amount: 1950, jobs: 9, status: 'completed', date: '2023-11-30' },
        { id: '4', month: 'October 2023', amount: 2100, jobs: 10, status: 'completed', date: '2023-10-31' },
        { id: '5', month: 'September 2023', amount: 1800, jobs: 8, status: 'completed', date: '2023-09-30' },
        { id: '6', month: 'August 2023', amount: 2200, jobs: 13, status: 'completed', date: '2023-08-31' },
        { id: '7', month: 'July 2023', amount: 1900, jobs: 9, status: 'completed', date: '2023-07-31' },
      ];

      const mockData = await new Promise(resolve => {
        setTimeout(() => {
          let filteredData = allMonthlyData;
          
          if (period === 'week') {
            filteredData = [
              { id: 'w1', month: 'Today', amount: 280, jobs: 2, status: 'completed', date: new Date().toISOString().split('T')[0] },
              { id: 'w2', month: 'Yesterday', amount: 150, jobs: 1, status: 'completed', date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
              { id: 'w3', month: '2 days ago', amount: 250, jobs: 1, status: 'completed', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
            ];
          } else if (period === 'month') {
            filteredData = allMonthlyData.slice(0, 1);
          }
          
          resolve(filteredData);
        }, 300);
      });
      
      setMonthlyData(mockData);
    } catch (err) {
      setError('Failed to fetch monthly data');
      console.error('Error fetching monthly data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component mounts or period changes
  useEffect(() => {
    const fetchAllData = async () => {
      await Promise.all([
        fetchEarningsData(selectedPeriod),
        fetchTransactions(selectedPeriod, selectedFilter),
        fetchMonthlyData(selectedPeriod)
      ]);
    };

    fetchAllData();
  }, [selectedPeriod]);

  // Fetch transactions when filter changes
  useEffect(() => {
    fetchTransactions(selectedPeriod, selectedFilter);
  }, [selectedFilter]);

  const periodButtons = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
  ];

  const filterOptions = [
    { key: 'all', label: 'All Transactions', icon: 'list-outline' },
    { key: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' },
    { key: 'pending', label: 'Pending', icon: 'time-outline' },
    { key: 'plumbing', label: 'Plumbing', icon: 'water-outline' },
    { key: 'electrical', label: 'Electrical', icon: 'flash-outline' },
    { key: 'carpentry', label: 'Carpentry', icon: 'hammer-outline' },
    { key: 'hvac', label: 'HVAC', icon: 'snow-outline' },
    { key: 'painting', label: 'Painting', icon: 'brush-outline' },
  ];

  const getFilteredTransactions = () => {
    return transactions;
  };

  const getDisplayedTransactions = () => {
    const filtered = getFilteredTransactions();
    if (!isPremiumUser) {
      return filtered.slice(0, 3);
    }
    return filtered;
  };

  const getDisplayedMonthlyData = () => {
    if (!isPremiumUser) {
      return monthlyData.slice(0, 3);
    }
    return monthlyData;
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
  };

  const handleFilterPress = (filterKey) => {
    if (!isPremiumUser && filterKey !== 'all') {
      setUpgradeSource('filter');
      setShowUpgradeModal(true);
      return;
    }
    setSelectedFilter(filterKey);
    setShowFilterModal(false);
  };

  const handleUpgradePress = (source = 'general') => {
    setUpgradeSource(source);
    setShowUpgradeModal(true);
  };

  const handleUpgrade = () => {
    console.log('Upgrade initiated from:', upgradeSource);
    // Implement your upgrade logic here
    setShowUpgradeModal(false);
    // You can redirect to payment screen or handle subscription
  };

  const getPeriodDisplayText = () => {
    switch (selectedPeriod) {
      case 'week':
        return 'This week';
      case 'month':
        return 'This month';
      case 'year':
        return 'This year';
      default:
        return 'This period';
    }
  };

  // Get hidden count for upgrade modal
  const getHiddenCount = () => {
    if (upgradeSource === 'transactions') {
      return Math.max(0, transactions.length - 3);
    } else if (upgradeSource === 'monthly') {
      return Math.max(0, monthlyData.length - 3);
    }
    return 0;
  };

  // Get upgrade modal content based on source
  const getUpgradeModalContent = () => {
    const baseFeatures = [
      {
        icon: 'people-outline',
        iconColor: '#3B82F6',
        title: 'Unlimited Customer Requests',
        description: 'View and manage unlimited booking requests from customers without any restrictions'
      },
      {
        icon: 'trending-up-outline',
        iconColor: '#059669',
        title: 'Income Analytics & Reports',
        description: 'Advanced income analysis, earning trends, and detailed financial insights for your business'
      },
      {
        icon: 'document-text-outline',
        iconColor: '#F59E0B',
        title: 'Premium Invoices',
        description: 'Professional invoices with custom logo, digital signature, and branded templates'
      },
      {
        icon: 'notifications-outline',
        iconColor: '#8B5CF6',
        title: 'Unlimited Notifications',
        description: 'Access all your notifications, reminders, and important business updates without limits'
      }
    ];

    switch (upgradeSource) {
      case 'filter':
        return {
          title: 'Upgrade for Advanced Filtering',
          subtitle: 'Unlock powerful filtering options to organize your transactions by status, category, and more',
          features: [
            {
              icon: 'filter-outline',
              iconColor: '#EF4444',
              title: 'Advanced Transaction Filtering',
              description: 'Filter by status, category, date range, amount, and custom criteria'
            },
            ...baseFeatures.slice(1)
          ]
        };
      case 'transactions':
        return {
          title: 'See All Your Transactions',
          subtitle: 'Access your complete transaction history without limits',
          features: [
            {
              icon: 'list-outline',
              iconColor: '#8B5CF6',
              title: 'Complete Transaction History',
              description: 'View all your transactions without any restrictions or limits'
            },
            ...baseFeatures
          ]
        };
      case 'monthly':
        return {
          title: 'Complete Monthly Breakdown',
          subtitle: 'Access detailed monthly analytics and historical data',
          features: [
            {
              icon: 'bar-chart-outline',
              iconColor: '#059669',
              title: 'Complete Monthly Analytics',
              description: 'View detailed monthly breakdowns and historical performance data'
            },
            ...baseFeatures
          ]
        };
      default:
        return {
          title: 'Upgrade to Pro',
          subtitle: 'Get unlimited access to all your earnings data and premium features',
          features: baseFeatures
        };
    }
  };

  const renderFilterOption = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.filterOption,
        selectedFilter === item.key && styles.activeFilterOption,
        !isPremiumUser && item.key !== 'all' && styles.lockedFilterOption
      ]}
      onPress={() => handleFilterPress(item.key)}
    >
      <View style={styles.filterOptionContent}>
        <Ionicons 
          name={item.icon} 
          size={20} 
          color={selectedFilter === item.key ? '#FFFFFF' : '#4B5563'} 
        />
        <Text style={[
          styles.filterOptionText,
          selectedFilter === item.key && styles.activeFilterOptionText
        ]}>
          {item.label}
        </Text>
        {!isPremiumUser && item.key !== 'all' && (
          <Ionicons name="lock-closed" size={16} color="#F59E0B" />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderMonthItem = ({ item, index }) => {
    const isBlurred = !isPremiumUser && index >= 3;
    
    return (
      <View style={[styles.monthItem, isBlurred && styles.blurredItem]}>
        <View style={styles.monthInfo}>
          <Text style={[styles.monthName, isBlurred && styles.blurredText]}>
            {item.month}
          </Text>
          <Text style={[styles.jobCount, isBlurred && styles.blurredText]}>
            {item.jobs} jobs
          </Text>
        </View>
        <Text style={[styles.monthAmount, isBlurred && styles.blurredText]}>
          ${item.amount.toFixed(2)}
        </Text>
        {isBlurred && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={20} color="#F59E0B" />
          </View>
        )}
      </View>
    );
  };

  const renderTransactionItem = ({ item, index }) => {
    const isBlurred = !isPremiumUser && index >= 3;
    
    return (
      <View style={[styles.transactionItem, isBlurred && styles.blurredItem]}>
        <View style={styles.transactionInfo}>
          <Text style={[styles.transactionClient, isBlurred && styles.blurredText]}>
            {item.client}
          </Text>
          <Text style={[styles.transactionService, isBlurred && styles.blurredText]}>
            {item.service}
          </Text>
          <Text style={[styles.transactionDate, isBlurred && styles.blurredText]}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.transactionAmount}>
          <Text style={[styles.amountText, isBlurred && styles.blurredText]}>
            ${item.amount}
          </Text>
          <View style={[
            styles.statusBadge,
            item.status === 'completed' ? styles.completedBadge : styles.pendingBadge,
            isBlurred && styles.blurredBadge
          ]}>
            <Text style={[
              styles.statusText,
              item.status === 'completed' ? styles.completedText : styles.pendingText,
              isBlurred && styles.blurredText
            ]}>
              {item.status === 'completed' ? 'Paid' : 'Pending'}
            </Text>
          </View>
        </View>
        {isBlurred && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={16} color="#F59E0B" />
          </View>
        )}
      </View>
    );
  };

  const FilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Filter Transactions</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color="#4B5563" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={filterOptions}
            renderItem={renderFilterOption}
            keyExtractor={(item) => item.key}
            showsVerticalScrollIndicator={false}
          />
          
          {!isPremiumUser && (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => {
                setShowFilterModal(false);
                handleUpgradePress('filter');
              }}
            >
              <Ionicons name="star" size={20} color="#FFFFFF" />
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderPremiumPrompt = (type) => {
    if (isPremiumUser) return null;
    
    const remainingCount = type === 'transactions' 
      ? Math.max(0, transactions.length - 3)
      : Math.max(0, monthlyData.length - 3);
    
    if (remainingCount <= 0) return null;

    return (
      <TouchableOpacity
        style={styles.premiumPrompt}
        onPress={() => handleUpgradePress(type)}
      >
        <View style={styles.premiumPromptContent}>
          <Ionicons name="lock-closed" size={20} color="#F59E0B" />
          <Text style={styles.premiumPromptText}>
            {remainingCount} more {type} available with Premium
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#F59E0B" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#FEFCE8" barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading earnings data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#FEFCE8" barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const upgradeModalContent = getUpgradeModalContent();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FEFCE8" barStyle="dark-content" />
      
      {/* Updated Header with matching background */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Earnings</Text>
          {!isPremiumUser && (
            <View style={styles.freeUserBadge}>
              <Text style={styles.freeUserText}>Free</Text>
            </View>
          )}
        </View>
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={() => !isPremiumUser && handleUpgradePress('export')}
        >
          <Ionicons 
            name="download-outline" 
            size={24} 
            color={isPremiumUser ? "#10B981" : "#F59E0B"} 
          />
          {!isPremiumUser && (
            <Ionicons 
              name="lock-closed" 
              size={12} 
              color="#F59E0B" 
              style={styles.lockIcon} 
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Main Earnings Card */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsTitle}>Total Earnings</Text>
          <Text style={styles.earningsAmount}>
            ${earningsData?.total?.toLocaleString() || '0'}
          </Text>
          <Text style={styles.earningsSubtext}>{getPeriodDisplayText()}</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statAmount}>${earningsData?.thisMonth || 0}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statAmount}>${earningsData?.thisWeek || 0}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statAmount, styles.pendingAmount]}>
              ${earningsData?.pending || 0}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periodButtons.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                selectedPeriod === period.key && styles.activePeriodButton
              ]}
              onPress={() => handlePeriodChange(period.key)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period.key && styles.activePeriodButtonText
              ]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Monthly/Period Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedPeriod === 'week' ? 'Daily Breakdown' : 
             selectedPeriod === 'month' ? 'Monthly Breakdown' : 
             'Monthly Breakdown'}
          </Text>
          <FlatList
            data={getDisplayedMonthlyData()}
            renderItem={renderMonthItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
          {renderPremiumPrompt('monthly')}
        </View>

        {/* Filter Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons name="filter-outline" size={20} color="#10B981" />
              <Text style={styles.filterButtonText}>Filter</Text>
              {!isPremiumUser && (
                <Ionicons name="lock-closed" size={14} color="#F59E0B" style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
          </View>

          {/* Active Filter Display */}
          {selectedFilter !== 'all' && (
            <View style={styles.activeFilterContainer}>
              <Text style={styles.activeFilterLabel}>Filtered by:</Text>
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  {filterOptions.find(f => f.key === selectedFilter)?.label}
                </Text>
                <TouchableOpacity onPress={() => setSelectedFilter('all')}>
                  <Ionicons name="close" size={16} color="#10B981" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <FlatList
            data={getDisplayedTransactions()}
            renderItem={renderTransactionItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
          {renderPremiumPrompt('transactions')}
        </View>
      </ScrollView>

      <FilterModal />
      
      {/* Updated UpgradeModal with dynamic content */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
        title={upgradeModalContent.title}
        subtitle={upgradeModalContent.subtitle}
        features={upgradeModalContent.features}
        hiddenCount={getHiddenCount()}
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
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B5563',
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
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FEFCE8', // Updated to match container background
    // Removed border to create seamless look
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  freeUserBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  freeUserText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  exportButton: {
    padding: 8,
    position: 'relative',
  },
  lockIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  
  // Earnings Styles
  earningsCard: {
    backgroundColor: '#F59E0B',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  earningsTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  earningsSubtext: {
    fontSize: 14,
    color: '#FEF3C7',
  },
  
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  pendingAmount: {
    color: '#F97316',
  },
  statLabel: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
  },
  
  // Period Selector
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activePeriodButton: {
    backgroundColor: '#F59E0B',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  activePeriodButtonText: {
    color: '#FFFFFF',
  },
  
  // Section Styles
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  
  // Filter Button
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Active Filter Display
  activeFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeFilterLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginRight: 8,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  activeFilterText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginRight: 4,
  },
  
  // Monthly Breakdown
  monthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    position: 'relative',
  },
  monthInfo: {
    flex: 1,
  },
  monthName: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 2,
  },
  jobCount: {
    fontSize: 12,
    color: '#4B5563',
  },
  monthAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  
  // Transaction Styles
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    position: 'relative',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionClient: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  transactionService: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  completedBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  completedText: {
    color: '#10B981',
  },
  pendingText: {
    color: '#F59E0B',
  },
  
  // Blurred/Locked Items
  blurredItem: {
    opacity: 0.5,
  },
  blurredText: {
    color: '#9CA3AF',
  },
  blurredBadge: {
    backgroundColor: '#F3F4F6',
  },
  lockOverlay: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  
  // Premium Prompt
  premiumPrompt: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  premiumPromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumPromptText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
    marginHorizontal: 8,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Filter Modal
  filterModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: width * 0.85,
    maxHeight: height * 0.7,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  filterOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilterOption: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  lockedFilterOption: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
    flex: 1,
  },
  activeFilterOptionText: {
    color: '#FFFFFF',
  },
  upgradeButton: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default EarningsScreen;