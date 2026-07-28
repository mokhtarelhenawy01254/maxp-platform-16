import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WhatsAppPageShellProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}

interface WhatsAppSurfaceCardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

interface WhatsAppMetricCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "info" | "danger";
}

const toneClasses = {
  primary:
    "bg-primary/15 text-[color:var(--color-primary)]",
  success:
    "bg-success/15 text-[color:var(--color-success)]",
  info: "bg-info/15 text-[color:var(--color-info)]",
  danger:
    "bg-destructive/15 text-[color:var(--color-destructive)]",
} as const;

export function WhatsAppPageShell({
  title,
  description,
  icon: Icon,
  actions,
  backHref,
  backLabel,
  eyebrow = "WhatsApp Workspace",
  children,
  className,
}: WhatsAppPageShellProps) {
  const { i18n } = useTranslation();

  return (
    <section
      dir={i18n.dir()}
        className={cn(
          "min-h-full space-y-space-4 overflow-x-hidden px-space-1 py-space-2 pb-[calc(var(--space-4)+env(safe-area-inset-bottom))] sm:space-y-space-6 sm:px-space-6 sm:py-space-4 lg:px-space-8",
          className,
        )}
      >
        <div className="overflow-hidden rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] shadow-soft sm:rounded-3xl sm:shadow-raised">
          <div className="flex flex-col gap-space-4 px-space-4 py-space-4 sm:gap-space-5 sm:px-space-6 sm:py-space-5 lg:px-space-7">
          <div className="flex flex-col gap-space-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-space-2 sm:gap-space-3">
              {backHref ? (
                <Link
                  to={backHref}
                  aria-label={backLabel ?? title}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "icon-sm" }),
                    "mt-0.5 shrink-0 rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-background)] text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)] sm:mt-1",
                  )}
                >
                  <ChevronLeft
                    className={cn("size-4", i18n.dir() === "rtl" && "rotate-180")}
                  />
                </Link>
              ) : null}

              <div className="flex min-w-0 gap-2 sm:gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[color:var(--color-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] sm:size-12 sm:rounded-2xl">
                  <Icon className="size-5 sm:size-6" />
                </div>
                <div className="min-w-0 space-y-1 sm:space-y-2">
                  <Badge
                    variant="outline"
                    className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] px-2 text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)] sm:px-2.5 sm:text-[10px]"
                  >
                    {eyebrow}
                  </Badge>
                  <div className="space-y-0.5 sm:space-y-1">
                    <h1 className="text-balance font-heading text-xl font-semibold tracking-normal text-[color:var(--color-foreground)] sm:text-[2rem]">
                      {title}
                    </h1>
                    <p className="max-w-3xl text-xs leading-5 text-[color:var(--color-muted-foreground)] sm:text-sm sm:leading-6 sm:text-[0.95rem]">
                      {description}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {actions ? (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 lg:justify-end">
                {actions}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {children}
    </section>
  );
}

export function WhatsAppSurfaceCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: WhatsAppSurfaceCardProps) {
  return (
    <Card
      className={cn(
        "rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] shadow-soft sm:rounded-3xl sm:shadow-raised",
        className,
      )}
    >
      {title || description || action ? (
        <CardHeader className="gap-space-2 border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_76%,transparent)] pb-space-2 sm:gap-space-3 sm:pb-space-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              {title ? (
                <CardTitle className="text-sm font-semibold text-[color:var(--color-foreground)] sm:text-[1.05rem]">
                  {title}
                </CardTitle>
              ) : null}
              {description ? (
                <CardDescription className="max-w-2xl text-xs text-[color:var(--color-muted-foreground)] sm:text-sm">
                  {description}
                </CardDescription>
              ) : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={cn("px-3 pb-3 sm:px-6 sm:pb-5", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

export function WhatsAppMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: WhatsAppMetricCardProps) {
  return (
    <Card className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] shadow-sm sm:rounded-3xl sm:shadow-md">
      <CardContent className="flex items-start justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-5">
        <div className="space-y-1 sm:space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)] sm:text-xs">
            {label}
          </p>
          <div className="text-xl font-semibold tracking-tight text-[color:var(--color-foreground)] sm:text-3xl">
            {value}
          </div>
          {hint ? (
            <p className="text-[11px] text-[color:var(--color-muted-foreground)] sm:text-sm">
              {hint}
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] sm:size-11 sm:rounded-2xl",
            toneClasses[tone],
          )}
        >
          <Icon className="size-4 sm:size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
