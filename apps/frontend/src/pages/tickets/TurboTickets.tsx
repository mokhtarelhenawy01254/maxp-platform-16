import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { TurboTicketsCockpit } from "./turbo/TurboTicketsCockpit";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class TurboErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[TURBO-TICKETS] Uncaught error in TurboTickets Cockpit:", error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full min-h-[400px] flex flex-col items-center justify-center p-6 bg-background text-center font-sans">
          <div className="max-w-md w-full p-6 sm:p-7 rounded-2xl border border-border/80 bg-card shadow-xl space-y-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-xs">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">
                حدث خطأ غير متوقع في منصة تذاكر تربو
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                تم عزل الخطأ لضمان استقرار باقي شاشات لوحة التحكم. اضغط على الزر أدناه لإعادة تحميل التذاكر بأمان.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition active:scale-97 shadow-sm"
              >
                <RotateCcw className="h-4 w-4" />
                <span>إعادة تحميل منصة التذاكر</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const TurboTickets: React.FC = () => {
  return (
    <TurboErrorBoundary>
      <TurboTicketsCockpit />
    </TurboErrorBoundary>
  );
};

export default TurboTickets;
