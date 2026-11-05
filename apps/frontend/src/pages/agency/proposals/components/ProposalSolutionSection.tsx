import React from "react";
import { Check, Cpu, Layers, MessageSquare, Sparkles, TrendingUp, Users } from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import { ProposalSolutionModule } from "../types";

interface ProposalSolutionSectionProps {
  modules: ProposalSolutionModule[];
}

export const ProposalSolutionSection: React.FC<ProposalSolutionSectionProps> = ({ modules }) => {
  if (!modules || modules.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Layers className="size-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground">
              الركائز التشغيلية والتقنية المقترحة (The 4 Growth Pillars)
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            المنظومة المتكاملة التي تحول كود تريبس إلى نظام تشغيل ذكي ومؤتمت يقلل العبء الإداري بنسبة 80%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((mod, idx) => (
          <div
            key={mod.id || idx}
            className="rounded-2xl border border-border/70 bg-card p-5 space-y-3 hover:border-primary/40 transition-colors shadow-xs flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-[11px] font-bold px-2.5 py-0.5 border-primary/30 bg-primary/5 text-primary">
                  {mod.category}
                </Badge>
                <span className="flex items-center justify-center size-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                  {idx + 1}
                </span>
              </div>

              <h3 className="font-black text-sm sm:text-base text-foreground leading-snug">
                {mod.title}
              </h3>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {mod.description}
              </p>
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center gap-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <Check className="size-3.5" />
              <span>مجهزة للربط المباشر مع رقم واتساب وMeta CAPI</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
