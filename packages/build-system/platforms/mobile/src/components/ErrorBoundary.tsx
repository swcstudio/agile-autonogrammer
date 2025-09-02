/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Platform } from '../index';

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  enableRetry?: boolean;
  maxRetries?: number;
  isolate?: boolean;
  level?: 'page' | 'component' | 'feature';
  className?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const eventId = this.logError(error, errorInfo);

    this.setState({
      errorInfo,
      eventId,
    });

    this.props.onError?.(error, errorInfo);
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach((timeout) => clearTimeout(timeout));
  }

  private logError(error: Error, errorInfo: ErrorInfo): string {
    const eventId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const errorReport = {
      eventId,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      url: typeof window !== 'undefined' ? window.location.href : null,
      retryCount: this.retryCount,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 React Error Boundary');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.log('Error Report:', errorReport);
      console.groupEnd();
    }

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      this.reportError(errorReport);
    }

    return eventId;
  }

  private async reportError(errorReport: any) {
    try {
      // Example: Send to error reporting service
      if (typeof window !== 'undefined' && window.fetch) {
        await fetch('/api/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(errorReport),
        });
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  private handleRetry = () => {
    const { maxRetries = 3, onRetry } = this.props;

    if (this.retryCount >= maxRetries) {
      console.warn(`Maximum retry attempts (${maxRetries}) reached`);
      return;
    }

    this.retryCount += 1;

    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    });

    onRetry?.();

    // Add exponential backoff for retries
    const retryDelay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 10000);
    const timeout = setTimeout(() => {
      // Force re-render after delay
      this.forceUpdate();
    }, retryDelay);

    this.retryTimeouts.push(timeout);
  };

  private renderFallback(): ReactNode {
    const { fallback, enableRetry = true, level = 'component' } = this.props;
    const { error, errorInfo } = this.state;

    if (fallback) {
      if (typeof fallback === 'function' && error && errorInfo) {
        return fallback(error, errorInfo, this.handleRetry);
      }
      return fallback;
    }

    return this.renderDefaultFallback();
  }

  private renderDefaultFallback(): ReactNode {
    const { error, eventId } = this.state;
    const { enableRetry = true, maxRetries = 3, level = 'component' } = this.props;

    const canRetry = enableRetry && this.retryCount < maxRetries;
    const isPageLevel = level === 'page';

    return (
      <div
        className={`error-boundary ${isPageLevel ? 'min-h-screen' : 'min-h-32'} flex items-center justify-center p-4`}
        role="alert"
      >
        <div className="max-w-md w-full bg-white border border-red-200 rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-red-50 px-6 py-4 border-b border-red-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">💥</span>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-800">
                  {isPageLevel ? 'Application Error' : 'Component Error'}
                </h3>
                <p className="text-sm text-red-600">
                  Something went wrong while{' '}
                  {isPageLevel ? 'loading the page' : 'rendering this component'}
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            {error && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Error Details:</h4>
                <div className="bg-gray-50 rounded-md p-3">
                  <p className="text-sm text-gray-700 font-mono break-all">{error.message}</p>
                </div>
              </div>
            )}

            {eventId && (
              <div className="mb-4">
                <p className="text-xs text-gray-500">
                  Error ID: <code className="bg-gray-100 px-1 rounded">{eventId}</code>
                </p>
              </div>
            )}

            {this.retryCount > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500">
                  Retry attempts: {this.retryCount} / {maxRetries}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Reload Page
              </button>

              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { hasError } = this.state;
    const { children, className, isolate = false } = this.props;

    if (hasError) {
      const fallbackContent = this.renderFallback();

      // If isolate is true, render fallback in an isolated container
      if (isolate) {
        return (
          <div className={`error-boundary-isolation ${className || ''}`}>{fallbackContent}</div>
        );
      }

      return fallbackContent;
    }

    return children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for error boundary functionality in functional components
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: ErrorInfo) => {
    // In a real implementation, you might want to use a context
    // or a global error handler here
    throw error;
  }, []);
}

// Async error boundary for handling Promise rejections
export class AsyncErrorBoundary extends ErrorBoundary {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();

    if (typeof window !== 'undefined') {
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    }
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

    this.componentDidCatch(error, {
      componentStack: 'Unhandled Promise Rejection',
    });
  };
}
