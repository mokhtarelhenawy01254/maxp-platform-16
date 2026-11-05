import React from "react";
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, Search, ShieldAlert } from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import { ProposalAuditItem } from "../types";

interface ProposalAuditSectionProps {
  auditItems: ProposalAuditItem[];
}

export const ProposalAuditSection: React.FC<ProposalAuditSectionProps> = ({ auditItems }) => {
  if (!auditItems || auditItems.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Search className="size-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground">
              فحص التشخيص الرقمي وفجوات التسرب المالي (Audit & Leaky Bucket)
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            رصد الفجوات التشغيلية في موقع ومنظومة كود تريبس الحالية التي تتسبب في تسرب أكثر من 40% من أولياء الأمور قبل حجز جلسة التقييم
          </p>
        </div>
        <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold self-start sm:self-auto text-xs">
          تم تشخيص <span className="tabular-nums mx-1">{auditItems.length}</span> ثغرات تشغيلية
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {auditItems.map((item, index) => (
          <div
            key={item.id || index}
            className="rounded-2xl border border-border/70 bg-card p-5 space-y-4 hover:border-primary/40 transition-colors shadow-xs flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold tabular-nums">
                    {index + 1}
                  </span>
                  <h3 className="font-bold text-sm text-foreground leading-snug">{item.title}</h3>
                </div>
                <Badge
                  variant={item.severity === "HIGH" ? "destructive" : "secondary"}
                  className="text-[10px] font-bold px-2 py-0.5 shrink-0"
                >
                  {item.severity === "HIGH" ? "تأثير مرتفع (Critical)" : "تأثير متوسط"}
                </Badge>
              </div>

              {/* Problem Finding & Impact */}
              <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/15 text-destructive-foreground space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-destructive">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span>الملاحظة والرصد الميداني:</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">{item.finding}</p>
                <div className="pt-1 border-t border-destructive/10 flex items-center gap-1 text-[11px] text-destructive font-semibold">
                  <span>الأثر المالي:</span>
                  <span>{item.impact}</span>
                </div>
              </div>

              {/* Solution on MaxP */}
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  <span>الحل التنفيذي المباشر على منصة MaxP:</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">{item.solution}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
