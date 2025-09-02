import { QueryErrorResetBoundary } from '@tanstack/react-query';
import type React from 'react';
import { type ReactNode, Suspense } from 'react';
import { ErrorBoundary, type ErrorBoundaryPropsWithFallback } from 'react-error-boundary';

export interface QueryBoundaryProps {
  children: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: ErrorBoundaryPropsWithFallback['FallbackComponent'];
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  onReset?: () => void;
  resetKeys?: Array<string | number>;
  showErrorDetails?: boolean;
}

const DefaultLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const DefaultErrorFallback: ErrorBoundaryPropsWithFallback['FallbackComponent'] = ({
  error,
  resetErrorBoundary,
}) => (
  <div className="flex items-center justify-center min-h-[200px] p-4">
    <div className="max-w-md w-full bg-destructive/10 border border-destructive/20 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-destructive mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mb-4">
        {error.message || 'An unexpected error occurred'}
      </p>
      {process.env.NODE_ENV === 'development' && (
        <details className="mb-4">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Error Details
          </summary>
          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">{error.stack}</pre>
        </details>
      )}
      <button
        onClick={resetErrorBoundary}
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  </div>
);

export const QueryBoundary: React.FC<QueryBoundaryProps> = ({
  children,
  loadingFallback = <DefaultLoadingFallback />,
  errorFallback = DefaultErrorFallback,
  onError,
  onReset,
  resetKeys = [],
  showErrorDetails = process.env.NODE_ENV === 'development',
}) => {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          FallbackComponent={errorFallback}
          onError={onError}
          onReset={() => {
            reset();
            onReset?.();
          }}
          resetKeys={resetKeys}
        >
          <Suspense fallback={loadingFallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};

// Specialized boundaries for different use cases
export const AsyncBoundary: React.FC<{
  children: ReactNode;
  loadingText?: string;
  errorTitle?: string;
}> = ({ children, loadingText = 'Loading...', errorTitle = 'Error' }) => {
  return (
    <QueryBoundary
      loadingFallback={
        <div className="animate-pulse p-4 text-center text-muted-foreground">{loadingText}</div>
      }
      errorFallback={({ error, resetErrorBoundary }) => (
        <div className="p-4 text-center">
          <p className="text-destructive font-medium">{errorTitle}</p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          <button
            onClick={resetErrorBoundary}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      )}
    >
      {children}
    </QueryBoundary>
  );
};

// List-specific boundary with skeleton loading
export const ListBoundary: React.FC<{
  children: ReactNode;
  skeletonCount?: number;
  skeletonHeight?: string;
}> = ({ children, skeletonCount = 3, skeletonHeight = 'h-20' }) => {
  return (
    <QueryBoundary
      loadingFallback={
        <div className="space-y-2">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div key={i} className={`animate-pulse bg-muted rounded-md ${skeletonHeight}`} />
          ))}
        </div>
      }
    >
      {children}
    </QueryBoundary>
  );
};

// Modal-specific boundary
export const ModalBoundary: React.FC<{
  children: ReactNode;
  onError?: () => void;
}> = ({ children, onError }) => {
  return (
    <QueryBoundary
      loadingFallback={
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
      errorFallback={({ error, resetErrorBoundary }) => (
        <div className="p-6 text-center">
          <p className="text-destructive mb-2">Failed to load</p>
          <button
            onClick={() => {
              resetErrorBoundary();
              onError?.();
            }}
            className="text-sm text-primary hover:underline"
          >
            Close and try again
          </button>
        </div>
      )}
    >
      {children}
    </QueryBoundary>
  );
};
