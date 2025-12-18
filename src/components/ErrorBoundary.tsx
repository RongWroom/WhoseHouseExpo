/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the app
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react-native';
import { Text, Button, Card, CardContent } from './ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to console in development
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, you would send this to an error reporting service
    // Example: Sentry.captureException(error);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <SafeAreaView className="flex-1 bg-gray-50">
          <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
            <View className="flex-1 p-6 items-center justify-center">
              {/* Error Icon */}
              <View className="w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-6">
                <AlertTriangle size={40} color="#DC2626" />
              </View>

              {/* Error Message */}
              <Text variant="h2" weight="bold" className="text-center mb-2">
                Something went wrong
              </Text>
              <Text variant="body" color="muted" className="text-center mb-8 px-4">
                We're sorry, but something unexpected happened. Please try again or contact support
                if the problem persists.
              </Text>

              {/* Action Buttons */}
              <View className="w-full max-w-xs gap-3">
                <Button onPress={this.handleRetry} size="lg" className="bg-blue-500">
                  <View className="flex-row items-center">
                    <RefreshCw size={20} color="white" />
                    <Text className="ml-2 text-white font-semibold">Try Again</Text>
                  </View>
                </Button>

                <Button
                  variant="outline"
                  onPress={() => {
                    // Navigate to home - in real app would use router
                    this.handleRetry();
                  }}
                  size="lg"
                >
                  <View className="flex-row items-center">
                    <Home size={20} color="#374151" />
                    <Text className="ml-2 text-gray-700 font-semibold">Go Home</Text>
                  </View>
                </Button>
              </View>

              {/* Error Details (Development Only) */}
              {__DEV__ && (
                <View className="w-full mt-8">
                  <TouchableOpacity
                    onPress={this.toggleDetails}
                    className="flex-row items-center justify-center py-2"
                  >
                    <Bug size={16} color="#6B7280" />
                    <Text variant="caption" color="muted" className="ml-2">
                      {this.state.showDetails ? 'Hide' : 'Show'} Technical Details
                    </Text>
                  </TouchableOpacity>

                  {this.state.showDetails && (
                    <Card variant="elevated" className="mt-4">
                      <CardContent>
                        <Text variant="caption" weight="semibold" className="text-red-600 mb-2">
                          Error: {this.state.error?.name}
                        </Text>
                        <Text variant="caption" color="muted" className="mb-4">
                          {this.state.error?.message}
                        </Text>

                        <Text variant="caption" weight="semibold" className="mb-2">
                          Stack Trace:
                        </Text>
                        <ScrollView
                          horizontal
                          className="bg-gray-900 rounded-lg p-3"
                          showsHorizontalScrollIndicator={false}
                        >
                          <Text variant="caption" className="text-green-400 font-mono text-xs">
                            {this.state.error?.stack?.substring(0, 500)}...
                          </Text>
                        </ScrollView>

                        {this.state.errorInfo?.componentStack && (
                          <>
                            <Text variant="caption" weight="semibold" className="mt-4 mb-2">
                              Component Stack:
                            </Text>
                            <ScrollView
                              horizontal
                              className="bg-gray-900 rounded-lg p-3"
                              showsHorizontalScrollIndicator={false}
                            >
                              <Text variant="caption" className="text-yellow-400 font-mono text-xs">
                                {this.state.errorInfo.componentStack.substring(0, 500)}...
                              </Text>
                            </ScrollView>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for functional components to trigger error boundary
 * Usage: throw new Error('Something went wrong') in useEffect or event handler
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  if (error) {
    throw error;
  }

  return {
    showError: (error: Error) => setError(error),
    clearError: () => setError(null),
  };
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void,
) {
  const WithErrorBoundary = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `WithErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithErrorBoundary;
}
