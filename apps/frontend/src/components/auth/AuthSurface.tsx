import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { envConfig } from "../../config/environment";
import "../../pages/auth/authRedesign.css";

const THEME_OVERRIDES: Record<string, Record<string, string>> = {
  messaging: {
    "--auth-accent": "#0d9488",
    "--auth-accent-dark": "#0f766e",
    "--auth-accent-glow": "rgba(13, 148, 136, 0.25)",
    "--auth-accent-soft": "rgba(13, 148, 136, 0.1)",
    "--auth-accent-border": "rgba(13, 148, 136, 0.2)",
  },
};

interface AuthSurfaceProps {
  children: React.ReactNode;
  title: string;
  description: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  className?: string;
  theme?: string;
  // New props for the visual side
  visualTitle?: React.ReactNode;
  visualDescription?: string;
  visualBadge?: string;
  visualStats?: Array<{ label: string; value: string }>;
  dir?: "rtl" | "ltr";
  // هوية الشركة — لو متوفرة تُعرض بدل هوية المنصة (لوجو/اسم/لون)
  companyLogo?: string | null;
  companyName?: string | null;
  companyAccent?: string;
}

interface AuthNoticeProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  variant?: "error" | "success" | "info" | "warning";
}

export const AuthSurface: React.FC<AuthSurfaceProps> = ({
  children,
  title,
  description,
  eyebrow,
  footer,
  wide = false,
  className,
  theme,
  visualTitle,
  visualDescription,
  visualBadge,
  visualStats,
  dir = "rtl",
  companyLogo,
  companyName,
  companyAccent,
}) => {
  const { t } = useTranslation();
  const themeStyle = {
    ...(theme ? THEME_OVERRIDES[theme] : undefined),
    ...(companyAccent
      ? {
          "--auth-accent": companyAccent,
          "--auth-accent-dark": companyAccent,
          "--auth-accent-glow": `${companyAccent}40`,
          "--auth-accent-soft": `${companyAccent}1A`,
          "--auth-accent-border": `${companyAccent}33`,
        }
      : {}),
  } as React.CSSProperties;
  return (
    <div className={cn("elite-auth-container", wide && "elite-auth-container--wide")} dir={dir} style={themeStyle as React.CSSProperties}>
      {/* Visual Side */}
      <div className="elite-auth-visual">
        <div className="visual-content animate-fade-up">
          <span className="visual-badge">
            {visualBadge || t("auth.businessOs")}
          </span>
          <h1 className="visual-title">
            {visualTitle || (
              <>
                كل أعمالك <br />
                <span style={{ color: "var(--auth-accent)" }}>في نظام واحد</span>
              </>
            )}
          </h1>
          <p className="visual-description">
            {visualDescription ||
              "منصة تشغيل متكاملة تجمع المبيعات، المحادثات، المخازن، الموارد البشرية، والتسويق — في مساحة عمل واحدة."}
          </p>

          {visualStats && visualStats.length > 0 ? (
            <div className="visual-stats-inline">
              {visualStats.map((stat, idx) => (
                <div key={idx} className="stat-inline">
                  <span className="stat-inline-value">{stat.value}</span>
                  <span className="stat-inline-label">{stat.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="visual-stats-inline">
              <span className="stat-inline">
                <span className="stat-inline-value">{t("auth.visualStart")}</span>
                <span className="stat-inline-label">{t("auth.visualImmediately")}</span>
              </span>
              <span className="stat-inline">
                <span className="stat-inline-value">{t("auth.visualWithout")}</span>
                <span className="stat-inline-label">{t("auth.visualTrialPeriod")}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Form Side */}
      <div className="elite-auth-form-side">
        <div className={cn("elite-form-container animate-fade-up", wide && "elite-form-container--wide")}>
          <Link to="/" className="elite-brand-logo">
            <img
              src={
                companyLogo
                  ? companyLogo.startsWith("http://") || companyLogo.startsWith("https://") || companyLogo.startsWith("data:")
                    ? companyLogo
                    : `${envConfig.backendUrl}${companyLogo.startsWith("/") ? "" : "/"}${companyLogo}`
                  : "/logo.png"
              }
              alt={companyName || t("auth.brandName")}
              className="logo-img"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith("/logo.png")) {
                  target.src = "/logo.png";
                } else {
                  target.style.display = "none";
                  const fallback = target.parentElement?.querySelector(".logo-icon") as HTMLElement | null;
                  if (fallback) fallback.style.display = "flex";
                }
              }}
            />
            <div className="logo-icon" style={{ display: "none" }}>
              {(companyName || t("auth.brandName")).charAt(0)}
            </div>
            <span className="logo-text">
              {companyName || t("auth.brandName")}
            </span>
          </Link>

          <div className="form-header">
            {eyebrow && <span className="elite-form-eyebrow">{eyebrow}</span>}
            <h2 className="form-title">{title}</h2>
            <p className="form-subtitle">{description}</p>
          </div>

          <div className={cn("elite-form-content", className)}>
            {children}
          </div>

          {footer && (
            <footer className="elite-form-footer">
              {footer}
            </footer>
          )}
        </div>
      </div>
    </div>
  );
};

export const AuthNotice: React.FC<AuthNoticeProps> = ({
  children,
  className,
  title,
  variant = "info",
}) => {
  const isError = variant === "error";

  return (
    <div
      className={cn("business-auth-notice", className)}
      data-variant={variant}
      aria-live="polite"
      role={isError ? "alert" : "status"}
    >
      {title ? <p className="business-auth-notice-title">{title}</p> : null}
      <div className="business-auth-notice-copy">{children}</div>
    </div>
  );
};

export default AuthSurface;
