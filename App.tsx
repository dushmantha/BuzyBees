import React, { useEffect } from 'react';
import { StatusBar, LogBox, Text, View, StyleSheet } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

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
    return () => console.log('App unmounted');
  }, []);

  try {
    return (
      <ErrorBoundary>
        <AuthProvider>
          <SafeAreaProvider 
            initialMetrics={initialWindowMetrics}
            style={styles.safeArea}
          >
            <StatusBar 
              barStyle="dark-content" 
              backgroundColor="transparent" 
              translucent
            />
            <AppNavigator />
          </SafeAreaProvider>
        </AuthProvider>
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
