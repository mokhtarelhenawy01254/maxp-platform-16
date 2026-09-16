import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Laptop,
  Check,
  Copy,
  Info,
  ShieldCheck,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuthSimple";
import { DesktopMonitorCard } from "./downloads/DesktopMonitorCard";
import { MobileCompanionCard } from "./downloads/MobileCompanionCard";
import { MerchantStudioCard } from "./downloads/MerchantStudioCard";
import { EnterpriseSpecsBanner } from "./downloads/EnterpriseSpecsBanner";

export const AppDownloadsPage: React.FC = () => {
  const { user } = useAuth();
  const [copiedAll, setCopiedAll] = useState(false);

  const companyToken = (user?.company as any)?.id || (user as any)?.companyId || "";
  const companyName = (user?.company as any)?.name || "مؤسستك";

  const handleCopyDeploymentPack = () => {
    const text = `حزمة روابط تطبيقات MaxP لمنشأة: ${companyName}
1. تطبيق مراقبة وإنتاجية سطح المكتب (Windows):
https://github.com/elhenawym124-ops/maxp-platform-10/releases/latest/download/MaxP-Monitor-Setup.exe
أو أمر التثبيت المباشر: winget install --id MaxP.EmployeeMonitor

2. تطبيق الموبايل (Android APK):
https://maxp.online/downloads/maxp-mobile-latest.apk
رابط الويب السريع: https://maxp.online

رمز المنشأة المرجعي: ${companyToken}`;

    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    toast.success("تم نسخ حزمة النشر لجميع الموظفين");
    setTimeout(() => setCopiedAll(false), 2500);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Control Bar (Single Surface Chassis) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <Link
              to="/marketplace"
              className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="العودة لمتجر التطبيقات"
            >
              <ArrowRight className="size-4 rtl:rotate-0 ltr:rotate-180" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-foreground">مركز تحميل تطبيقات المنظومة</h1>
                <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  Desktop &amp; Mobile Hub
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                تطبيقات سطح المكتب والموبايل المهيأة لحساب المنشأة مع التحديث التلقائي الصامت
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyDeploymentPack}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98]"
            >
              {copiedAll ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              <span>نسخ دليل الروابط لمشاركته مع الفريق</span>
            </button>
          </div>
        </div>

        {/* Primary Applications Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DesktopMonitorCard companyToken={companyToken} />
          <MobileCompanionCard />
        </div>

        {/* Secondary Applications & POS Studio */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MerchantStudioCard />

          {/* IT Admin Onboarding Tips Card */}
          <div className="flex flex-col justify-between rounded-xl border border-border/40 bg-card p-5 sm:p-6 shadow-sm">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-muted text-muted-foreground">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">نصائح النشر والإدارة المركزية (IT / MDM)</h3>
                  <span className="text-[11px] text-muted-foreground">خيارات الإعداد المسبق لمدراء الشركات</span>
                </div>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                  <span className="font-semibold text-foreground block mb-1">
                    1. التحديث التلقائي بدون تدخل الموظف (Zero IT Maintenance):
                  </span>
                  تطبيق سطح المكتب يفحص الإصدارات الجديدة صامتاً كل ساعتين، ويقوم بتنزيل الحزمة التراكمية في الخلفية، ويُطبّقها فور إعادة تشغيل الجهاز دون مقاطعة المهام.
                </div>

                <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                  <span className="font-semibold text-foreground block mb-1">
                    2. التشغيل الإجباري التلقائي (Enforced Auto-Start):
                  </span>
                  يتم إدراج التطبيق تلقائياً في قائمة بدء التشغيل بالنظام (`openAtLogin`)، مع إخفاء أي أزرار تسمح للموظف بإيقاف المراقبة يدوياً.
                </div>

                <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                  <span className="font-semibold text-foreground block mb-1">
                    3. التثبيت الصامت عبر موجه الأوامر (Active Directory / GPO):
                  </span>
                  يمكن لمسؤولي النظم تشغيل ملف التثبيت بالمعامل <code className="rounded bg-muted px-1 font-mono text-foreground">/S</code> لتثبيته في الخلفية على مئات الأجهزة دفعة واحدة.
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/30 text-[11px] text-muted-foreground flex items-center gap-2">
              <Info className="size-3.5 text-primary shrink-0" />
              <span>
                للحصول على مساعدة في الربط الجماعي عبر Active Directory، تواصل مع الدعم الفني للمنصة.
              </span>
            </div>
          </div>
        </div>

        {/* Technical Guarantees & Telemetry Banner */}
        <div className="pt-2">
          <EnterpriseSpecsBanner />
        </div>
      </div>
    </div>
  );
};

export default AppDownloadsPage;
