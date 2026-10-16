import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryIcon?: LucideIcon;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryIcon: SecondaryIcon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/40 p-8 sm:p-12 text-center text-foreground select-none">
      <div className="size-12 mb-4 rounded-xl bg-muted/60 text-muted-foreground flex items-center justify-center shadow-2xs">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground mb-5 max-w-md leading-relaxed">
        {description}
      </p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex items-center gap-2.5 flex-wrap justify-center">
          {actionLabel && onAction && (
            <Button
              onClick={onAction}
              size="sm"
              className="rounded-lg h-9 px-4 text-xs font-semibold shadow-2xs active:scale-[0.98]"
            >
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSecondaryAction}
              className="rounded-lg h-9 px-4 text-xs border-border/70 text-foreground hover:bg-muted active:scale-[0.98]"
            >
              {SecondaryIcon && <SecondaryIcon className="size-3.5 ml-1.5" />}
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
