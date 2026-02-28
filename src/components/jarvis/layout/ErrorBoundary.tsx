'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/jarvis/primitives';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Render crash caught:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mb-4" />
          <h2 className="text-lg font-semibold text-white/90 mb-2">
            Something went wrong
          </h2>
          {this.state.error && (
            <p className="text-xs text-white/30 font-mono max-w-md mb-6 break-words">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" size="md" onClick={this.handleRetry}>
              Try Again
            </Button>
            <Button variant="primary" size="md" onClick={this.handleReload}>
              Reload Jarvis
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
