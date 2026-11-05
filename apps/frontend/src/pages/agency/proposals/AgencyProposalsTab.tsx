import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  MessageCircle,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { apiClient } from "../../../services/apiClient";
import { AgencyProposal } from "./types";

interface AgencyProposalsTabProps {
  onNavigateToPreview?: (slug: string) => void;
}

export const AgencyProposalsTab: React.FC<AgencyProposalsTabProps> = () => {
  const [proposals, setProposals] = useState<AgencyProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [agencyInfo, setAgencyInfo] = useState<{
    name: string;
    subdomain: string;
    customDomain?: string | null;
  }>({
    name: "H2M Media Agency (شركة H2M)",
    subdomain: "h2m",
  });

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: {
          proposals: AgencyProposal[];
          agencyInfo?: { name: string; subdomain: string; customDomain?: string | null };
        };
      }>("/api/v1/agency/proposals");
      if (res.data?.success) {
        setProposals(res.data.data?.proposals || []);
        if (res.data.data?.agencyInfo) {
          setAgencyInfo(res.data.data.agencyInfo);
        }
      }
    } catch (err: any) {
      console.error("Error fetching proposals:", err);
      toast.error(err?.response?.data?.message || "فشل تحميل قائمة العروض والخطط.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleSeedCodeTreps = async () => {
    setSeeding(true);
    try {
      const res = await apiClient.post<{ success: boolean; message: string; data: AgencyProposal }>(
        "/api/v1/agency/proposals/seed-codetreps"
      );
      if (res.data?.success) {
        toast.success(res.data.message || "تم توليد خطة كود تريبس بنجاح!");
        fetchProposals();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل توليد خطة كود تريبس.");
    } finally {
      setSeeding(false);
    }
  };

  const handleDeleteProposal = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف خطة "${name}"؟`)) return;
    try {
      const res = await apiClient.delete<{ success: boolean }>(`/api/v1/agency/proposals/${id}`);
      if (res.data?.success) {
        toast.success("تم حذف الخطة بنجاح.");
        setProposals((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل حذف الخطة.");
    }
  };

  const getPublicUrl = (slug: string) => {
    const sub = agencyInfo.subdomain || "h2m";
    const hostname = window.location.hostname;
    if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
      return `${window.location.origin}/proposal/${slug}?subdomain=${sub}`;
    }
    if (agencyInfo.customDomain) {
      return `https://${agencyInfo.customDomain}/proposal/${slug}`;
    }
    return `https://${sub}.maxp.online/proposal/${slug}`;
  };

  const copyProposalLink = (slug: string) => {
    const url = getPublicUrl(slug);
    navigator.clipboard.writeText(url);
    toast.success("تم نسخ رابط الخطة إلى الحافظة!");
  };

  const shareWhatsApp = (p: AgencyProposal) => {
    const url = getPublicUrl(p.slug);
    const text = `تحياتي م. ${p.contactPerson || p.clientName}،\nتم إعداد خطة النمو والتشغيل الاستراتيجية لأكاديمية ${p.clientName} على منصة MaxP:\n${url}\nيمكنكم معاينة الأرقام وحاسبة العائد وخريطة التنفيذ التفاعلية مباشرة عبر الرابط.`;
    const targetPhone = p.phone ? `20${p.phone.replace(/^0+/, "")}` : "";
    const waUrl = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  const getStatusBadge = (status: AgencyProposal["status"]) => {
    switch (status) {
      case "ACCEPTED":
        return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold text-[11px]">معتمدة من العميل</Badge>;
      case "VIEWED":
        return <Badge className="bg-primary/20 text-primary border border-primary/30 font-bold text-[11px]">تمت المشاهدة</Badge>;
      case "SENT":
        return <Badge variant="secondary" className="font-bold text-[11px]">تم الإرسال</Badge>;
      case "READY":
        return <Badge variant="outline" className="text-primary font-bold text-[11px]">جاهزة للإرسال</Badge>;
      default:
        return <Badge variant="outline" className="font-bold text-[11px]">مسودة</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-foreground">
              عروض وخطط النمو التفاعلية (Growth Proposals)
            </h2>
            <Badge variant="secondary" className="font-mono font-bold text-xs">
              {proposals.length} خطة
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            صناعة روابط تفاعلية لعملائك تتضمن فحص الثغرات، حاسبة العائد المالي، وباقات التعاقد مع اعتماد بضغطة زر
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] font-bold text-muted-foreground">النطاق والشركة:</span>
            <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md font-mono">
              {agencyInfo.name} ({agencyInfo.subdomain || "h2m"}.maxp.online)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProposals}
            disabled={loading}
            className="h-9 font-bold text-xs"
          >
            <RefreshCw className={`size-3.5 ml-1.5 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>

          <Button
            size="sm"
            onClick={handleSeedCodeTreps}
            disabled={seeding}
            className="h-9 font-black text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30"
          >
            <Sparkles className="size-3.5 ml-1.5" />
            {seeding ? "جاري التوليد..." : "توليد خطة CodeTreps"}
          </Button>
        </div>
      </div>

      {/* Proposals Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-muted-foreground">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          جاري تحميل الخطط...
        </div>
      ) : proposals.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border/70 bg-card p-8 space-y-3">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl w-fit mx-auto">
            <FileText className="size-8" />
          </div>
          <h3 className="font-black text-base">لا توجد عروض أو خطط حتى الآن</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            يمكنك توليد خطة تفاعلية مخصصة لأكاديمية كود تريبس اليوم بنقرة واحدة وإرسالها لهم فوراً.
          </p>
          <Button onClick={handleSeedCodeTreps} disabled={seeding} className="font-bold text-xs">
            <Sparkles className="size-4 ml-1.5" />
            توليد خطة CodeTreps الآن
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proposals.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-border/70 bg-card p-5 space-y-4 hover:border-primary/40 transition-colors shadow-xs flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-primary">{p.industry}</span>
                    <h3 className="font-black text-sm sm:text-base text-foreground leading-snug">
                      {p.title}
                    </h3>
                  </div>
                  {getStatusBadge(p.status)}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium pt-1">
                  <span>العميل: <strong className="text-foreground">{p.clientName}</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="size-3 text-primary" />
                    {new Date(p.createdAt).toLocaleDateString("ar-EG")}
                  </span>
                  {p.viewsCount ? (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-primary font-bold">
                        <Eye className="size-3" />
                        {p.viewsCount} مشاهدات
                      </span>
                    </>
                  ) : null}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {p.executiveSummary}
                </p>

                {/* Audit preview count */}
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs flex items-center justify-between">
                  <span className="text-muted-foreground">ثغرات الرصد (Audit):</span>
                  <span className="font-bold text-foreground font-mono">{p.auditItems?.length || 0} فجوات</span>
                  <span className="text-muted-foreground">خيارات التعاقد:</span>
                  <span className="font-bold text-foreground font-mono">{p.packages?.length || 0} باقات</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyProposalLink(p.slug)}
                    className="h-8 text-xs font-bold gap-1 px-2.5"
                    title="نسخ الرابط"
                  >
                    <Copy className="size-3" />
                    <span>نسخ الرابط</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => shareWhatsApp(p)}
                    className="h-8 text-xs font-bold gap-1 px-2.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    title="مشاركة واتساب"
                  >
                    <MessageCircle className="size-3" />
                    <span>واتساب</span>
                  </Button>

                  <a href={getPublicUrl(p.slug)} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="ghost" className="h-8 text-xs font-bold gap-1 px-2.5">
                      <ExternalLink className="size-3" />
                      <span>فتح</span>
                    </Button>
                  </a>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteProposal(p.id, p.clientName)}
                  className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                  title="حذف الخطة"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
