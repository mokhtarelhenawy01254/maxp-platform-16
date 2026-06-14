import React from "react";
import { Separator } from "@/components/ui/separator";

interface ProcurementMobileField {
  label: React.ReactNode;
  value: React.ReactNode;
  fullWidth?: boolean;
  emphasis?: boolean;
}

interface ProcurementMobileCardProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  status?: React.ReactNode;
  fields?: ProcurementMobileField[];
  actions?: React.ReactNode;
}

interface ProcurementMobileStateProps {
  children: React.ReactNode;
}

export function ProcurementMobileCard({
  eyebrow,
  title,
  subtitle,
  status,
  fields = [],
  actions,
}: ProcurementMobileCardProps) {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-[0_14px_34px_rgba(15,23,42,0.08)] overflow-hidden">
      <div className="p-2.25">
        <div className="flex flex-col gap-1.75">
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              {eyebrow && (
                <span className="text-xs font-bold tracking-wider text-muted-foreground mb-0.5 block">
                  {eyebrow}
                </span>
              )}
              <h6 className="font-extrabold leading-tight break-words">{title}</h6>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-0.5 break-words">
                  {subtitle}
                </p>
              )}
            </div>
            {status && <div className="shrink-0">{status}</div>}
          </div>

          {fields.length > 0 && (
            <div className="grid grid-cols-2 gap-1.25">
              {fields.map((field, index) => (
                <div
                  key={`${String(field.label)}-${index}`}
                  className={`rounded-lg bg-muted p-1.25 min-w-0 ${field.fullWidth ? "col-span-full" : ""}`}
                >
                  <span className="text-xs text-muted-foreground block mb-0.4">
                    {field.label}
                  </span>
                  <div
                    className={`text-sm leading-tight break-words ${field.emphasis ? "font-extrabold" : "font-semibold"}`}
                  >
                    {field.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {actions && (
            <>
              <Separator />
              <div className="flex gap-0.5 justify-end">{actions}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProcurementMobileState({
  children,
}: ProcurementMobileStateProps) {
  return (
    <div className="rounded-xl border bg-card text-card-foreground">
      <div className="py-4 text-center text-muted-foreground text-sm">
        {children}
      </div>
    </div>
  );
}
