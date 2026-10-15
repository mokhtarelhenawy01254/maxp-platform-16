import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  Eye,
  Smartphone,
  Monitor,
  RefreshCw,
  Loader2,
  ArrowRight,
  Facebook,
  Instagram,
  MessageCircle,
  Layout,
  Image,
  Info,
  CheckCircle2
} from "lucide-react";
import { facebookAdsService } from "../../services/facebookAdsService";
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";

type PreviewFormat =
  | "DESKTOP_FEED_STANDARD"
  | "MOBILE_FEED_STANDARD"
  | "INSTAGRAM_STANDARD"
  | "INSTAGRAM_STORY"
  | "MESSENGER_MOBILE_INBOX_MEDIA"
  | "RIGHT_COLUMN_STANDARD";

const AdPreview: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedFormat, setSelectedFormat] = useState<PreviewFormat>(
    "MOBILE_FEED_STANDARD",
  );

  const [formData, setFormData] = useState({
    creativeId: "",
  });

  const previewFormats = [
    {
      id: "MOBILE_FEED_STANDARD" as const,
      label: "موبايل - آخر الأخبار (Feed)",
      icon: Smartphone,
      platform: "facebook",
    },
    {
      id: "DESKTOP_FEED_STANDARD" as const,
      label: "سطح المكتب - آخر الأخبار",
      icon: Monitor,
      platform: "facebook",
    },
    {
      id: "INSTAGRAM_STANDARD" as const,
      label: "انستجرام - المنشورات (Feed)",
      icon: Instagram,
      platform: "instagram",
    },
    {
      id: "INSTAGRAM_STORY" as const,
      label: "انستجرام - القصص (Story)",
      icon: Smartphone,
      platform: "instagram",
    },
    {
      id: "MESSENGER_MOBILE_INBOX_MEDIA" as const,
      label: "ماسنجر - الوسائط والوارد",
      icon: MessageCircle,
      platform: "messenger",
    },
    {
      id: "RIGHT_COLUMN_STANDARD" as const,
      label: "العمود الجانبي الأيمن",
      icon: Layout,
      platform: "facebook",
    },
  ];

  const handlePreview = async () => {
    if (!formData.creativeId.trim()) {
      tToast.error("AdPreview.msg_068f");
      return;
    }

    try {
      setLoading(true);
      const result = await facebookAdsService.getAdPreview(
        formData.creativeId,
        selectedFormat,
      );
      setPreviewData(result);
      tToast.success("AdPreview.success_load_bb63");
    } catch (error: any) {
      console.error("Error loading preview:", error);
      toast.error(error?.response?.data?.error || "فشل في تحميل المعاينة الإعلانية");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <FacebookAdsModuleNav />

      {/* Header Chassis */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/advertising/facebook-ads")}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div className="space-y-0.5 text-right">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              معاينة الإعلانات الحية
            </h1>
            <p className="text-xs text-muted-foreground">
              فحص مظهر وتنسيق إعلاناتك عبر منصات وتطبيقات Meta المختلفة قبل الاعتماد
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Settings Panel */}
        <div className="space-y-5 lg:col-span-5">
          {/* Creative ID Input Card */}
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              معرف التصميم الإبداعي (Creative ID)
            </h2>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">
                  معرف الإعلان أو التصميم *
                </label>
                <input
                  type="text"
                  value={formData.creativeId}
                  onChange={(e) => setFormData({ creativeId: e.target.value })}
                  placeholder="مثال: act_12345_cr_987654"
                  className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <button
                onClick={handlePreview}
                disabled={loading || !formData.creativeId.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>جاري جلب المعاينة...</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    <span>عرض المعاينة الحية</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Format Selection Card */}
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              موضع ومنصة العرض
            </h2>

            <div className="space-y-2">
              {previewFormats.map((format) => {
                const Icon = format.icon;
                const isSelected = selectedFormat === format.id;

                return (
                  <button
                    key={format.id}
                    onClick={() => {
                      setSelectedFormat(format.id);
                      if (previewData) void handlePreview();
                    }}
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-right transition-colors ${
                      isSelected
                        ? "border-primary/30 bg-primary/10 text-primary shadow-xs"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-xs font-medium">{format.label}</span>
                    </div>
                    {format.platform === "instagram" && (
                      <Instagram className="h-4 w-4 text-pink-500" />
                    )}
                    {format.platform === "facebook" && (
                      <Facebook className="h-4 w-4 text-blue-500" />
                    )}
                    {format.platform === "messenger" && (
                      <MessageCircle className="h-4 w-4 text-violet-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tips Card without emoji */}
          <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Info className="h-4 w-4 text-primary" />
              <span>إرشادات الجودة للمعاينة</span>
            </div>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <li>• تأكد من ظهور النصوص والوسائط بوضوح بدون اقتصاص.</li>
              <li>• راجع روابط الهبوط وزر الحث على اتخاذ الإجراء (CTA).</li>
              <li>• اختبر التناسق في كل من موجز الموبايل وسطح المكتب.</li>
            </ul>
          </div>
        </div>

        {/* Preview Screen Panel */}
        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-semibold text-foreground">شاشة العرض الافتراضية</h2>
              </div>
              {previewData && (
                <button
                  onClick={handlePreview}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                  title="تحديث المعاينة"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex min-h-[480px] items-center justify-center bg-muted/10 p-6">
              {loading ? (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="font-mono text-xs">جاري تجهيز وعرض المعاينة من Meta...</p>
                </div>
              ) : previewData ? (
                <div className="w-full max-w-md">
                  <div
                    className={`mx-auto ${
                      selectedFormat.includes("MOBILE") || selectedFormat.includes("STORY")
                        ? "max-w-[360px]"
                        : "max-w-full"
                    }`}
                  >
                    {selectedFormat.includes("STORY") ? (
                      <div className="rounded-3xl border border-border/80 bg-background p-2.5 shadow-xl">
                        <div className="aspect-[9/16] overflow-hidden rounded-2xl bg-muted/40">
                          {previewData.body ? (
                            <div dangerouslySetInnerHTML={{ __html: previewData.body }} />
                          ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">
                              <Image className="h-12 w-12 opacity-40" />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : selectedFormat.includes("MOBILE") ? (
                      <div className="rounded-3xl border border-border/80 bg-background p-3 shadow-xl">
                        <div className="overflow-hidden rounded-2xl bg-muted/40">
                          {previewData.body ? (
                            <div dangerouslySetInnerHTML={{ __html: previewData.body }} />
                          ) : (
                            <div className="flex aspect-square items-center justify-center text-muted-foreground">
                              <Image className="h-12 w-12 opacity-40" />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-border/80 bg-background shadow-md">
                        {previewData.body ? (
                          <div dangerouslySetInnerHTML={{ __html: previewData.body }} />
                        ) : (
                          <div className="flex aspect-video items-center justify-center text-muted-foreground">
                            <Image className="h-12 w-12 opacity-40" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-center text-muted-foreground">
                  <Eye className="mx-auto h-12 w-12 opacity-30" />
                  <p className="text-xs font-medium text-foreground">
                    أدخل معرف الإعلان لاختبار المعاينة الحية
                  </p>
                  <p className="text-[11px]">
                    يمكنك نسخ المعرف من مدير الحملات الإعلانية في المنصة
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdPreview;
