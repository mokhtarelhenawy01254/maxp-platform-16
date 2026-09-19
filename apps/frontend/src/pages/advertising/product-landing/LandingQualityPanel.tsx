import React from "react";
import { AlertTriangle, CircleAlert, ShieldCheck } from "lucide-react";
import type { LandingQualityIssue } from "./landingQuality";

interface LandingQualityPanelProps {
  issues: LandingQualityIssue[];
}

/**
 * Compact pre-publish quality report: critical issues block publishing
 * (enforced again server-side), warnings are advisory. Collapses to a single
 * status line when everything passes.
 */
export const LandingQualityPanel: React.FC<LandingQualityPanelProps> = ({
  issues,
}) => {
  const critical = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");

  const statusLabel =
    critical.length > 0
      ? `${critical.length} مانع للنشر`
      : warnings.length > 0
        ? `${warnings.length} تحذير`
        : "جاهزة للنشر";

  const statusClass =
    critical.length > 0
      ? "is-critical"
      : warnings.length > 0
        ? "is-warning"
        : "is-clean";

  return (
    <section className="eo-quality-card" aria-label="فحص جودة الصفحة">
      <header className="eo-quality-head">
        <span className={`eo-quality-status ${statusClass}`}>
          {critical.length > 0 ? (
            <CircleAlert size={14} />
          ) : warnings.length > 0 ? (
            <AlertTriangle size={14} />
          ) : (
            <ShieldCheck size={14} />
          )}
          <span>{statusLabel}</span>
        </span>
        <span className="eo-style-hint">فحص تلقائي قبل النشر</span>
      </header>

      {issues.length > 0 && (
        <ul className="eo-quality-list">
          {[...critical, ...warnings].map((issue) => (
            <li
              key={issue.id}
              className={`eo-quality-item ${issue.severity === "critical" ? "is-critical" : "is-warning"}`}
            >
              {issue.severity === "critical" ? (
                <CircleAlert size={13} />
              ) : (
                <AlertTriangle size={13} />
              )}
              <span>{issue.label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
