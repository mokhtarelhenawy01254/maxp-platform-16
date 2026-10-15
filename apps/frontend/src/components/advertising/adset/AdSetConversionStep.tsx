import React from "react";
import {
  Globe,
  MessageSquare,
  Phone,
  FileText,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { FacebookPixel } from "../../../services/facebookAdsService";

interface AdSetConversionStepProps {
  conversionLocation: string;
  onConversionLocationChange: (loc: string) => void;
  pixelId: string;
  onPixelIdChange: (id: string) => void;
  conversionEvent: string;
  onConversionEventChange: (event: string) => void;
  performanceGoal: string;
  onPerformanceGoalChange: (goal: string) => void;
  pixels: FacebookPixel[];
  loadingPixels: boolean;
}

const CONVERSION_LOCATIONS = [
  {
    id: "WEBSITE",
    title: "الموقع الإلكتروني",
    description: "إرسال العملاء للشراء مباشرة من المتجر أو الموقع",
    icon: Globe,
    recommended: true,
  },
  {
    id: "MESSAGING_APPS",
    title: "تطبيقات المراسلة (واتساب وماسنجر)",
    description: "بدء محادثات مباشرة للشراء أو حجز الطلبات",
    icon: MessageSquare,
  },
  {
    id: "CALLS",
    title: "مكالمات هاتفية",
    description: "تشجيع العملاء على الاتصال بنشاطك التجاري",
    icon: Phone,
  },
  {
    id: "ON_AD",
    title: "نماذج عملاء فورية (Leads)",
    description: "جمع بيانات العملاء مباشرة داخل فيسبوك وإنستجرام",
    icon: FileText,
  },
];

const CONVERSION_EVENTS = [
  {
    id: "PURCHASE",
    name: "شراء (Purchase)",
    description: "التحسين للعملاء الأكثر احتمالية لإتمام عمليات الدفع والطلب",
    badge: "موصى به للمتاجر",
    recommended: true,
  },
  {
    id: "ADD_TO_CART",
    name: "إضافة إلى السلة (Add to Cart)",
    description: "التحسين للمستخدمين المهتمين بإضافة المنتجات لسلة التسوق",
  },
  {
    id: "INITIATE_CHECKOUT",
    name: "بدء إنهاء الطلب (Initiate Checkout)",
    description: "استهداف من يبدأ مرحلة مراجعة عنوان وبيانات الدفع",
  },
  {
    id: "LEAD",
    name: "تسجيل عميل محتمل (Lead)",
    description: "تسجيل استفسار، نموذج طلب، أو اشتراك",
  },
  {
    id: "VIEW_CONTENT",
    name: "مشاهدة صفحة منتج (View Content)",
    description: "زيارة صفحات المنتجات والتصفح المعمق",
  },
];

const PERFORMANCE_GOALS = [
  {
    id: "MAXIMIZE_CONVERSIONS",
    title: "أقصى عدد من التحويلات (Maximize Conversions)",
    description: "الحصول على أكبر عدد ممكن من الطلبات ضمن ميزانيتك",
    badge: "الافتراضي الأفضل",
  },
  {
    id: "MAXIMIZE_CONVERSION_VALUE",
    title: "أقصى قيمة أرباح وعائد (Maximize Value / ROAS)",
    description: "التركيز على العملاء الذين ينفقون مبالغ أعلى لزيادة متوسط قيمة الطلب",
  },
  {
    id: "MAXIMIZE_LANDING_PAGE_VIEWS",
    title: "مشاهدات صفحة الهبوط (Landing Page Views)",
    description: "التأكد من أن الأشخاص ينتظرون تحميل الصفحة بالفعل",
  },
];

export const AdSetConversionStep: React.FC<AdSetConversionStepProps> = ({
  conversionLocation,
  onConversionLocationChange,
  pixelId,
  onPixelIdChange,
  conversionEvent,
  onConversionEventChange,
  performanceGoal,
  onPerformanceGoalChange,
  pixels,
  loadingPixels,
}) => {
  return (
    <div className="space-y-6">
      {/* Conversion Location */}
      <div>
        <label className="block text-sm font-bold text-foreground mb-1.5">
          وجهة التحويل (Conversion Location)
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          اختر أين تريد أن يتفاعل العميل ويكمل إجراء الشراء أو التواصل
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CONVERSION_LOCATIONS.map((loc) => {
            const Icon = loc.icon;
            const isSelected = conversionLocation === loc.id;
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => onConversionLocationChange(loc.id)}
                className={`text-right p-4 rounded-xl border transition-all cursor-pointer relative flex items-start gap-3 ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-border/70 hover:border-border bg-card hover:bg-muted/30"
                }`}
              >
                <div
                  className={`p-2.5 rounded-lg shrink-0 ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground">
                      {loc.title}
                    </span>
                    {loc.recommended && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-semibold">
                        موصى به
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {loc.description}
                  </p>
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pixel / Dataset Selection */}
      <div className="pt-4 border-t border-border/60">
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-bold text-foreground">
            البيكسل أو مجموعة البيانات (Meta Dataset / Pixel)
          </label>
          {loadingPixels && (
            <span className="text-xs text-muted-foreground animate-pulse">
              جاري فحص البيكسلات...
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          يستخدم البيكسل لتتبع عمليات الشراء وربط التحويلات بـ Conversions API تلقائياً
        </p>

        {pixels.length === 0 && !loadingPixels ? (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>لم يتم العثور على بيكسل مسجل في هذا الحساب، يمكنك اختيار حدث عام أو ربط البيكسل من إعدادات الربط.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pixels.map((pix) => {
              const isSelected = pixelId === pix.pixelId;
              return (
                <button
                  key={pix.pixelId}
                  type="button"
                  onClick={() => onPixelIdChange(pix.pixelId)}
                  className={`text-right p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                      : "border-border/70 hover:border-border bg-card hover:bg-muted/30"
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-foreground block">
                      {pix.pixelName || "Meta Pixel"}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono dir-ltr block text-right">
                      ID: {pix.pixelId}
                    </span>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Conversion Event */}
      <div className="pt-4 border-t border-border/60">
        <label className="block text-sm font-bold text-foreground mb-1.5">
          حدث التحويل (Conversion Event)
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          الحدث المستهدف الذي ستقوم خوارزميات ميتا بالتحسين والتركيز عليه
        </p>

        <div className="space-y-2">
          {CONVERSION_EVENTS.map((ev) => {
            const isSelected = conversionEvent === ev.id;
            return (
              <label
                key={ev.id}
                onClick={() => onConversionEventChange(ev.id)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-border/70 hover:bg-muted/30 bg-card"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="conversion_event"
                    checked={isSelected}
                    onChange={() => onConversionEventChange(ev.id)}
                    className="w-4 h-4 text-primary focus:ring-primary cursor-pointer accent-primary"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-foreground">
                        {ev.name}
                      </span>
                      {ev.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-semibold">
                          {ev.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                      {ev.description}
                    </p>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Performance Goal v25 */}
      <div className="pt-4 border-t border-border/60">
        <label className="block text-sm font-bold text-foreground mb-1.5 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>هدف الأداء (v25 Performance Goal)</span>
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          الهدف الأساسي لنظام المزايدة (Bidding Engine) في خوارزمية الذكاء الاصطناعي
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PERFORMANCE_GOALS.map((pg) => {
            const isSelected = performanceGoal === pg.id;
            return (
              <button
                key={pg.id}
                type="button"
                onClick={() => onPerformanceGoalChange(pg.id)}
                className={`text-right p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-border/70 hover:border-border bg-card hover:bg-muted/30"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-xs text-foreground">
                      {pg.title}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {pg.description}
                  </p>
                </div>
                {pg.badge && (
                  <span className="mt-2 text-[10px] text-primary font-semibold block">
                    {pg.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
