/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert, X } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Error Boundary as a class component (required for error boundaries)
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const error = this.state.error;
      const errorMessage = error?.message || 'Ein unbekannter Fehler ist aufgetreten';
      const errorStack = error?.stack || 'Keine Stack-Trace verfügbar';

      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[300px] bg-void-panel/95 border border-neon-red/30 rounded-xl backdrop-blur-xl shadow-[0_0_30px_rgba(239,68,68,0.15)]">
          <div className="flex flex-col items-center text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-neon-red/10 border border-neon-red/30 flex items-center justify-center mb-4 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <ShieldAlert className="w-8 h-8 text-neon-red" />
            </div>
            
            <h2 className="font-display font-bold text-lg text-white mb-2">
              Komponenten-Fehler erkannt
            </h2>
            
            <p className="font-sans text-sm text-gray-300 mb-4">
              Eine Komponente hat einen Fehler verursacht. Das System ist weiterhin funktionsfähig.
            </p>

            <details className="w-full mb-4 text-left bg-cosmic-bg/50 border border-white/10 rounded-lg p-3 overflow-hidden">
              <summary className="font-mono text-xs text-neon-cyan cursor-pointer select-none flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Technische Details (für Debugging)
              </summary>
              <div className="mt-2 font-mono text-[10px] text-gray-400 whitespace-pre-wrap overflow-x-auto">
                <strong className="text-neon-red">Fehler:</strong> {errorMessage}
                <br />
                <strong className="text-neon-cyan">Stack:</strong> {errorStack}
              </div>
            </details>

            <div className="flex flex-wrap gap-3 justify-center w-full">
              <button
                onClick={this.handleRetry}
                className="flex-1 min-w-[140px] px-4 py-2 bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan text-neon-cyan text-xs font-mono rounded-lg transition-all duration-300 shadow-[0_0_10px_rgba(0,240,255,0.15)] hover:shadow-[0_0_15px_rgba(0,240,255,0.35)] cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 inline mr-1" />
                Erneut versuchen
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="flex-1 min-w-[140px] px-4 py-2 bg-neon-magenta/10 hover:bg-neon-magenta/20 border border-neon-magenta text-neon-magenta text-xs font-mono rounded-lg transition-all duration-300 shadow-[0_0_10px_rgba(255,0,127,0.15)] hover:shadow-[0_0_15px_rgba(255,0,127,0.35)] cursor-pointer"
              >
                Seite neu laden
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundary for critical live-performance components
export class CriticalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('CRITICAL ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Log to system for live performance monitoring
    if (typeof window !== 'undefined' && (window as any).addLog) {
      (window as any).addLog('SYSTEM', 'error', `[CRITICAL] ${error.message}`);
    }
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleEmergencyReset = (): void => {
    // Attempt to reset only this boundary
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-neon-red/5 border-2 border-neon-red/50 rounded-xl animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.3)]">
          <div className="flex flex-col items-center text-center">
            <ShieldAlert className="w-10 h-10 text-neon-red mb-2 animate-bounce" />
            <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-1">
              KRITISCHER FEHLER
            </h3>
            <p className="font-mono text-[10px] text-neon-red/80 mb-3 max-w-xs text-center">
              {this.state.error?.message || 'Systemintegrität gefährdet'}
            </p>
            <button
              onClick={this.handleEmergencyReset}
              className="px-3 py-1 bg-neon-red/20 hover:bg-neon-red/30 border border-neon-red text-neon-red text-[10px] font-mono rounded transition-all duration-200 cursor-pointer"
            >
              NOTFALL-RESET
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;