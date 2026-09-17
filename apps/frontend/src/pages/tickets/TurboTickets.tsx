import React, { Component, ErrorInfo, ReactNode } from "react";
import { ArrowPathIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
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
    console.error("❌ [TURBO-TICKETS] Uncaught error in TurboTickets Cockpit:", error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full min-h-[400px] flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 text-center">
          <div className="max-w-md w-full p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <ExclamationTriangleIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                حدث خطأ غير متوقع في منصة التذاكر
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                تم عزل الخطأ لمنع تأثر باقي لوحة التحكم. اضغط على الزر بالأسفل لإعادة تحميل الصفحة.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold transition active:scale-97"
              >
                <ArrowPathIcon className="h-4 w-4" />
                <span>إعادة تحميل التذاكر</span>
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
