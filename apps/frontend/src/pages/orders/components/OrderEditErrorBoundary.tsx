import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class OrderEditErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Order Edit Error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-xl border border-border/70 bg-card text-card-foreground shadow-xl p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-destructive/10 text-destructive rounded-xl border border-destructive/20 mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h2 className="text-base sm:text-lg font-bold text-foreground">
              حدث خطأ غير متوقع
            </h2>

            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              عذراً، حدث خطأ أثناء تحميل بيانات الطلب. يرجى المحاولة مرة أخرى.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mt-3 p-2.5 bg-destructive/5 border border-destructive/20 rounded-lg text-start">
                <p className="text-[11px] font-mono tabular-nums text-destructive break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-xs font-semibold shadow-xs transition active:scale-[0.97]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>إعادة المحاولة</span>
              </button>
              <button
                type="button"
                onClick={() => window.history.back()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-border/70 bg-background text-foreground rounded-lg hover:bg-muted text-xs font-semibold transition active:scale-[0.97]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>رجوع</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default OrderEditErrorBoundary;
