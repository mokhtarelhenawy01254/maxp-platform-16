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
        "rounded-xl border border-border/70 bg-card p-5 shadow-xs transition-all text-foreground",
        className,
      )}
    >
      <div
        className={joinClasses(
          "mb-4 pb-3 flex items-start justify-between gap-3 border-b border-border/50",
          headerClassName,
        )}
      >
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
            <Icon
              className={joinClasses(
                "w-4 h-4",
                iconClassName,
              )}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3
                className={joinClasses(
                  "text-sm font-semibold text-foreground tracking-tight",
                  titleClassName,
                )}
              >
                {title}
              </h3>
              {badgeText ? (
                <span className="inline-flex items-center rounded-full bg-muted/60 border border-border/50 px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wide text-muted-foreground">
                  {badgeText}
                </span>
              ) : null}
            </div>
            {helperText ? (
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                {helperText}
              </p>
            ) : null}
          </div>
        </div>

        {hasToggle && (
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </label>
        )}
      </div>

      <div
        className={joinClasses(
          "space-y-3.5",
          isContentVisible ? "" : "pointer-events-none opacity-50",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default SettingsSection;
