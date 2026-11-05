import React from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Eye,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  Target,
  Zap,
} from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import { AgencyProposal } from "../types";

interface ProposalHeroProps {
  proposal: AgencyProposal;
  agencyName: string;
  subdomain?: string;
}

export const ProposalHero: React.FC<ProposalHeroProps> = ({
  proposal,
  agencyName,
  subdomain = "h2m",
}) => {
  // Normalize subdomain for display
  const cleanSubdomain = subdomain.startsWith("h2m") ? "h2m" : subdomain;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-10 shadow-sm space-y-6">
      {/* Subtle brand ambient glow */}
      <div className="absolute top-0 right-0 -left-20 h-48 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Meta Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="size-3.5" />
            <span>مقدم من وكالة: </span>
            <strong className="text-foreground">{agencyName}</strong>
          </span>
          <span className="text-xs text-muted-foreground font-mono bg-muted/70 px-2.5 py-0.5 rounded-full" dir="ltr">
            {cleanSubdomain}.maxp.online
          </span>
        </div>

        <div className="flex items-center gap-2">
          {proposal.status === "ACCEPTED" ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold gap-1 px-3 py-1 text-xs">
              <CheckCircle2 className="size-3.5" />
              <span>تم اعتماد الخطة رسمياً</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary font-bold gap-1 px-3 py-1 text-xs">
              <ShieldCheck className="size-3.5" />
              <span>غرفة صفقات تنفيذية معتمدة 2026</span>
            </Badge>
          )}

          {proposal.viewsCount && proposal.viewsCount > 1 ? (
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 bg-muted/40 px-2.5 py-1 rounded-md">
              <Eye className="size-3 text-primary" />
              <span>شوهدت <span className="tabular-nums font-bold text-foreground">{proposal.viewsCount}</span> مرات</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Main Title & Client Identity */}
      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
          <span className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2.5 py-1 rounded-md">
            <Building2 className="size-3.5 text-primary" />
            <span>مخصصة لـ: {proposal.clientName}</span>
          </span>
          <span>•</span>
          <span className="text-primary font-semibold">{proposal.industry}</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground text-balance leading-snug">
          {proposal.title}
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed text-pretty">
          {proposal.executiveSummary}
        </p>

        {/* Alexandria Local Context & Leadership Pills */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 bg-muted/40 border border-border/50 px-2.5 py-1 rounded-lg">
            <MapPin className="size-3.5 text-rose-500" />
            <span className="font-medium">المقر الميداني: 68 شارع فيكتور باسيلي، متفرع من فؤاد، الإسكندرية</span>
          </div>

          {proposal.contactPerson && (
            <div className="flex items-center gap-1 bg-muted/40 border border-border/50 px-2.5 py-1 rounded-lg">
              <Users className="size-3.5 text-primary" />
              <span className="font-medium">الموجه إليهم: {proposal.contactPerson}</span>
            </div>
          )}

          <div className="flex items-center gap-1 bg-muted/40 border border-border/50 px-2.5 py-1 rounded-lg">
            <Calendar className="size-3.5 text-primary" />
            <span>تاريخ الإعداد: {new Date(proposal.createdAt).toLocaleDateString("ar-EG")}</span>
          </div>
        </div>
      </div>

      {/* 3 Executive Strategic Pillars Banner */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-destructive">
            <Target className="size-3.5" />
            <span>الفجوة المرصودة حالياً</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            تشتت 50%+ من طلبات أولياء الأمور وتأخر الردود اليدوية بسبب غياب نظام أتمتة حجز الورش.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
            <Zap className="size-3.5" />
            <span>الحل المشغل على MaxP</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            صفحات حجز فورية + وكلاء واتساب لتأكيد الحضور + بوابة أولياء أمور لتقارير إنجاز الأطفال.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-3.5" />
            <span>العائد المستهدف</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            خفض نسبة التغيب لـ 15%، تحقيق عائد مباشر 3.2x للشهر الأول و 9.5x قيمة تراكمية (LTV).
          </p>
        </div>
      </div>

      {/* Reference slug badge */}
      <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <span>رقم توثيق العرض الاستراتيجي:</span>
        <span className="font-mono text-foreground font-bold bg-muted px-2.5 py-0.5 rounded-md" dir="ltr">
          {proposal.slug}
        </span>
      </div>
    </div>
  );
};
