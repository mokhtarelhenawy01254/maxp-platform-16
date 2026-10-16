import React from "react";
import { cn } from "../../lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

interface BusinessPageShellProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

interface BusinessPageHeroProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  "title"
> {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

interface BusinessSectionPanelProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  headerAside?: React.ReactNode;
  headerClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export const BusinessPageShell: React.FC<BusinessPageShellProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <section
      className={cn(
        "business-page-shell flex w-full flex-col gap-4 pb-8 md:gap-5",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
};

export const BusinessPageHero: React.FC<BusinessPageHeroProps> = ({
  eyebrow,
  title,
  description,
  actions,
  className,
  ...props
}) => {
  return (
    <header
      className={cn(
        "business-page-hero flex flex-col justify-between gap-3 border-b border-border/60 pb-4 md:flex-row md:items-end md:gap-4 md:pb-5",
        className,
      )}
      {...props}
    >
      <div className="business-page-hero-copy min-w-0 space-y-1">
        {eyebrow ? (
          <span className="business-page-kicker inline-block rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-primary uppercase tabular-nums">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="business-page-title text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="business-page-description text-xs text-muted-foreground sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="business-page-actions flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
};

export const BusinessSectionPanel: React.FC<BusinessSectionPanelProps> = ({
  title,
  description,
  headerAside,
  headerClassName,
  contentClassName,
  className,
  children,
  ...props
}) => {
  return (
    <Card
      className={cn(
        "business-page-panel rounded-xl border border-border/70 bg-card shadow-none transition-colors",
        className,
      )}
      {...props}
    >
      {title || description || headerAside ? (
        <CardHeader
          className={cn(
            "p-3.5 sm:p-4",
            headerAside
              ? "flex flex-col gap-2.5 border-b border-border/60 md:flex-row md:items-center md:justify-between"
              : title || description
                ? "border-b border-border/60"
                : undefined,
            headerClassName,
          )}
        >
          {title || description ? (
            <div className="min-w-0 space-y-0.5">
              {title ? (
                <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
                  {title}
                </CardTitle>
              ) : null}
              {description ? (
                <CardDescription className="text-xs text-muted-foreground">
                  {description}
                </CardDescription>
              ) : null}
            </div>
          ) : null}
          {headerAside ? <div className="shrink-0">{headerAside}</div> : null}
        </CardHeader>
      ) : null}

      <CardContent className={cn("p-3.5 sm:p-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
};

export default BusinessPageShell;
