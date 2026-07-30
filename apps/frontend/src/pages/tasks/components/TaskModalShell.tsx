import { X as XMarkIcon } from 'lucide-react';
import React from "react";
;

import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { cn } from "../../../lib/utils";

const modalSizeClasses = {
  sm: "sm:max-w-xl",
  md: "sm:max-w-2xl",
  lg: "sm:max-w-4xl",
  xl: "sm:max-w-5xl",
} as const;

type TaskModalShellProps = {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  headerAside?: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof modalSizeClasses;
  bodyClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
};

type TaskModalSectionProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

type TaskModalFieldProps = {
  label: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

type TaskModalMetricProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
};

export const TaskModalShell: React.FC<TaskModalShellProps> = ({
  open,
  onClose,
  title,
  description,
  badge,
  headerAside,
  footer,
  size = "lg",
  bodyClassName,
  contentClassName,
  children,
}) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          "bottom-2 top-auto left-1/2 w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] -translate-x-1/2 -translate-y-0 rounded-[30px] border border-border/60 bg-[var(--app-panel-bg)] p-0 text-foreground shadow-[0_48px_140px_-72px_rgba(15,23,42,0.92)] sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2",
          modalSizeClasses[size],
          contentClassName,
        )}
      >
        <div className="relative overflow-hidden rounded-[inherit]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(47,107,255,0.18),transparent_28%),radial-gradient(circle_at_top_left,rgba(34,199,201,0.12),transparent_24%)]" />

          <div className="relative">
            <DialogHeader className="gap-4 border-b border-border/60 px-4 py-4 sm:px-6 sm:py-5 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 space-y-3">
                {badge ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {badge}
                  </div>
                ) : null}

                <div className="space-y-1">
                  <DialogTitle className="text-lg font-semibold tracking-tight text-foreground sm:text-[1.35rem]">
                    {title}
                  </DialogTitle>
                  {description ? (
                    <DialogDescription className="max-w-3xl text-sm leading-6 text-muted-foreground">
                      {description}
                    </DialogDescription>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2 md:shrink-0">
                {headerAside}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full text-muted-foreground hover:text-foreground"
                  onClick={onClose}
                >
                  <XMarkIcon className="size-4" />
                </Button>
              </div>
            </DialogHeader>

            <div
              className={cn(
                "max-h-[min(72svh,780px)] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5",
                bodyClassName,
              )}
            >
              {children}
            </div>

            {footer ? (
              <div className="border-t border-border/60 bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const TaskModalSection: React.FC<TaskModalSectionProps> = ({
  title,
  description,
  actions,
  className,
  children,
}) => {
  return (
    <section
      className={cn(
        "rounded-[24px] border border-border/60 bg-background/65 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5",
        className,
      )}
    >
      {title || description || actions ? (
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            {title ? (
              <h3 className="text-sm font-semibold text-foreground sm:text-base">
                {title}
              </h3>
            ) : null}
            {description ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          {actions ? <div className="md:shrink-0">{actions}</div> : null}
        </div>
      ) : null}

      {children}
    </section>
  );
};

export const TaskModalField: React.FC<TaskModalFieldProps> = ({
  label,
  hint,
  required = false,
  className,
  children,
}) => {
  return (
    <label className={cn("grid gap-2", className)}>
      <span className="text-xs font-semibold tracking-[0.02em] text-muted-foreground">
        {label}
        {required ? <span className="text-primary"> *</span> : null}
      </span>
      {children}
      {hint ? (
        <span className="text-xs leading-5 text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
};

export const TaskModalMetric: React.FC<TaskModalMetricProps> = ({
  label,
  value,
  className,
}) => {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-border/60 bg-background/60 p-4",
        className,
      )}
    >
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
};
