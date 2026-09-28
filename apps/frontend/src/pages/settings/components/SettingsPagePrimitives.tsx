import React from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getDirection } from "../../../i18n";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type SettingsStatusMessage = {
  type: "success" | "error";
  text: string;
};

export function SettingsLoadingState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      dir={getDirection()}
      className="flex min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-slate-200/70 bg-white/80 px-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none"
    >
      <div className="flex size-16 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-300">
        <Loader2 className="size-8 animate-spin" />
      </div>
      <p className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

export function SettingsStatusAlert({
  message,
  onDismiss,
}: {
  message: SettingsStatusMessage | null;
  onDismiss?: () => void;
}) {
  const { t } = useTranslation();
  if (!message) {
    return null;
  }

  return (
    <Alert
      className={cn(
        "border px-4 py-3",
        message.type === "success"
          ? "border-emerald-200 bg-emerald-50/90 text-emerald-950 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-200"
          : "border-rose-200 bg-rose-50/90 text-rose-950 dark:border-rose-800/80 dark:bg-rose-950/40 dark:text-rose-200",
      )}
    >
      <div className="flex items-start gap-3">
        {message.type === "success" ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-600 dark:text-rose-400" />
        )}
        <div className="flex-1">
          <AlertTitle className="text-sm font-semibold">
            {message.type === "success" ? t("settingsPrimitives.alertSuccess") : t("settingsPrimitives.alertError")}
          </AlertTitle>
          <AlertDescription
            className={cn(
              "mt-1 text-sm",
              message.type === "success"
                ? "text-emerald-900/80 dark:text-emerald-300/90"
                : "text-rose-900/80 dark:text-rose-300/90",
            )}
          >
            {message.text}
          </AlertDescription>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full p-1 text-slate-400 transition hover:bg-white/80 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={t("settingsPrimitives.alertClose")}
          >
            <span aria-hidden="true" className="block text-sm leading-none">
              ×
            </span>
          </button>
        ) : null}
      </div>
    </Alert>
  );
}

export function SettingsSection({
  icon: Icon,
  title,
  description,
  accentClassName,
  surfaceClassName,
  children,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  accentClassName: string;
  surfaceClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[24px] border border-slate-200/70 bg-white/80 p-5 shadow-sm shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none",
        surfaceClassName,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset",
              accentClassName,
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">{title}</h2>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-5 text-slate-900 dark:text-slate-100">{children}</div>
    </section>
  );
}

export function SettingsPageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div dir={getDirection()} className={cn("space-y-5 text-right", className)}>
      <div className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-sm shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
        {children}
      </div>
    </div>
  );
}

export type SettingsHeroSummaryItem = {
  label: string;
  value: React.ReactNode;
  valueDir?: "auto" | "ltr" | "rtl";
};

export function SettingsPageHero({
  badgeIcon: Icon,
  badgeLabel,
  title,
  description,
  summaryItems,
  action,
  gradientClassName,
}: {
  badgeIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badgeLabel: string;
  title: string;
  description: string;
  summaryItems?: SettingsHeroSummaryItem[];
  action?: React.ReactNode;
  gradientClassName?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border-b border-slate-200/70 px-6 py-7",
        "bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.18),_transparent_38%),linear-gradient(135deg,_rgba(248,250,252,0.98),_rgba(239,246,255,0.88))]",
        "dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_40%),linear-gradient(135deg,_rgba(15,23,42,0.95),_rgba(30,41,59,0.9))]",
        gradientClassName,
      )}
    >
      <div className="absolute left-0 top-0 h-32 w-32 -translate-x-1/3 -translate-y-1/4 rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-500/10" />
      <div className="relative space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/85 px-3 py-1 text-xs font-semibold text-sky-700 shadow-sm dark:border-sky-500/30 dark:bg-sky-950/60 dark:text-sky-300">
          <Icon className="size-3.5" />
          {badgeLabel}
        </div>

        <div
          className={cn(
            "space-y-2",
            action ? "flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:space-y-0" : "",
          )}
        >
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-slate-50">
              {title}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base dark:text-slate-300">
              {description}
            </p>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>

        {summaryItems?.length ? (
          <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-600 dark:text-slate-300">
            {summaryItems.map((item) => (
              <div
                key={`${item.label}-${String(item.value)}`}
                className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
              >
                {item.label}:{" "}
                <span
                  className="font-bold text-slate-950 dark:text-slate-50"
                  dir={item.valueDir || getDirection()}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
