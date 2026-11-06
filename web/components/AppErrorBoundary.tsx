import React from 'react';
import { reportClientError } from '../services/playerEvents';

interface AppErrorBoundaryState {
  hasError: boolean;
}

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  declare readonly props: Readonly<AppErrorBoundaryProps>;
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    reportClientError(error, 'react');
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-[32px] border border-slate-200 shadow-sm p-10 text-center space-y-4">
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Something went wrong</h1>
          <p className="text-sm font-medium text-slate-500">
            We hit an unexpected problem. Reloading usually fixes it, and our team has been notified.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-8 py-3.5 rounded-2xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest hover:bg-blue-600"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
