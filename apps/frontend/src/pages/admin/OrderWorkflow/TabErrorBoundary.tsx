import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
    children: React.ReactNode;
    tabLabel: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class TabErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error(`[TabErrorBoundary] Error in tab "${this.props.tabLabel}":`, error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-12 text-center">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-3xl p-8 inline-block">
                        <ExclamationTriangleIcon className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-amber-800 dark:text-amber-300 mb-2">حدث خطأ غير متوقع</h3>
                        <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
                            فشل تحميل تبويب "{this.props.tabLabel}". يرجى تحديث الصفحة أو المحاولة مرة أخرى.
                        </p>
                        <button
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="px-6 py-2 bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-xl font-bold hover:bg-amber-200 transition"
                        >
                            إعادة المحاولة
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default TabErrorBoundary;
