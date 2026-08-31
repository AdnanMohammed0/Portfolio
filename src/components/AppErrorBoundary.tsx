import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Last line of defence: a render crash shows a recovery screen, not a blank page. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="liquid-glass max-w-md rounded-2xl p-8 text-center">
          <p className="label-xs">Something broke</p>
          <h1 className="mt-4 text-2xl tracking-tight">This page failed to load.</h1>
          <p className="mt-3 text-sm text-white/45">{error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-primary mt-7"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
