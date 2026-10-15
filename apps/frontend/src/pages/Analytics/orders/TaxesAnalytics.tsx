import React, { useState } from "react";
import {
  Receipt,
  Percent,
  ShieldCheck,
  RefreshCw,
  Scale,
  CheckCircle2,
  FileText,
  Sliders,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import PeriodSelector, { PeriodRange } from "../../../components/common/PeriodSelector";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { useCurrency } from "../../../hooks/useCurrency";

interface TaxJurisdiction {
  name: string;
  type: string;
  rate: number;
  totalCollected: number;
  ordersCount: number;
  status: "active" | "exempt" | "pending";
}

const taxJurisdictions: TaxJurisdiction[] = [
  { name: "ضريبة القيمة المضافة (VAT القياسية)", type: "ضريبة مبيعات عامة", rate: 14, totalCollected: 0, ordersCount: 0, status: "active" },
  { name: "ضريبة الجدول (سلع استهلاكية ومحددة)", type: "ضريبة جدولية", rate: 5, totalCollected: 0, ordersCount: 0, status: "exempt" },
  { name: "رسوم تنمية الموارد المالية", type: "رسم دمغة وتنمية", rate: 1, totalCollected: 0, ordersCount: 0, status: "exempt" },
  { name: "ضريبة الخصم والتحصيل من المنبع (WHT)", type: "خصم شركات B2B", rate: 1, totalCollected: 0, ordersCount: 0, status: "pending" },
];

const TaxesAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const cards = [
    { title: "إجمالي الضرائب المحصلة", val: formatPrice(0), icon: Receipt, color: "text-emerald-500", sub: "قيد المزامنة مع الفواتير" },
    { title: "متوسط الضريبة للطلب", val: formatPrice(0), icon: Percent, color: "text-blue-500", sub: "متوسط الالتزام الضريبي" },
    { title: "معدل القيمة المضافة الأساسي", val: "14.0%", icon: Scale, color: "text-primary", sub: "النسبة القانونية المعتمدة" },
    { title: "حالة الامتثال والفاتورة", val: "جاهز للربط", icon: ShieldCheck, color: "text-purple-500", sub: "منظومة الفاتورة الإلكترونية" },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">تحليلات الضرائب والالتزام المالي</h1>
            <p className="text-xs text-muted-foreground">تتبع الضرائب المحصلة، معدلات القيمة المضافة، وتقارير الفاتورة الإلكترونية</p>
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

      {/* Tax Jurisdictions & Rates Chassis */}
      <div className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="p-3 bg-muted/20 border-b border-border/70 flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" /> مصفوفة الأوعية والشرائح الضريبية المعتمدة
          </span>
          <span className="text-muted-foreground font-mono tabular-nums">{taxJurisdictions.length} أوعية</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground text-[11px] font-medium">
              <tr>
                <th className="py-2.5 px-3.5">نوع الضريبة / الوعاء</th>
                <th className="py-2.5 px-3.5 text-center">التصنيف</th>
                <th className="py-2.5 px-3.5 text-center">النسبة</th>
                <th className="py-2.5 px-3.5 text-center">المحصل التقديري</th>
                <th className="py-2.5 px-3.5 text-center">الطلبيات الخاضعة</th>
                <th className="py-2.5 px-3.5 text-center">حالة التفعيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {taxJurisdictions.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-3.5 font-medium text-foreground text-sm flex items-center gap-2">
                    <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                    {row.name}
                  </td>
                  <td className="py-2.5 px-3.5 text-center text-muted-foreground font-mono">
                    {row.type}
                  </td>
                  <td className="py-2.5 px-3.5 text-center font-mono font-bold text-foreground tabular-nums">
                    {row.rate}%
                  </td>
                  <td className="py-2.5 px-3.5 text-center font-mono font-semibold text-foreground tabular-nums">
                    {formatPrice(row.totalCollected)}
                  </td>
                  <td className="py-2.5 px-3.5 text-center font-mono tabular-nums text-muted-foreground">
                    {row.ordersCount}
                  </td>
                  <td className="py-2.5 px-3.5 text-center">
                    {row.status === "active" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-mono">
                        <CheckCircle2 className="h-3 w-3" /> نشط
                      </span>
                    ) : row.status === "exempt" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border/70 font-mono">
                        معفي مؤقتاً
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-mono">
                        قيد الإعداد
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 bg-muted/10 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
          <span>يتم احتساب الضرائب تلقائياً استناداً إلى عنوان الشحن ونوعية المنتجات المعرفة بالمتجر</span>
          <span className="text-[11px] font-mono">آخر تحديث للقواعد الضريبية: 2026</span>
        </div>
      </div>

      {/* Integration & E-Invoicing Readiness Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">ربط الفاتورة الإلكترونية الموحدة</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              تتيح لك منصة MaxP إصدار فواتير ضريبية رقمية معتمدة ومطابقة لمواصفات مصلحة الضرائب المصرية وهيئة الزكاة والضريبة والجمارك (ZATCA)، مع إدراج رمز الاستجابة السريع (QR Code) على بوالص الشحن وفواتير الدفع عند الاستلام.
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/50">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-foreground">تحديد الرقم الضريبي والسجل التجاري للمؤسسة</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/50">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-foreground">ربط معدلات الضرائب تلقائياً عبر متجر WooCommerce / المتجر المدمج</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/50">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-foreground">توليد تقارير الإقرار الضريبي الشهرية والربع سنوية بضغطة زر</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">تعليمات التكوين والضبط الضريبي</h3>
            </div>
            <div className="space-y-2.5 text-xs text-muted-foreground">
              <div className="p-2.5 rounded-lg bg-muted/20 border border-border/60">
                <div className="font-semibold text-foreground text-xs mb-1">الأسعار شاملة أم غير شاملة للضريبة؟</div>
                <p className="text-[11px] leading-normal">
                  يمكنك من خلال إعدادات المتجر تحديد ما إذا كانت أسعار المنتجات المعروضة للمستهلك تشمل ضريبة القيمة المضافة تلقائياً أو يتم تفصيلها كبند منفصل في صفحة إتمام الطلب (Checkout).
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/20 border border-border/60">
                <div className="font-semibold text-foreground text-xs mb-1">الإعفاءات الضريبية للكتب والأغذية الأساسية</div>
                <p className="text-[11px] leading-normal">
                  يمكن تعيين تصنيف ضريبي مخصص (Tax Class) لكل منتج على حدة لعزله من وعاء الـ 14% إذا كان خاضعاً للإعفاء القانوني.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TaxesAnalytics;
