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
    <section className={cn("business-page-shell", className)} {...props}>
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
    <header className={cn("business-page-hero", className)} {...props}>
      <div className="business-page-hero-copy">
        {eyebrow ? (
          <span className="business-page-kicker">{eyebrow}</span>
        ) : null}
        <h1 className="business-page-title">{title}</h1>
        {description ? (
          <p className="business-page-description">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="business-page-actions">{actions}</div> : null}
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
      className={cn("business-page-panel border-0 shadow-none", className)}
      {...props}
    >
      {title || description || headerAside ? (
        <CardHeader
          className={cn(
            "space-y-2",
            headerAside
              ? "flex flex-col gap-3 border-b border-border/60 md:flex-row md:items-center md:justify-between"
              : undefined,
            headerClassName,
          )}
        >
          {title || description ? (
            <div className="space-y-1">
              {title ? <CardTitle>{title}</CardTitle> : null}
              {description ? (
                <CardDescription>{description}</CardDescription>
              ) : null}
            </div>
          ) : null}
          {headerAside ? headerAside : null}
        </CardHeader>
      ) : null}

      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
};

export default BusinessPageShell;
