import React, { useState } from "react";
import {
  Download,
  FileCode,
  ShieldCheck,
  HardDrive,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Key,
  HelpCircle,
  Clock,
} from "lucide-react";
import PeriodSelector, { PeriodRange } from "../../../components/common/PeriodSelector";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

interface DigitalProductItem {
  id: string;
  name: string;
  fileType: string;
  fileSize: string;
  totalDownloads: number;
  activeLicenses: number;
  status: "active" | "restricted" | "expired";
}

const digitalProducts: DigitalProductItem[] = [
  { id: "dp-01", name: "دليل إتقان الميديا باير والتجارة الإلكترونية", fileType: "PDF Document", fileSize: "14.2 MB", totalDownloads: 0, activeLicenses: 0, status: "active" },
  { id: "dp-02", name: "حزمة قوالب صفحات الهبوط والتحويل (SaaS & COD)", fileType: "ZIP Archive", fileSize: "82.5 MB", totalDownloads: 0, activeLicenses: 0, status: "active" },
  { id: "dp-03", name: "إضافات وأدوات التتبع الإعلاني المتقدم", fileType: "Plugin Package", fileSize: "8.1 MB", totalDownloads: 0, activeLicenses: 0, status: "restricted" },
  { id: "dp-04", name: "كتاب استراتيجيات التسويق المؤثر للمتاجر", fileType: "ePub / PDF", fileSize: "5.4 MB", totalDownloads: 0, activeLicenses: 0, status: "active" },
];

const DownloadsAnalytics: React.FC = () => {
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const cards = [
    { title: "إجمالي عمليات التحميل", val: "0", icon: Download, color: "text-blue-500", sub: "تنزيل آمن للملفات الرقمية" },
    { title: "المنتجات الرقمية المسجلة", val: `${digitalProducts.length}`, icon: FileCode, color: "text-emerald-500", sub: "ملفات، كتب، وحزم برمجية" },
    { title: "معدل التحويل للتحميل", val: "0.0%", icon: HardDrive, color: "text-primary", sub: "نسبة المشترين الفاعلين" },
    { title: "أمان الروابط والتراخيص", val: "100%", icon: ShieldCheck, color: "text-purple-500", sub: "روابط مؤقتة ومشفرة ضد المشاركة" },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">تحليلات المنتجات والتحميلات الرقمية</h1>
            <p className="text-xs text-muted-foreground">تتبع تحميل الملفات الرقمية، صلاحية الروابط، وحماية تراخيص الشراء</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector onRangeChange={setRange} />
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="h-8 gap-1.5 text-xs font-mono border-border/70">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} /> تحديث
          </Button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <Card key={i} className="border-border/70 shadow-sm bg-card">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{c.title}</span><c.icon className={`h-3.5 w-3.5 ${c.color}`} />
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-foreground">{c.val}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Digital Products Downloads Ledger */}
      <div className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="p-3 bg-muted/20 border-b border-border/70 flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" /> قائمة الملفات والمنتجات الرقمية القابلة للتنزيل
          </span>
          <span className="text-muted-foreground font-mono tabular-nums">{digitalProducts.length} منتجات</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground text-[11px] font-medium">
              <tr>
                <th className="py-2.5 px-3.5">اسم المنتج الرقمي</th>
                <th className="py-2.5 px-3.5 text-center">نوع الملف</th>
                <th className="py-2.5 px-3.5 text-center">الحجم</th>
                <th className="py-2.5 px-3.5 text-center">مرات التحميل</th>
                <th className="py-2.5 px-3.5 text-center">التراخيص النشطة</th>
                <th className="py-2.5 px-3.5 text-center">حالة التوفر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {digitalProducts.map((row) => (
                <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-3.5 font-medium text-foreground text-sm flex items-center gap-2">
                    <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
                    {row.name}
                  </td>
                  <td className="py-2.5 px-3.5 text-center text-muted-foreground font-mono">
                    {row.fileType}
                  </td>
                  <td className="py-2.5 px-3.5 text-center font-mono font-semibold text-foreground tabular-nums">
                    {row.fileSize}
                  </td>
                  <td className="py-2.5 px-3.5 text-center font-mono font-bold text-foreground tabular-nums">
                    {row.totalDownloads}
                  </td>
                  <td className="py-2.5 px-3.5 text-center font-mono tabular-nums text-muted-foreground">
                    {row.activeLicenses}
                  </td>
                  <td className="py-2.5 px-3.5 text-center">
                    {row.status === "active" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-mono">
                        <CheckCircle2 className="h-3 w-3" /> متاح للتحميل
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-mono">
                        مقيد بالتراخيص
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 bg-muted/10 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
          <span>يتم توليد روابط التحميل ديناميكياً مع تحديد عدد مرات التنزيل وفترة انتهاء الصلاحية</span>
          <span className="text-[11px] font-mono">حماية ضد تسريب المحتوى الرقمي</span>
        </div>
      </div>

      {/* Security & Access Controls Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Key className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">ضوابط حماية وتأمين التحميلات</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              توفر منصة MaxP آلية تسليم آمنة للملفات الرقمية تضمن وصول العميل للرابط فور تأكيد الدفع الإلكتروني، مع إمكانية تحديد شروط الاستخدام لمنع إعادة التوزيع.
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/50">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-foreground">تحديد حد أقصى لمرات التحميل لكل مشترٍ (مثلاً 3 مرات)</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/50">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-foreground">صلاحية زمنية محددة للرابط (تنتهي تلقائياً بعد 48 ساعة)</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/50">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-foreground">إرسال الروابط فورياً عبر البريد الإلكتروني ورسائل الواتساب</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">إرشادات رفع وإدارة الملفات الكبيرة</h3>
            </div>
            <div className="space-y-2.5 text-xs text-muted-foreground">
              <div className="p-2.5 rounded-lg bg-muted/20 border border-border/60">
                <div className="font-semibold text-foreground text-xs mb-1">الربط مع خدمات التخزين السحابي (Cloud Storage)</div>
                <p className="text-[11px] leading-normal">
                  للملفات التي تتجاوز 100 ميجابايت، يُنصح بربط حسابك السحابي لتسريع معدل نقل البيانات وضمان استقرار التحميل للمستخدمين.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/20 border border-border/60">
                <div className="font-semibold text-foreground text-xs mb-1">تسجيل وتتبع عناوين IP المحملين</div>
                <p className="text-[11px] leading-normal">
                  يقوم النظام بتسجيل عناوين الـ IP الخاصة بالتحميل لمساعدة فريق الدعم في التحقق من صحة طلبات إعادة إصدار الروابط.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DownloadsAnalytics;
