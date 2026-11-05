import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, MessageCircle, Share2, Sparkles } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { apiClient } from "../../../services/apiClient";
import { AgencyProposal, ProposalPackage, PublicProposalData } from "./types";
import { ProposalHero } from "./components/ProposalHero";
import { ProposalAuditSection } from "./components/ProposalAuditSection";
import { ProposalFunnelCalculator } from "./components/ProposalFunnelCalculator";
import { ProposalSolutionSection } from "./components/ProposalSolutionSection";
import { ProposalTimelineSection } from "./components/ProposalTimelineSection";
import { ProposalPackagesSection } from "./components/ProposalPackagesSection";
import { ProposalAcceptModal } from "./components/ProposalAcceptModal";

export default function AgencyPublicProposalPage() {
  const { slugOrToken } = useParams<{ slugOrToken: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicProposalData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Accept modal
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ProposalPackage | null>(null);

  const fetchProposal = async () => {
    if (!slugOrToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: PublicProposalData }>(
        `/agency/public/proposal/${encodeURIComponent(slugOrToken)}`
      );
      if (res.data?.success && res.data.data?.proposal) {
        setData(res.data.data);
      } else {
        setError("لم يتم العثور على الخطة المطلوبة أو قد تكون غير مفعلة.");
      }
    } catch (err: any) {
      console.error("Error fetching public proposal:", err);
      setError(err?.response?.data?.message || "تعذر تحميل الخطة التفاعلية، يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposal();
  }, [slugOrToken]);

  const handleSelectPackage = (pkg: ProposalPackage) => {
    setSelectedPackage(pkg);
    setAcceptModalOpen(true);
  };

  const handleConfirmAccept = async (payload: {
    packageId: string;
    contactName: string;
    contactPhone: string;
    clientNotes: string;
  }) => {
    if (!slugOrToken) return;
    try {
      const res = await apiClient.post<{ success: boolean; message: string; data: any }>(
        `/agency/public/proposal/${encodeURIComponent(slugOrToken)}/accept`,
        payload
      );
      if (res.data?.success) {
        toast.success(res.data.message || "تم اعتماد الخطة بنجاح!");
        if (data?.proposal) {
          setData({
            ...data,
            proposal: {
              ...data.proposal,
              status: "ACCEPTED",
              acceptedAt: new Date().toISOString(),
              acceptedPackageId: payload.packageId,
              acceptanceNotes: payload.clientNotes,
            },
          });
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "حدث خطأ أثناء اعتماد الخطة.");
      throw err;
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("تم نسخ رابط الخطة إلى الحافظة!");
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 text-center" dir="rtl">
        <div className="size-10 border-2 border-[#FFD368] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-black text-white">جاري فتح غرفة عرض الخطة الاستراتيجية...</h2>
        <p className="text-xs text-white/50 mt-1 font-mono">H2M Executive Dealroom • CodeTreps</p>
      </div>
    );
  }

  if (error || !data?.proposal) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 text-center" dir="rtl">
        <div className="p-4 rounded-full bg-rose-500/10 text-rose-400 mb-3 border border-rose-500/20">
          <AlertCircle className="size-8" />
        </div>
        <h2 className="text-lg font-black text-white">رابط الخطة غير متاح</h2>
        <p className="text-xs text-white/60 mt-1 max-w-md">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/15 text-white"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const { proposal, agencyInfo } = data;
  const isAccepted = proposal.status === "ACCEPTED";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#FFD368]/20" dir="rtl">
      {/* Top Floating Control Bar — Single Surface Luxury Obsidian */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0d0d0d]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Brand Identity & Client Name */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-black tracking-widest text-[#FFD368]">
              {agencyInfo?.name || "H2M"}
            </span>
            <span className="text-white/20">•</span>
            <span className="text-xs font-bold text-white/90">
              خطة: {proposal.clientName}
            </span>
            {isAccepted && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="size-3" />
                معتمدة
              </span>
            )}
          </div>

          {/* Quick Nav Anchors (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 text-xs text-white/60 font-medium">
            <button onClick={() => scrollTo("audit")} className="px-2.5 py-1 rounded hover:text-white hover:bg-white/5 transition-colors">
              التشخيص
            </button>
            <button onClick={() => scrollTo("workstreams")} className="px-2.5 py-1 rounded hover:text-white hover:bg-white/5 transition-colors">
              محاور العمل
            </button>
            <button onClick={() => scrollTo("calculator")} className="px-2.5 py-1 rounded hover:text-white hover:bg-white/5 transition-colors">
              محاكاة العائد
            </button>
            <button onClick={() => scrollTo("timeline")} className="px-2.5 py-1 rounded hover:text-white hover:bg-white/5 transition-colors">
              الجدول الزمني
            </button>
            <button onClick={() => scrollTo("packages")} className="px-2.5 py-1 rounded hover:text-white hover:bg-white/5 transition-colors">
              الباقات
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              title="مشاركة الرابط"
              className="h-8 px-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="size-3.5" />
              <span className="hidden sm:inline">مشاركة</span>
            </button>

            {agencyInfo?.phone && (
              <a
                href={`https://wa.me/20${agencyInfo.phone.replace(/^0+/, "")}?text=${encodeURIComponent(
                  `أهلاً بك، بخصوص خطة نمو وتشغيل ${proposal.clientName}.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="h-8 px-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <MessageCircle className="size-3.5" />
                <span className="hidden sm:inline">واتساب</span>
              </a>
            )}

            <button
              onClick={() => scrollTo("packages")}
              className="h-8 px-3 rounded-lg font-black text-xs bg-gradient-to-r from-[#FFD368] to-[#D99518] text-black hover:opacity-95 shadow-md shadow-[#FFD368]/15 flex items-center gap-1.5 transition-all"
            >
              <CheckCircle2 className="size-3.5" />
              <span>{isAccepted ? "تفاصيل الباقة" : "اعتماد الخطة"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Single-Surface Continuous Narrative */}
      <main className="divide-y divide-white/5">
        {/* 1. Hero Band */}
        <ProposalHero
          proposal={proposal}
          agencyName={agencyInfo?.name || "H2M Growth Agency"}
          subdomain={agencyInfo?.subdomain || "h2m"}
        />

        {/* 2. Operational Audit & Leaky Bucket */}
        <ProposalAuditSection auditItems={proposal.auditItems} />

        {/* 3. Scope of Work & Tangible Deliverables */}
        <ProposalSolutionSection
          workstreams={proposal.workstreams}
          modules={proposal.solutionModules}
        />

        {/* 4. Interactive ROI Funnel Simulator */}
        <ProposalFunnelCalculator
          config={proposal.funnelConfig}
          currency={proposal.currency}
        />

        {/* 5. 14-Day Timeline with Concrete Handover */}
        <ProposalTimelineSection timeline={proposal.timeline} />

        {/* 6. Investment Packages */}
        <ProposalPackagesSection
          packages={proposal.packages}
          currency={proposal.currency}
          isAccepted={isAccepted}
          acceptedPackageId={proposal.acceptedPackageId}
          onSelectPackage={handleSelectPackage}
        />

        {/* 7. Executive Dealroom Footer */}
        <footer className="bg-[#050505] py-12 px-4 text-center border-t border-white/10">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="font-mono text-xs font-bold text-[#FFD368] tracking-widest uppercase">
              H2M Growth Agency • Alexandria
            </div>
            <p className="text-xs text-white/50 leading-relaxed max-w-xl mx-auto">
              هذه الخطة مخصصة حصرياً لأكاديمية كود تريبس (CodeTreps Academy). جميع التحليلات ومحاكاة العائد
              محمية بحقوق الإعداد الفني ومجهزة للتنفيذ المباشر على منصة MaxP.
            </p>
            <div className="text-[11px] text-white/30 font-mono pt-2">
              All Rights Reserved © 2026 • Powered by MaxP
            </div>
          </div>
        </footer>
      </main>

      {/* Acceptance Modal */}
      <ProposalAcceptModal
        open={acceptModalOpen}
        onOpenChange={setAcceptModalOpen}
        selectedPackage={selectedPackage}
        currency={proposal.currency}
        defaultContactPerson={proposal.contactPerson}
        defaultPhone={proposal.phone}
        onConfirmAccept={handleConfirmAccept}
      />
    </div>
  );
}
