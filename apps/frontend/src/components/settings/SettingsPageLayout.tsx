import React from "react";
import { ArrowPathIcon, CheckIcon } from "@heroicons/react/24/outline";

interface SettingsPageLayoutProps {
    title: string;
    description?: string;
    loading: boolean;
    saving: boolean;
    onSave: () => void;
    onReset: () => void;
    children: React.ReactNode;
    fullWidth?: boolean;
}

export const SettingsPageLayout: React.FC<SettingsPageLayoutProps> = ({
    title,
    description,
    loading,
    saving,
    onSave,
    onReset,
    children,
    fullWidth = false,
}) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {title}
                    </h2>
                    {description && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {description}
                        </p>
                    )}
                </div>
                <div className="flex items-center space-x-3 space-x-reverse">
                    <button
                        onClick={onReset}
                        disabled={saving}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                    >
                        <ArrowPathIcon className="h-4 w-4 ml-2" />
                        إعادة تعيين
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 shadow-sm transition-all shadow-indigo-200 dark:shadow-none"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                                جاري الحفظ...
                            </>
                        ) : (
                            <>
                                <CheckIcon className="h-4 w-4 ml-2" />
                                حفظ التغييرات
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className={fullWidth ? "w-full" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
                {children}
            </div>
        </div>
    );
};
