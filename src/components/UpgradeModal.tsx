import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  title?: string;
  subtitle?: string;
  features?: Array<{
    icon: string;
    iconColor: string;
    title: string;
    description: string;
  }>;
  hiddenCount?: number;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  visible,
  onClose,
  onUpgrade,
  title = "Upgrade to Pro",
  subtitle = "Get unlimited access to all your notifications and premium features",
  features,
  hiddenCount = 0
}) => {
  
  const defaultFeatures = [
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

  const featuresToShow = features || defaultFeatures;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.modalContent} 
          contentContainerStyle={styles.modalContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <Ionicons name="star" size={48} color="#F59E0B" />
            </View>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
            
            {hiddenCount > 0 && (
              <View style={styles.hiddenCountBadge}>
                <Text style={styles.hiddenCountText}>
                  {hiddenCount} more notification{hiddenCount > 1 ? 's' : ''} waiting
                </Text>
              </View>
            )}
          </View>

          {/* Features List */}
          <View style={styles.featuresList}>
            <Text style={styles.featuresTitle}>What you'll get:</Text>
            
            {featuresToShow.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: feature.iconColor + '20' }]}>
                  <Ionicons name={feature.icon as any} size={20} color={feature.iconColor} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Pricing Section */}
          <View style={styles.pricingSection}>
            <Text style={styles.pricingTitle}>Choose Your Plan</Text>
            
            {/* Monthly Option */}
            <View style={styles.pricingOption}>
              <Text style={styles.pricingLabel}>Monthly</Text>
              <Text style={styles.pricingPrice}>$9.99/month</Text>
              <Text style={styles.pricingDescription}>Perfect for trying out Pro features</Text>
            </View>
            
            {/* Yearly Option - Recommended */}
            <View style={[styles.pricingOption, styles.pricingOptionRecommended]}>
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>RECOMMENDED</Text>
              </View>
              <Text style={styles.pricingLabel}>Yearly</Text>
              <View style={styles.pricingYearlyContainer}>
                <Text style={styles.pricingPrice}>$99.99/year</Text>
                <Text style={styles.pricingSavings}>Save 17%</Text>
              </View>
              <Text style={styles.pricingDescription}>Best value - 2 months free!</Text>
            </View>

            {/* Benefits List */}
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.benefitText}>Cancel anytime</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.benefitText}>Instant activation</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.benefitText}>30-day money back guarantee</Text>
              </View>
            </View>
          </View>

          {/* Social Proof */}
          <View style={styles.socialProof}>
            <View style={styles.socialProofHeader}>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons key={star} name="star" size={16} color="#F59E0B" />
                ))}
              </View>
              <Text style={styles.socialProofRating}>4.9/5 from 1,200+ users</Text>
            </View>
            <Text style={styles.socialProofText}>
              "The Pro features transformed how I manage my business notifications. Worth every penny!"
            </Text>
            <Text style={styles.socialProofAuthor}>- Sarah M., Salon Owner</Text>
          </View>
        </ScrollView>

        {/* Footer with Action Buttons */}
        <View style={styles.modalFooter}>
          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={onUpgrade}
            activeOpacity={0.8}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
            <Ionicons name="star" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.laterButton}
            onPress={onClose}
            activeOpacity={0.6}
          >
            <Text style={styles.laterButtonText}>Maybe Later</Text>
          </TouchableOpacity>

          <Text style={styles.secureText}>
            <Ionicons name="shield-checkmark" size={14} color="#6B7280" /> Secure payment • Cancel anytime
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9F8',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 16,
  },
  
  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  heroIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#FEF3C7',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
  },
  hiddenCountBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 16,
  },
  hiddenCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Features List
  featuresList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // Pricing Section
  pricingSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  pricingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 16,
    textAlign: 'center',
  },
  pricingOption: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  pricingOptionRecommended: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  pricingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 4,
  },
  pricingPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 4,
  },
  pricingYearlyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pricingSavings: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pricingDescription: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Benefits List
  benefitsList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#374151',
  },

  // Social Proof
  socialProof: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  socialProofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  socialProofRating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
  },
  socialProofText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 8,
  },
  socialProofAuthor: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Modal Footer
  modalFooter: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  laterButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  secureText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default UpgradeModal;