import React from "react";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Search } from "lucide-react";
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
            <h2 className="text-lg sm:text-xl font-black">تشخيص الوضع الرقمي وفحص نقاط التسرب (Audit)</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            رصد الفجوات التشغيلية والرقمية الحالية التي تؤدي إلى إهدار الميزانية وتراجع نسب الحضور
          </p>
        </div>
        <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold self-start sm:self-auto text-xs">
          تم رصد <span className="tabular-nums mx-1">{auditItems.length}</span> ثغرات تشغيلية
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {auditItems.map((item, index) => (
          <div
            key={item.id || index}
            className="rounded-2xl border border-border/70 bg-card p-5 space-y-4 hover:border-primary/40 transition-colors shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center size-6 rounded-full bg-muted text-xs font-bold tabular-nums">
                  {index + 1}
                </span>
                <h3 className="font-bold text-sm text-foreground">{item.title}</h3>
              </div>
              <Badge
                variant={item.severity === "HIGH" ? "destructive" : "secondary"}
                className="text-[10px] font-bold px-2 py-0.5"
              >
                {item.severity === "HIGH" ? "تأثير مرتفع" : "تأثير متوسط"}
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-destructive/5 border border-destructive/15 text-destructive-foreground">
                <div className="flex items-start gap-1.5 font-bold text-destructive mb-1">
                  <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                  <span>الملاحظة والرصد:</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">{item.finding}</p>
                <p className="text-destructive font-semibold mt-1.5 text-[11px]">
                  الأثر المالي: {item.impact}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200">
                <div className="flex items-start gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                  <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" />
                  <span>الحل المقترح بالمنصة:</span>
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
