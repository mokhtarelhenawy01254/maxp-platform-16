import React from "react";
import { Clock, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

export interface ChangelogItem {
  version: string;
  date: string;
  changes: string[];
}

interface AppDetailsChangelogTabProps {
  changelog: ChangelogItem[];
}

export const AppDetailsChangelogTab: React.FC<AppDetailsChangelogTabProps> = ({
  changelog,
}) => {
  const { t } = useTranslation();

  if (changelog.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-card p-5 text-right">
      <h2 className="text-xl font-extrabold text-foreground mb-4">
        {t("marketplace.changelog")}
      </h2>
      <div className="space-y-4">
        {changelog.map((entry, i) => (
          <div key={i} className="rounded-xl border bg-background p-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="gap-1 font-mono">
                <Clock size={11} />
                {entry.version}
              </Badge>
              <span className="text-xs text-muted-foreground">{entry.date}</span>
            </div>
            <ul className="space-y-1.5">
              {entry.changes.map((change, j) => (
                <li
                  key={j}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle2
                    size={13}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                  {change}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
