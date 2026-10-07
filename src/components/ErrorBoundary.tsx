import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error in UI:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#090a0f] text-zinc-100 p-6">
          <div className="max-w-md w-full text-center space-y-5 p-8 rounded-2xl bg-[#121420] border border-white/10 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 mx-auto flex items-center justify-center text-purple-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-display font-semibold text-white">Something went wrong</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              The page encountered an unexpected issue while loading. Please tap reload to refresh.
            </p>
            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-red-300 text-xs font-mono text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={this.handleReload}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Reload Page
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem("portfolio_active_conv_id");
                    localStorage.removeItem("portfolio_chat_messages");
                  } catch (_) {}
                  this.setState({ hasError: false, error: null });
                }}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Reset & Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
