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
    "bg-[color:color-mix(in_srgb,var(--color-primary)_16%,var(--app-panel-bg))] text-[color:var(--color-primary)]",
  success:
    "bg-[color:color-mix(in_srgb,var(--color-success)_16%,var(--app-panel-bg))] text-[color:var(--color-success)]",
  info: "bg-[color:color-mix(in_srgb,var(--color-info)_16%,var(--app-panel-bg))] text-[color:var(--color-info)]",
  danger:
    "bg-[color:color-mix(in_srgb,var(--color-destructive)_15%,var(--app-panel-bg))] text-[color:var(--color-destructive)]",
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
        "min-h-full space-y-6 overflow-x-hidden px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-5 lg:px-8",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[30px] border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_88%,var(--shell-control-bg)_12%)] shadow-[0_24px_70px_rgba(15,27,45,0.08)]">
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              {backHref ? (
                <Link
                  to={backHref}
                  aria-label={backLabel ?? title}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "icon-sm" }),
                    "mt-1 shrink-0 rounded-full border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_82%,var(--shell-control-bg)_18%)] text-[color:var(--color-foreground)] hover:bg-[color:color-mix(in_srgb,var(--app-panel-bg)_92%,white_8%)]",
                  )}
                >
                  <ChevronLeft
                    className={cn("size-4", i18n.dir() === "rtl" && "rotate-180")}
                  />
                </Link>
              ) : null}

              <div className="flex min-w-0 gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[color:color-mix(in_srgb,var(--color-primary)_16%,var(--app-panel-bg))] text-[color:var(--color-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                  <Icon className="size-6" />
                </div>
                <div className="min-w-0 space-y-2">
                  <Badge
                    variant="outline"
                    className="rounded-full border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_78%,var(--shell-control-bg)_22%)] px-2.5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]"
                  >
                    {eyebrow}
                  </Badge>
                  <div className="space-y-1">
                    <h1 className="text-balance font-heading text-2xl font-semibold tracking-normal text-[color:var(--color-foreground)] sm:text-[2rem]">
                      {title}
                    </h1>
                    <p className="max-w-3xl text-sm leading-6 text-[color:var(--color-muted-foreground)] sm:text-[0.95rem]">
                      {description}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {actions ? (
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
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
        "rounded-[28px] border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_90%,var(--shell-control-bg)_10%)] shadow-[0_20px_60px_rgba(15,27,45,0.06)]",
        className,
      )}
    >
      {title || description || action ? (
        <CardHeader className="gap-3 border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_76%,transparent)] pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              {title ? (
                <CardTitle className="text-[1.05rem] text-[color:var(--color-foreground)]">
                  {title}
                </CardTitle>
              ) : null}
              {description ? (
                <CardDescription className="max-w-2xl text-[color:var(--color-muted-foreground)]">
                  {description}
                </CardDescription>
              ) : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={cn("px-5 pb-5 sm:px-6", contentClassName)}>
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
    <Card className="rounded-[24px] border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_82%,var(--shell-control-bg)_18%)] shadow-[0_18px_40px_rgba(15,27,45,0.05)]">
      <CardContent className="flex items-start justify-between gap-4 px-5 py-5">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
            {label}
          </p>
          <div className="text-3xl font-semibold tracking-tight text-[color:var(--color-foreground)]">
            {value}
          </div>
          {hint ? (
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              {hint}
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
            toneClasses[tone],
          )}
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
