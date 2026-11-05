import React from "react";
import { Building2, Calendar, CheckCircle2, Eye, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import { AgencyProposal } from "../types";

interface ProposalHeroProps {
  proposal: AgencyProposal;
  agencyName: string;
  subdomain?: string;
}

export const ProposalHero: React.FC<ProposalHeroProps> = ({ proposal, agencyName, subdomain = "h2m" }) => {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 sm:p-10 shadow-sm">
      {/* Decorative subtle background gradient */}
      <div className="absolute top-0 right-0 -left-20 h-40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="size-3.5" />
              مقدم من: {agencyName}
            </span>
            <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded-md" dir="ltr">
              {subdomain}.maxp.online
            </span>
          </div>

          <div className="flex items-center gap-2">
            {proposal.status === "ACCEPTED" ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold gap-1 px-3 py-1 text-xs">
                <CheckCircle2 className="size-3.5" />
                تم اعتماد الخطة
              </Badge>
            ) : (
              <Badge variant="outline" className="border-primary/30 text-primary font-bold gap-1 px-3 py-1 text-xs">
                <ShieldCheck className="size-3.5" />
                خطة استراتيجية معتمدة 2026
              </Badge>
            )}

            {proposal.viewsCount && proposal.viewsCount > 1 ? (
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
                <Eye className="size-3" />
                تمت المشاهدة {proposal.viewsCount} مرات
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Building2 className="size-4 text-primary" />
            <span>مخصصة لـ: {proposal.clientName}</span>
            <span>•</span>
            <span>{proposal.industry}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground text-balance leading-tight">
            {proposal.title}
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed text-pretty">
            {proposal.executiveSummary}
          </p>
        </div>

        {/* Quick Meta Footer */}
        <div className="pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5 text-primary" />
              <span>تاريخ الإعداد: {new Date(proposal.createdAt).toLocaleDateString("ar-EG")}</span>
            </div>
            {proposal.contactPerson && (
              <div>
                <span>الموجه إليه: {proposal.contactPerson}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] bg-secondary px-2.5 py-1 rounded-lg text-secondary-foreground font-medium flex items-center gap-1">
              <span>رقم المرجع:</span>
              <span className="font-mono text-foreground font-bold" dir="ltr">{proposal.slug}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
