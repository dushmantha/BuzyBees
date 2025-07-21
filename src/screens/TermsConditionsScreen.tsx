import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Mock import for demo purposes - replace with actual import
// import { useAccount } from '../navigation/AppNavigator';

// Mock useAccount hook for demonstration
const useAccount = () => ({
  accountType: 'consumer' as 'consumer' | 'provider'
});

interface LegalDocument {
  id: string;
  title: string;
  type: 'terms' | 'privacy' | 'cookies' | 'community' | 'provider';
  content: string;
  last_updated: string;
  version: string;
  icon: string;
  color: string;
  description: string;
  summary: string;
}

interface TermsConditionsScreenProps {
  navigation?: {
    goBack: () => void;
    navigate: (screen: string) => void;
  };
}

const { width } = Dimensions.get('window');

const TermsConditionsScreen: React.FC<TermsConditionsScreenProps> = ({ 
  navigation = { 
    goBack: () => console.log('Navigate back'), 
    navigate: (screen: string) => console.log('Navigate to:', screen) 
  } 
}) => {
  const { accountType } = useAccount();
  const [isLoading, setIsLoading] = useState(true);
  const [activeDocument, setActiveDocument] = useState<'terms' | 'privacy' | 'cookies' | 'community' | 'provider'>('terms');
  const [documents, setDocuments] = useState<Record<string, LegalDocument>>({});
  const [viewMode, setViewMode] = useState<'cards' | 'detail'>('cards');

  // Mock API service with enhanced document metadata
  const mockLegalAPI = {
    async getLegalDocuments(): Promise<Record<string, LegalDocument>> {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        terms: {
          id: 'terms_v2.1',
          title: 'Terms of Service',
          type: 'terms',
          last_updated: '2025-01-15T00:00:00Z',
          version: '2.1',
          icon: 'document-text',
          color: '#F59E0B',
          description: 'Agreement between you and our platform',
          summary: 'Key rules and guidelines for using our service marketplace platform safely and effectively.',
          content: `# Terms of Service

**Last Updated: January 15, 2025**

## Welcome to Our Platform! 👋

Thank you for choosing our service marketplace. These terms help ensure a safe, fair, and enjoyable experience for everyone.

## 🎯 What We Do

We connect people who need services with trusted professionals who provide them. Whether you're looking for:

- 🏠 **Home Services**: Cleaning, repairs, maintenance
- 💄 **Personal Care**: Beauty, wellness, fitness
- 📚 **Learning**: Tutoring, skill development
- 🎉 **Events**: Planning, catering, entertainment

We've got you covered!

## 🔐 Your Account

### Getting Started
- Must be 18+ to use our platform
- Provide accurate information when signing up
- Keep your login details secure
- One account per person

### Account Types
- **🛒 Consumer**: Find and book services
- **🔧 Provider**: Offer your services
- **💎 Premium**: Enhanced features and benefits

## 💰 How Payments Work

### Simple & Secure
- All payments processed safely through our platform
- 15% platform fee on completed services
- Payments released after service completion
- No hidden fees or surprises

### Protection for Everyone
- Secure payment processing
- Dispute resolution available
- Refund policy for eligible issues
- 24/7 fraud monitoring

## 🤝 Community Standards

### What We Expect
- **Respect**: Treat everyone with kindness
- **Honesty**: Provide accurate information
- **Reliability**: Honor your commitments
- **Safety**: Follow all safety guidelines

### What's Not Allowed
- Harassment or discrimination
- Fake profiles or reviews
- Unsafe practices
- Illegal activities

## 🛡️ Safety First

### Our Commitment
- Identity verification for providers
- Background checks where required
- 24/7 safety monitoring
- Emergency support available

### Your Role
- Meet in safe, public places initially
- Trust your instincts
- Report any concerns immediately
- Follow platform safety guidelines

## 📞 Need Help?

### We're Here for You
- **Email**: support@serviceapp.com
- **Phone**: +64 9 123 4567
- **Live Chat**: Available 24/7
- **Help Center**: Comprehensive guides

## 🔄 Updates

We may update these terms occasionally. You'll be notified of any important changes via email and in-app notifications.

---

**Questions?** Our friendly support team is always ready to help explain anything you don't understand. We believe in transparency and want you to feel confident using our platform.`
        },
        privacy: {
          id: 'privacy_v1.8',
          title: 'Privacy Policy',
          type: 'privacy',
          last_updated: '2025-01-10T00:00:00Z',
          version: '1.8',
          icon: 'shield-checkmark',
          color: '#10B981',
          description: 'How we protect your personal information',
          summary: 'Clear explanation of how we collect, use, and protect your data with your privacy as our priority.',
          content: `# Privacy Policy

**Last Updated: January 10, 2025**

## Your Privacy Matters 🔒

We believe your personal information should be just that - personal. This policy explains exactly how we handle your data.

## 📊 What Information We Collect

### Personal Details
- **Basic Info**: Name, email, phone number
- **Profile Data**: Photos, service descriptions
- **Payment Info**: Securely encrypted payment details
- **Location**: Only with your permission

### How We Use It
- **Platform Operations**: Making bookings work smoothly
- **Safety & Security**: Keeping everyone protected
- **Customer Support**: Helping when you need it
- **Improvements**: Making our service better

## 🤝 Who We Share With

### Other Users (Limited)
- Basic profile information for service matching
- Reviews and ratings you choose to share
- Communication through our secure messaging

### Service Partners
- Payment processors (securely encrypted)
- Identity verification services
- Customer support tools

### Never Sold
❌ We NEVER sell your personal information to anyone
❌ We don't share data for marketing purposes
❌ Your private messages stay private

## 🔐 How We Protect You

### Security Measures
- **Encryption**: All data protected with bank-level security
- **Access Controls**: Only authorized staff can access data
- **Regular Audits**: Third-party security reviews
- **24/7 Monitoring**: Constant protection against threats

### Your Rights
- **See Your Data**: Access everything we have about you
- **Correct Mistakes**: Update any incorrect information
- **Delete Account**: Remove your data completely
- **Export Data**: Download your information anytime

## 🍪 Cookies & Tracking

### What Are Cookies?
Small files that help our website work better and remember your preferences.

### Types We Use
- **Essential**: Required for basic functions
- **Analytics**: Help us improve the platform
- **Preferences**: Remember your settings

### Your Control
You can manage cookies in your browser settings or through your account preferences.

## 📞 Contact Our Privacy Team

Have questions about your privacy? We're here to help!

- **Email**: privacy@serviceapp.com
- **Response Time**: Within 24 hours
- **Privacy Officer**: Available for complex questions

---

**Bottom Line**: We respect your privacy, use minimal data, and give you complete control over your information.`
        },
        cookies: {
          id: 'cookies_v1.2',
          title: 'Cookie Policy',
          type: 'cookies',
          last_updated: '2024-12-20T00:00:00Z',
          version: '1.2',
          icon: 'settings',
          color: '#3B82F6',
          description: 'How cookies improve your experience',
          summary: 'Simple explanation of how we use cookies to make our website work better for you.',
          content: `# Cookie Policy

**Last Updated: December 20, 2024**

## What Are Cookies? 🍪

Think of cookies as digital bookmarks that help our website remember you and your preferences. They make your experience smoother and more personalized.

## 🔧 How We Use Cookies

### Essential Cookies (Always On)
These are like the engine of a car - without them, our website won't work properly.

- **Login**: Keeps you signed in
- **Security**: Protects against hackers
- **Shopping Cart**: Remembers your bookings
- **Basic Functions**: Makes everything work

### Optional Cookies (Your Choice)
You can turn these on or off based on your preferences.

#### 📈 Analytics Cookies
- Help us understand what's working well
- Show us which features are most popular
- Help us fix problems faster
- Make the website better for everyone

#### 🎯 Marketing Cookies
- Show you relevant service recommendations
- Personalize your experience
- Measure how well our ads work
- Reduce irrelevant advertisements

## ⚙️ Managing Your Preferences

### Easy Controls
You have complete control over your cookie preferences:

#### In Your Browser
- **Chrome**: Settings → Privacy → Cookies
- **Safari**: Preferences → Privacy
- **Firefox**: Options → Privacy & Security
- **Edge**: Settings → Cookies and site permissions

#### In Your Account
- Visit your privacy settings
- Toggle cookie categories on/off
- Changes apply immediately
- No need to restart

### Mobile Apps
- **iOS**: Settings → Privacy & Security
- **Android**: Settings → Privacy
- **In-App**: Privacy settings in your profile

## 🌐 Third-Party Cookies

### Trusted Partners Only
We only work with reputable companies that follow strict privacy standards:

- **Google Analytics**: Helps us understand website usage
- **Stripe**: Processes payments securely
- **Intercom**: Powers our customer support chat

### Your Protection
- All partners must meet our privacy standards
- You can opt out of third-party cookies
- We regularly review all partnerships
- Your data is never sold to third parties

## 🔒 Your Privacy Rights

### Complete Control
- **Opt Out**: Disable any non-essential cookies
- **See Everything**: View all cookies on your device
- **Delete Anytime**: Clear cookies whenever you want
- **Ask Questions**: Contact us about any concerns

### International Standards
- **GDPR Compliant**: Meeting European privacy standards
- **CCPA Compliant**: Following California privacy laws
- **Regular Updates**: Keeping up with changing regulations

## 📞 Questions About Cookies?

### We're Here to Help
- **Email**: privacy@serviceapp.com
- **Live Chat**: Available 24/7
- **Help Center**: Step-by-step guides
- **Phone**: +64 9 123 4567

---

**Remember**: You're always in control. Use only the cookies that make sense for you, and change your preferences anytime.`
        },
        community: {
          id: 'community_v1.5',
          title: 'Community Guidelines',
          type: 'community',
          last_updated: '2025-01-05T00:00:00Z',
          version: '1.5',
          icon: 'people',
          color: '#F97316',
          description: 'How to be an awesome community member',
          summary: 'Simple guidelines for creating a positive, safe, and respectful environment for everyone.',
          content: `# Community Guidelines

**Last Updated: January 5, 2025**

## Building an Amazing Community Together 🌟

Our platform is more than just a marketplace - it's a community of real people helping each other. These guidelines help us all create a positive environment.

## ✨ What Makes Our Community Great

### 🤝 Respect & Kindness
- **Be Friendly**: A simple "hello" goes a long way
- **Stay Positive**: Focus on solutions, not problems
- **Celebrate Diversity**: Everyone is welcome here
- **Practice Patience**: We're all learning and growing

### 🎯 Trust & Honesty
- **Be Genuine**: Use real photos and honest descriptions
- **Keep Promises**: Do what you say you'll do
- **Communicate Clearly**: Avoid misunderstandings
- **Stay Transparent**: Be upfront about expectations

### 🛡️ Safety First
- **Trust Your Gut**: If something feels wrong, it probably is
- **Meet Safely**: Choose public places for initial meetings
- **Protect Privacy**: Don't share personal information too quickly
- **Report Issues**: Help us keep everyone safe

## 🌈 Expected Behavior

### For Everyone
- **Treat others how you'd want to be treated**
- **Respond to messages promptly and politely**
- **Give honest, helpful feedback**
- **Ask questions if you're unsure about anything**

### For Service Providers
- **Deliver what you promise**
- **Show up on time and prepared**
- **Keep your skills and profile updated**
- **Go the extra mile when possible**

### For Service Seekers
- **Provide clear, detailed requirements**
- **Be reasonable with expectations**
- **Pay fairly and on time**
- **Leave thoughtful reviews**

## 🚫 What We Don't Allow

### Absolutely Not Tolerated
- **Harassment or bullying** of any kind
- **Discrimination** based on any personal characteristics
- **Fake profiles, reviews, or information**
- **Unsafe or illegal activities**
- **Spam or excessive promotional messages**

### Consequences
We believe in second chances, but safety comes first:

1. **First Issue**: Friendly reminder and guidance
2. **Repeated Problems**: Temporary account restrictions
3. **Serious Violations**: Permanent account removal
4. **Illegal Activity**: Reported to authorities

## ⭐ Reviews & Ratings

### Writing Great Reviews
- **Be Specific**: What exactly did you like or dislike?
- **Be Fair**: Consider the full experience
- **Be Constructive**: Help others improve
- **Be Honest**: Share your genuine experience

### Review Guidelines
- Focus on the service, not personal characteristics
- Include both positives and areas for improvement
- Write soon after the service is completed
- Keep it relevant to the actual service provided

## 🆘 Getting Help

### If Something Goes Wrong
1. **Try Direct Communication**: Often issues can be resolved with a simple conversation
2. **Use Platform Mediation**: Our support team can help facilitate solutions
3. **Report Serious Issues**: Safety violations should be reported immediately
4. **Emergency**: Contact local authorities for immediate threats

### How to Report
- **In-App**: Use the report button on any profile or message
- **Email**: safety@serviceapp.com
- **Phone**: +64 9 123 4567
- **Live Chat**: Available 24/7 for urgent issues

## 🎉 Recognition & Rewards

### Outstanding Community Members
We love celebrating people who make our community awesome:

- **Featured Provider**: Highlighting exceptional service
- **Community Champion**: Recognizing helpful, positive members
- **Safety Hero**: Thanking those who help keep everyone safe
- **New Member Welcome**: Special recognition for great starts

## 💡 Tips for Success

### Building Trust
- **Complete Your Profile**: Full profiles get more bookings
- **Verify Your Identity**: Builds confidence with others
- **Collect Great Reviews**: Happy customers are your best marketing
- **Stay Active**: Regular engagement shows you're reliable

### Resolving Conflicts
- **Stay Calm**: Take a deep breath before responding
- **Listen First**: Try to understand the other person's perspective
- **Find Common Ground**: Look for mutually beneficial solutions
- **Ask for Help**: Our mediation team is here when needed

## 📞 Questions or Concerns?

### We're Always Here
- **Community Team**: community@serviceapp.com
- **General Support**: support@serviceapp.com
- **Safety Issues**: safety@serviceapp.com
- **Phone**: +64 9 123 4567

---

**Remember**: Every interaction you have shapes our community. Choose to make it positive, helpful, and welcoming for everyone! 🌟`
        },
        provider: {
          id: 'provider_v2.0',
          title: 'Provider Agreement',
          type: 'provider',
          last_updated: '2025-01-20T00:00:00Z',
          version: '2.0',
          icon: 'briefcase',
          color: '#8B5CF6',
          description: 'Everything you need to know as a service provider',
          summary: 'Comprehensive guide covering your rights, responsibilities, and opportunities as a service provider.',
          content: `# Provider Agreement

**Last Updated: January 20, 2025**

## Welcome to Our Provider Community! 🎉

Congratulations on joining our platform as a service provider! This agreement outlines everything you need to know to build a successful business with us.

## 🎯 Your Provider Journey

### 👨‍💼 Your Status
- **Independent Business Owner**: You're your own boss
- **Full Control**: Decide your rates, schedule, and services
- **Business Growth**: We provide tools to help you succeed
- **Support Network**: Join a community of successful providers

### 📈 Getting Started
1. **Complete Your Profile**: Showcase your skills and experience
2. **Get Verified**: Build trust with identity and skill verification
3. **Set Your Rates**: Price your services competitively
4. **Start Booking**: Begin connecting with customers

## 💼 Business Requirements

### 📋 Legal Basics
- **Age**: Must be 18 or older
- **Business Registration**: Obtain required licenses for your area
- **Insurance**: Professional liability coverage recommended
- **Taxes**: Handle your own tax obligations

### 🏆 Quality Standards
- **Professional Service**: Deliver what you promise
- **Timely Communication**: Respond within 24 hours
- **Skill Accuracy**: Only offer services you can deliver well
- **Continuous Improvement**: Keep learning and growing

## 💰 Earnings & Payments

### 💵 How You Get Paid
- **Platform Fee**: 15% of each completed job
- **Payment Timeline**: Funds available 2-3 business days after completion
- **Direct Deposit**: Money goes straight to your bank account
- **No Hidden Fees**: What you see is what you get

### 🎯 Maximizing Your Income
- **Quality Service**: Happy customers = repeat business
- **Great Reviews**: Build reputation for higher rates
- **Professional Photos**: Good presentation attracts more bookings
- **Premium Features**: Optional tools to boost visibility

## ⭐ Performance Metrics

### 📊 Key Indicators
- **Rating**: Maintain 4.0+ stars average
- **Response Rate**: Reply to 90%+ of messages within 24 hours
- **Completion Rate**: Finish 95%+ of accepted bookings
- **Reliability**: Keep cancellations under 5%

### 🎁 Rewards for Excellence
- **Top Provider Badge**: Recognition for outstanding service
- **Featured Listings**: Enhanced visibility in search results
- **Priority Support**: Faster customer service response
- **Early Access**: First to try new platform features

## 🛡️ Protection & Support

### 🔒 Your Safety
- **Secure Payments**: Never worry about getting paid
- **Identity Protection**: Your personal information stays private
- **Dispute Resolution**: Fair mediation for any conflicts
- **24/7 Support**: Help whenever you need it

### 📚 Resources for Success
- **Provider Academy**: Free training courses
- **Best Practices**: Learn from successful providers
- **Marketing Tools**: Professional templates and guides
- **Community Forum**: Connect with other providers

## 📱 Platform Tools

### 🛠️ Business Management
- **Booking Calendar**: Manage your schedule easily
- **Customer Communication**: Secure messaging system
- **Payment Tracking**: Real-time earnings dashboard
- **Performance Analytics**: Understand your business metrics

### 🚀 Growth Features
- **Portfolio Builder**: Showcase your best work
- **Service Packages**: Create bundled offerings
- **Promotional Tools**: Run special offers and discounts
- **Customer Reviews**: Build social proof

## 🤝 Customer Relations

### 💬 Communication Best Practices
- **Quick Responses**: Reply promptly to inquiries
- **Clear Expectations**: Explain your services thoroughly
- **Professional Tone**: Maintain courtesy in all interactions
- **Follow-Up**: Check in after service completion

### 🔄 Handling Issues
- **Stay Calm**: Professional demeanor in difficult situations
- **Listen First**: Understand the customer's perspective
- **Find Solutions**: Work together to resolve problems
- **Platform Support**: We're here to help when needed

## 📈 Growing Your Business

### 🎯 Success Strategies
- **Niche Expertise**: Specialize in specific service areas
- **Premium Positioning**: Justify higher rates with exceptional quality
- **Customer Retention**: Build lasting relationships
- **Referral Network**: Encourage satisfied customers to recommend you

### 💎 Premium Provider Program
Unlock advanced features with our premium membership:
- **Enhanced Profile**: Stand out with premium design
- **Priority Placement**: Appear higher in search results
- **Advanced Analytics**: Detailed business insights
- **Marketing Support**: Professional promotion assistance

## 📞 Support & Resources

### 🆘 When You Need Help
- **Provider Support**: providers@serviceapp.com
- **Technical Issues**: tech@serviceapp.com
- **Emergency Line**: +64 9 123 4567
- **Live Chat**: 24/7 instant support

### 📚 Learning Center
- **Video Tutorials**: Step-by-step guidance
- **Webinar Series**: Live training sessions
- **Success Stories**: Learn from top providers
- **Industry Updates**: Stay current with trends

## 🔄 Agreement Updates

### 📝 Staying Informed
- **Email Notifications**: Important changes sent directly
- **In-App Alerts**: Updates highlighted when you log in
- **Version History**: Access to all previous versions
- **Grace Period**: 30 days to review any major changes

---

## 🌟 Your Success is Our Success

We're committed to helping you build a thriving business on our platform. With the right tools, support, and community, there's no limit to what you can achieve.

**Ready to get started?** Contact our Provider Success team at providers@serviceapp.com for personalized onboarding assistance!`
        }
      };
    }
  };

  useEffect(() => {
    loadLegalDocuments();
  }, []);

  const loadLegalDocuments = async () => {
    try {
      const docs = await mockLegalAPI.getLegalDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading legal documents:', error);
      Alert.alert('Error', 'Failed to load legal documents');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleExportDocument = (document: LegalDocument) => {
    Alert.alert(
      'Export Document',
      `Export "${document.title}" as PDF for your records?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export PDF',
          onPress: () => {
            Alert.alert('✅ Exported!', 'Document saved to your downloads folder.');
          }
        }
      ]
    );
  };

  const handleContactLegal = async () => {
    Alert.alert(
      'Contact Legal Team',
      'How would you like to reach out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '📧 Email',
          onPress: async () => {
            try {
              await Linking.openURL('mailto:legal@serviceapp.com?subject=Legal Question');
            } catch (error) {
              Alert.alert('Email Not Available', 'Please contact legal@serviceapp.com');
            }
          }
        },
        {
          text: '📞 Call',
          onPress: async () => {
            try {
              await Linking.openURL('tel:+6491234567');
            } catch (error) {
              Alert.alert('Call Not Available', 'Please call +64 9 123 4567');
            }
          }
        }
      ]
    );
  };

  const getDocumentCards = () => {
    const baseCards = [
      { type: 'terms' as const, title: 'Terms of Service', icon: 'document-text', emoji: '📋' },
      { type: 'privacy' as const, title: 'Privacy Policy', icon: 'shield-checkmark', emoji: '🔒' },
      { type: 'cookies' as const, title: 'Cookie Policy', icon: 'settings', emoji: '🍪' },
      { type: 'community' as const, title: 'Community Guidelines', icon: 'people', emoji: '🤝' },
    ];

    if (accountType === 'provider') {
      baseCards.push({ type: 'provider' as const, title: 'Provider Agreement', icon: 'briefcase', emoji: '💼' });
    }

    return baseCards;
  };

  const renderDocumentCard = (card: any) => {
    const document = documents[card.type];
    if (!document) return null;

    return (
      <TouchableOpacity
        key={card.type}
        style={[styles.documentCard, { borderLeftColor: document.color }]}
        onPress={() => {
          setActiveDocument(card.type);
          setViewMode('detail');
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: document.color + '15' }]}>
            <Text style={styles.cardEmoji}>{card.emoji}</Text>
          </View>
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>v{document.version}</Text>
          </View>
        </View>
        
        <Text style={styles.cardTitle}>{document.title}</Text>
        <Text style={styles.cardDescription}>{document.summary}</Text>
        
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>Updated {formatDate(document.last_updated)}</Text>
          <Ionicons name="arrow-forward" size={16} color={document.color} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderMarkdownContent = (content: string) => {
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    
    lines.forEach((line, index) => {
      if (line.startsWith('# ')) {
        elements.push(
          <Text key={index} style={styles.heading1}>
            {line.substring(2)}
          </Text>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <Text key={index} style={styles.heading2}>
            {line.substring(3)}
          </Text>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <Text key={index} style={styles.heading3}>
            {line.substring(4)}
          </Text>
        );
      } else if (line.startsWith('**') && line.endsWith('**')) {
        elements.push(
          <Text key={index} style={styles.bold}>
            {line.substring(2, line.length - 2)}
          </Text>
        );
      } else if (line.startsWith('- ')) {
        elements.push(
          <View key={index} style={styles.listItemContainer}>
            <Text style={styles.listBullet}>•</Text>
            <Text style={styles.listItem}>
              {line.substring(2)}
            </Text>
          </View>
        );
      } else if (line.startsWith('---')) {
        elements.push(
          <View key={index} style={styles.divider} />
        );
      } else if (line.trim() === '') {
        elements.push(
          <View key={index} style={styles.spacing} />
        );
      } else {
        elements.push(
          <Text key={index} style={styles.paragraph}>
            {line}
          </Text>
        );
      }
    });
    
    return elements;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FEFCE8" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <Text style={styles.loadingEmoji}>📄</Text>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={styles.loadingText}>Loading Documents</Text>
            <Text style={styles.loadingSubtext}>Getting everything ready for you...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const documentCards = getDocumentCards();
  const currentDocument = documents[activeDocument];

  if (viewMode === 'detail' && currentDocument) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FEFCE8" />
        
        {/* Detail Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setViewMode('cards')}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          
          <View style={styles.detailHeaderInfo}>
            <Text style={styles.detailTitle}>{currentDocument.title}</Text>
            <Text style={styles.detailSubtitle}>Version {currentDocument.version}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => handleExportDocument(currentDocument)}
          >
            <Ionicons name="download-outline" size={20} color="#F59E0B" />
          </TouchableOpacity>
        </View>

        {/* Document Content */}
        <ScrollView 
          style={styles.detailContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.detailContentContainer}
        >
          <View style={styles.contentCard}>
            {renderMarkdownContent(currentDocument.content)}
          </View>
          
          <View style={styles.detailFooter}>
            <View style={styles.detailFooterCard}>
              <Text style={styles.footerTitle}>Need Help?</Text>
              <Text style={styles.footerDescription}>
                Our team is here to answer any questions about this document.
              </Text>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleContactLegal}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
                <Text style={styles.contactButtonText}>Contact Legal Team</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FEFCE8" />
      
      {/* Main Header */}
      <View style={styles.mainHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Legal Documents</Text>
          <Text style={styles.headerSubtitle}>
            Everything you need to know about using our platform safely and legally
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Text style={styles.headerEmoji}>⚖️</Text>
        </View>
      </View>

      {/* Document Cards */}
      <ScrollView
        style={styles.cardsList}
        contentContainerStyle={styles.cardsContainer}
        showsVerticalScrollIndicator={false}
      >
        {documentCards.map(card => renderDocumentCard(card))}
        
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={handleContactLegal}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="mail-outline" size={20} color="#F59E0B" />
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>Contact Legal Team</Text>
              <Text style={styles.quickActionDescription}>
                Questions about our policies? We're here to help!
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('HelpCenter')}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="help-circle-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>Help Center</Text>
              <Text style={styles.quickActionDescription}>
                Find answers to common questions and guides
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Trust & Safety */}
        <View style={styles.trustSection}>
          <View style={styles.trustHeader}>
            <Text style={styles.trustTitle}>🛡️ Your Trust & Safety</Text>
            <Text style={styles.trustDescription}>
              We're committed to maintaining the highest standards of transparency and user protection.
            </Text>
          </View>
          
          <View style={styles.trustFeatures}>
            <View style={styles.trustFeature}>
              <Text style={styles.trustFeatureIcon}>🔒</Text>
              <Text style={styles.trustFeatureText}>Bank-level encryption</Text>
            </View>
            <View style={styles.trustFeature}>
              <Text style={styles.trustFeatureIcon}>⚡</Text>
              <Text style={styles.trustFeatureText}>Regular updates</Text>
            </View>
            <View style={styles.trustFeature}>
              <Text style={styles.trustFeatureIcon}>📞</Text>
              <Text style={styles.trustFeatureText}>24/7 support</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFCE8',
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    minWidth: 280,
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
  },

  // Main Header Styles
  mainHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  headerIcon: {
    width: 60,
    height: 60,
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  headerEmoji: {
    fontSize: 30,
  },

  // Cards List Styles
  cardsList: {
    flex: 1,
  },
  cardsContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Detail View Styles
  detailHeader: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 16,
  },
  detailHeaderInfo: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  detailSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  exportButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  detailContent: {
    flex: 1,
  },
  detailContentContainer: {
    paddingBottom: 32,
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  // Content Styling
  heading1: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 16,
    lineHeight: 36,
  },
  heading2: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 12,
    lineHeight: 28,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 8,
    lineHeight: 24,
  },
  bold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginVertical: 6,
    lineHeight: 24,
  },
  paragraph: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
    marginVertical: 6,
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
    paddingLeft: 16,
  },
  listBullet: {
    fontSize: 16,
    color: '#F59E0B',
    fontWeight: '700',
    marginRight: 12,
    marginTop: 2,
  },
  listItem: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 24,
  },
  spacing: {
    height: 16,
  },

  // Quick Actions Styles
  quickActions: {
    marginTop: 24,
    marginBottom: 24,
  },
  quickActionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  quickActionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  quickActionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // Trust & Safety Styles
  trustSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  trustHeader: {
    marginBottom: 20,
  },
  trustTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  trustDescription: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  trustFeatures: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  trustFeature: {
    alignItems: 'center',
    flex: 1,
  },
  trustFeatureIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  trustFeatureText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },

  // Detail Footer Styles
  detailFooter: {
    margin: 16,
  },
  detailFooterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  footerDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default TermsConditionsScreen;