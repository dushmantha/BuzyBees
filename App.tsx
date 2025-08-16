import React, { useEffect } from 'react';
import { StatusBar, LogBox, Text, View, StyleSheet } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
// AuthProvider is now handled in AppNavigator
import { PremiumProvider } from './src/contexts/PremiumContext';
import AppNavigator from './src/navigation/AppNavigator';
import integratedShopService from './src/lib/supabase/integrated';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

// Navigation theme
const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#ffffff',
  },
};

// Error boundary component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error in App:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong. Please restart the app.</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

function App(): React.JSX.Element {
  useEffect(() => {
    console.log('App mounted');
    
    // Initialize integrated shop service schema
    const initializeDatabase = async () => {
      try {
        console.log('🚀 Initializing integrated shop service...');
        const result = await integratedShopService.initializeSchema();
        
        if (result.success) {
          console.log('✅ Integrated shop service initialized successfully');
        } else {
          console.warn('⚠️ Integrated shop service initialization had issues:', result.error);
        }
      } catch (error) {
        console.error('❌ Failed to initialize integrated shop service:', error);
      }
    };
    
    // Initialize after a small delay to let the app load
    setTimeout(initializeDatabase, 2000);
    
    return () => console.log('App unmounted');
  }, []);

  try {
    return (
      <ErrorBoundary>
        <PremiumProvider>
          <SafeAreaProvider 
            initialMetrics={initialWindowMetrics}
            style={styles.safeArea}
          >
            <NavigationContainer theme={MyTheme}>
              <StatusBar 
                barStyle="dark-content" 
                backgroundColor="transparent" 
                translucent
              />
              <AppNavigator />
            </NavigationContainer>
          </SafeAreaProvider>
        </PremiumProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('Error in App render:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load the app. Please restart.</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff0000',
    textAlign: 'center',
  },
});

export default App;