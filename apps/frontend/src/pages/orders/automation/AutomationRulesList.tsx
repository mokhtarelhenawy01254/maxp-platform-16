import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Clock, Trash2, Zap, RotateCw } from "lucide-react";

export interface AutoChangeRule {
  id: string;
  fromStatus: string;
  toStatus: string;
  waitTime: number;
  timeUnit: string;
  isActive: boolean;
}

interface AutomationRulesListProps {
  rules: AutoChangeRule[];
  loading: boolean;
  deletingId: string | null;
  onDelete: (id: string) => void;
  getStatusName: (code: string) => string;
  getStatusColor: (code: string) => string;
  formatWaitTime: (waitTime: number, timeUnit: string) => string;
}

export const AutomationRulesList: React.FC<AutomationRulesListProps> = ({
  rules,
  loading,
  deletingId,
  onDelete,
  getStatusName,
  getStatusColor,
  formatWaitTime,
}) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs min-h-[380px]">
      <h3 className="mb-4 text-sm font-bold text-foreground flex items-center gap-2">
        <span>{t("orders.automationActiveRules") || "القواعد النشطة"}</span>
        {rules.length > 0 && (
          <span className="flex h-5 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-mono tabular-nums font-semibold text-primary">
            {rules.length}
          </span>
        )}
      </h3>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <RotateCw className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs">{t("orders.automationLoadingRules") || "جاري تحميل القواعد..."}</p>
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground border border-border/60">
            <Zap className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {t("orders.automationNoRules") || "لا توجد قواعد أتمتة حالياً"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            {t("orders.automationNoRulesDesc") ||
              "قم بإنشاء قواعد لنقل حالات الطلبات تلقائياً بعد مرور مدة زمنية محددة دون تدخل بشري."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 p-3.5 transition-colors hover:border-border hover:bg-card"
            >
              <div className="flex flex-1 flex-wrap items-center gap-2.5">
                {/* From Status */}
                <div
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border"
                  style={{
                    backgroundColor: `${getStatusColor(rule.fromStatus)}15`,
                    color: getStatusColor(rule.fromStatus),
                    borderColor: `${getStatusColor(rule.fromStatus)}30`,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: getStatusColor(rule.fromStatus) }}
                  />
                  {getStatusName(rule.fromStatus)}
                </div>

                {/* Arrow + Wait Time */}
                <div className="flex items-center gap-1.5 px-0.5">
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground rotate-180" />
                  <div className="flex items-center gap-1 rounded-md border border-border/70 bg-background px-2 py-0.5 shadow-2xs">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-mono tabular-nums font-semibold text-foreground">
                      {formatWaitTime(rule.waitTime, rule.timeUnit)}
                    </span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground rotate-180" />
                </div>

                {/* To Status */}
                <div
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border"
                  style={{
                    backgroundColor: `${getStatusColor(rule.toStatus)}15`,
                    color: getStatusColor(rule.toStatus),
                    borderColor: `${getStatusColor(rule.toStatus)}30`,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: getStatusColor(rule.toStatus) }}
                  />
                  {getStatusName(rule.toStatus)}
                </div>
              </div>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => onDelete(rule.id)}
                disabled={deletingId === rule.id}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-colors disabled:opacity-50"
                title={t("orders.automationDeleteRule") || "حذف القاعدة"}
              >
                {deletingId === rule.id ? (
                  <RotateCw className="h-3.5 w-3.5 animate-spin text-destructive" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
