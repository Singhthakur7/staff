import React from 'react';
import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, FirestoreErrorInfo } from '../firebase';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  parsedInfo: FirestoreErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      parsedInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let parsedInfo: FirestoreErrorInfo | null = null;
    try {
      const parsed = JSON.parse(error.message) as FirestoreErrorInfo;
      if (parsed && typeof parsed === 'object' && 'operationType' in parsed) {
        parsedInfo = parsed;
      }
    } catch {
      // Standard non-JSON runtime error
    }

    return {
      hasError: true,
      errorMessage: parsedInfo ? parsedInfo.error : error.message || 'Unexpected application error.',
      parsedInfo,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleSignOutAndReload = async () => {
    try {
      await signOut(auth);
      window.sessionStorage.clear();
    } catch {
      // Ignore signout errors during recovery
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isPermissionError =
      this.state.errorMessage.toLowerCase().includes('permission') ||
      this.state.errorMessage.toLowerCase().includes('insufficient');

    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-5">
        <div className="bg-white border border-red-200 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-lg space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold text-[#0B1120]">
                {isPermissionError
                  ? 'Access Permission Denied'
                  : 'Something Went Wrong'}
              </h1>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {isPermissionError
                  ? 'Your current Google account does not have permission for this workspace operation, or your company access has been changed.'
                  : 'An unexpected error occurred while synchronizing with Cloud Firestore.'}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-mono text-slate-700 break-words space-y-1">
            <p className="font-semibold text-[#DC2626]">{this.state.errorMessage}</p>
            {this.state.parsedInfo?.path && (
              <p className="text-slate-500">
                Path: {this.state.parsedInfo.path} ({this.state.parsedInfo.operationType})
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={this.handleReload}
              className="min-h-[44px] px-4 rounded-xl bg-[#0B1120] hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
            <button
              type="button"
              onClick={this.handleSignOutAndReload}
              className="min-h-[44px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out &amp; Reset
            </button>
          </div>
        </div>
      </div>
    );
  }
}
