import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, MessageCircle, Phone, Share2 } from "lucide-react";
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
        // Update local state to reflect accepted status
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center" dir="rtl">
        <div className="size-10 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-black text-foreground">جاري فتح غرفة عرض الخطة التفاعلية...</h2>
        <p className="text-xs text-muted-foreground mt-1">يتم الآن تجهيز الأرقام ومحاور العمل</p>
      </div>
    );
  }

  if (error || !data?.proposal) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center" dir="rtl">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-3">
          <AlertCircle className="size-8" />
        </div>
        <h2 className="text-lg font-black text-foreground">رابط الخطة غير متاح</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-4 text-xs font-bold">
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  const { proposal, agencyInfo } = data;

  return (
    <div className="min-h-screen bg-background/95 text-foreground pb-16 selection:bg-primary/20" dir="rtl">
      {/* Top Floating Control Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-black text-sm tracking-tight text-foreground">
              {agencyInfo?.name || "وكالة النمو والتشغيل"}
            </span>
            <span className="text-muted-foreground/40 hidden sm:inline">•</span>
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
              خطة: {proposal.clientName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="h-8 text-xs font-bold gap-1 px-3"
            >
              <Share2 className="size-3.5" />
              <span className="hidden sm:inline">مشاركة الرابط</span>
            </Button>

            {agencyInfo?.phone && (
              <a
                href={`https://wa.me/20${agencyInfo.phone.replace(/^0+/, "")}?text=${encodeURIComponent(
                  `أهلاً بك، بخصوص خطة نمو وتشغيل ${proposal.clientName}.`
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-emerald-600/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 gap-1 px-3">
                  <MessageCircle className="size-3.5" />
                  <span className="hidden sm:inline">استفسار واتساب</span>
                </Button>
              </a>
            )}

            <Button
              size="sm"
              onClick={() => {
                document.getElementById("packages-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1 px-3"
            >
              <CheckCircle2 className="size-3.5" />
              <span>اعتماد الخطة والبدء</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Chassis */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* Hero Section */}
        <ProposalHero
          proposal={proposal}
          agencyName={agencyInfo?.name || "H2M Media Agency"}
          subdomain={agencyInfo?.subdomain || "h2m"}
        />

        {/* Audit & Findings */}
        <ProposalAuditSection auditItems={proposal.auditItems} />

        {/* Interactive Funnel & ROI Calculator */}
        <ProposalFunnelCalculator config={proposal.funnelConfig} currency={proposal.currency} />

        {/* Proposed Architecture Modules */}
        <ProposalSolutionSection modules={proposal.solutionModules} />

        {/* 14-Day Timeline */}
        <ProposalTimelineSection timeline={proposal.timeline} />

        {/* Packages & Deal Closing */}
        <div id="packages-section">
          <ProposalPackagesSection
            packages={proposal.packages}
            currency={proposal.currency}
            isAccepted={proposal.status === "ACCEPTED"}
            acceptedPackageId={proposal.acceptedPackageId}
            onSelectPackage={handleSelectPackage}
          />
        </div>

        {/* Footer Guarantee */}
        <div className="p-6 rounded-2xl bg-muted/30 border border-border/50 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            تم إعداد هذه الخطة بواسطة وكيل النمو المعتمد ومدعومة بنظام تشغيل التجارة والتعليم على منصة MaxP.
          </p>
          <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground/80 font-medium">
            <span className="font-mono" dir="ltr">MaxP Growth Engine</span>
            <span>•</span>
            <span>جميع الحقوق محفوظة <span className="tabular-nums">2026</span></span>
          </div>
        </div>
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
