import React from "react";

const joinClasses = (...classes: Array<string | undefined | null | false>): string =>
    classes.filter(Boolean).join(" ");

interface SettingsSectionProps {
    title: string;
    icon: React.ComponentType<any>;
    enabled?: boolean;
    onToggle?: (enabled: boolean) => void;
    children: React.ReactNode;
    className?: string;
    headerClassName?: string;
    titleClassName?: string;
    iconClassName?: string;
    contentClassName?: string;
    helperText?: string;
    badgeText?: string;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
    title,
    icon: Icon,
    enabled,
    onToggle,
    children,
    className,
    headerClassName,
    titleClassName,
    iconClassName,
    contentClassName,
    helperText,
    badgeText,
}) => {
    const hasToggle = onToggle !== undefined && enabled !== undefined;
    const isContentVisible = hasToggle ? enabled : true;

    return (
        <div
            className={joinClasses(
                "rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md",
                className,
            )}
        >
            <div className={joinClasses("mb-6 flex items-center justify-between", headerClassName)}>
                <div className="flex items-start gap-3">
                    <Icon
                        className={joinClasses(
                            "mt-0.5 h-6 w-6 text-primary",
                            iconClassName,
                        )}
                    />
                    <div>
                        <div className="flex items-center gap-2">
                            <h3
                                className={joinClasses(
                                    "text-lg font-semibold text-foreground",
                                    titleClassName,
                                )}
                            >
                                {title}
                            </h3>
                            {badgeText ? (
                                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {badgeText}
                                </span>
                            ) : null}
                        </div>
                        {helperText ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                                {helperText}
                            </p>
                        ) : null}
                    </div>
                </div>
                {hasToggle && (
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => onToggle(e.target.checked)}
                            className="sr-only peer"
                        />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                )}
            </div>
            <div
                className={joinClasses(
                    "space-y-4",
                    isContentVisible ? "" : "pointer-events-none opacity-50",
                    contentClassName,
                )}
            >
                {children}
            </div>
        </div>
    );
};
