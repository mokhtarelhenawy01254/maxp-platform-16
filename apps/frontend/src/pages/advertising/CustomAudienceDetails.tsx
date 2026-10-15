import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Trash2,
  Users,
  Calendar,
  Tag,
  Eye,
  RotateCw,
  Layers,
  Percent,
  CheckCircle2,
  Activity,
  Globe
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  facebookAdsService,
  FacebookCustomAudience,
} from "../../services/facebookAdsService";

const CustomAudienceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [audience, setAudience] = useState<FacebookCustomAudience | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAudience = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await facebookAdsService.getCustomAudience(id);
      setAudience(data);
    } catch (error: any) {
      console.error("Error loading audience:", error);
      toast.error(error?.response?.data?.error || "فشل في تحميل تفاصيل الجمهور");
      navigate("/advertising/facebook-ads/audiences");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      void loadAudience();
    }
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    if (
      !confirm(
        "هل أنت متأكد من حذف هذا الجمهور المخصص؟ لا يمكن التراجع عن هذا الإجراء.",
      )
    )
      return;

    try {
      await facebookAdsService.deleteCustomAudience(id);
      tToast.success("CustomAudienceDetails.success_delete_12fd");
      navigate("/advertising/facebook-ads/audiences");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "فشل في حذف الجمهور");
    }
  };

  const getAudienceTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      CUSTOMER_LIST: "قائمة عملاء",
      WEBSITE: "زوار الموقع",
      ENGAGEMENT: "المتفاعلون",
      APP_ACTIVITY: "نشاط التطبيق",
      VIDEO_VIEW: "مشاهدو الفيديو",
    };
    return types[type] || type;
  };

  const getEventTypeLabel = (eventType?: string) => {
    if (!eventType) return "-";
    const types: Record<string, string> = {
      ALL_VISITORS: "جميع الزوار",
      PURCHASE: "المشترون",
      ADD_TO_CART: "أضافوا للسلة",
      VIEW_CONTENT: "استعراض المحتوى",
    };
    return types[eventType] || eventType;
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RotateCw className="h-7 w-7 animate-spin text-primary" />
          <p className="text-xs font-mono">جاري تحميل تفاصيل الجمهور المخصص...</p>
        </div>
      </div>
    );
  }

  if (!audience) {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-12 text-center shadow-sm">
        <p className="text-xs text-muted-foreground">لم يتم العثور على بيانات الجمهور المخصص</p>
        <button
          onClick={() => navigate("/advertising/facebook-ads/audiences")}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          <span>العودة لقائمة الجماهير</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Header Control Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5 text-right">
          <button
            onClick={() => navigate("/advertising/facebook-ads/audiences")}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            <span>العودة لإدارة الجماهير الإعلانية</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {audience.name}
          </h1>
          {audience.description && (
            <p className="text-xs text-muted-foreground">{audience.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs font-medium text-destructive transition-all hover:bg-destructive/20 active:scale-[0.98]"
          >
            <Trash2 className="h-4 w-4" />
            <span>حذف الجمهور</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Telemetry Strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>حالة الجمهور</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Activity className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                audience.status === "ACTIVE"
                  ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                  : "border border-muted-foreground/20 bg-muted/40 text-muted-foreground"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${audience.status === "ACTIVE" ? "bg-emerald-500" : "bg-muted-foreground"}`} />
              {audience.status === "ACTIVE" ? "نشط وجاهز" : "معطل / محذوف"}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>حجم الجمهور التقديري</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-500">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-bold tabular-nums text-foreground">
            {audience.audienceSize ? audience.audienceSize.toLocaleString("en-US") : "—"}
            <span className="mr-1.5 text-xs font-normal text-muted-foreground">مستخدم</span>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>نوع ومصدر الجمهور</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10 text-violet-500">
              <Tag className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-sm font-semibold text-foreground">
            {getAudienceTypeLabel(audience.audienceType)}
          </div>
        </div>
      </div>

      {/* 3. Detailed Technical Specs Chassis */}
      <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-foreground">المعايير والبيانات الفنية</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
            <span className="text-xs text-muted-foreground">معرف الجمهور لدى Meta</span>
            <div className="mt-1 font-mono text-xs font-semibold tabular-nums text-foreground" dir="ltr">
              {audience.facebookAudienceId || "—"}
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
            <span className="text-xs text-muted-foreground">تاريخ الإنشاء والربط</span>
            <div className="mt-1 font-mono text-xs font-semibold text-foreground">
              {new Date(audience.createdAt).toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>

          {audience.audienceType === "WEBSITE" && (
            <>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
                <span className="text-xs text-muted-foreground">معرف البكسل (Pixel ID)</span>
                <div className="mt-1 font-mono text-xs font-semibold tabular-nums text-foreground" dir="ltr">
                  {audience.pixelId || "—"}
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
                <span className="text-xs text-muted-foreground">الحدث المستهدف (Event Type)</span>
                <div className="mt-1 text-xs font-semibold text-foreground">
                  {getEventTypeLabel(audience.eventType)}
                </div>
              </div>

              {audience.retentionDays && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
                  <span className="text-xs text-muted-foreground">فترة الاحتفاظ بالزوار</span>
                  <div className="mt-1 font-mono text-xs font-semibold text-foreground">
                    {audience.retentionDays} يوم
                  </div>
                </div>
              )}
            </>
          )}

          {audience.audienceType === "CUSTOMER_LIST" && audience.customerListId && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
              <span className="text-xs text-muted-foreground">معرف قائمة العملاء</span>
              <div className="mt-1 font-mono text-xs font-semibold tabular-nums text-foreground" dir="ltr">
                {audience.customerListId}
              </div>
            </div>
          )}

          {audience.matchRate !== undefined && audience.matchRate !== null && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
              <span className="text-xs text-muted-foreground">نسبة المطابقة (Match Rate)</span>
              <div className="mt-1 font-mono text-xs font-semibold tabular-nums text-emerald-500">
                {audience.matchRate.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Lookalike Audiences Linked Chassis */}
      {audience.lookalikeAudiences && audience.lookalikeAudiences.length > 0 && (
        <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">الجماهير المشابهة المرتبطة (Lookalike)</h2>
            <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
              {audience.lookalikeAudiences.length}
            </span>
          </div>
          <div className="divide-y divide-border/50 rounded-lg border border-border/60">
            {audience.lookalikeAudiences.map((lookalike) => (
              <div
                key={lookalike.id}
                className="flex items-center justify-between p-3.5 transition-colors hover:bg-muted/10"
              >
                <div className="space-y-0.5 text-right">
                  <div className="text-xs font-semibold text-foreground">{lookalike.name}</div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                    <span>نسبة الشبه: {lookalike.ratio}%</span>
                    <span>•</span>
                    <span>الدولة: {lookalike.country}</span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] ${
                    lookalike.status === "ACTIVE"
                      ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                      : "border border-muted-foreground/20 bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {lookalike.status === "ACTIVE" ? "نشط" : "معطل"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomAudienceDetails;
