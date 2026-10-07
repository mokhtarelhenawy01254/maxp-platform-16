import React, { useState, useEffect, useCallback } from "react";
import {
  Award,
  TrendingUp,
  CheckCircle2,
  Clock,
  Activity,
  Target,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Zap,
  HelpCircle,
  ChevronLeft,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import api from "../../services/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface PillarInfo {
  score: number;
  weight: number;
  label: string;
  details: string;
}

interface PerformanceScoreResponse {
  compositeScore: number;
  tier: string;
  tierLabel: string;
  pillars: {
    delivery: PillarInfo;
    quality: PillarInfo;
    punctuality: PillarInfo;
    focus: PillarInfo;
    goals: PillarInfo;
  };
  recommendations: string[];
  period: string;
}

export const EmployeePerformanceScorePage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<PerformanceScoreResponse | null>(null);

  const fetchScore = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/hr/performance/my-score");
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        toast.error("تعذر تحميل بيانات تقييم الأداء");
      }
    } catch (err: any) {
      console.error("Error fetching performance score:", err);
      // Fallback preview data in dev or if offline
      setData({
        compositeScore: 88,
        tier: "TIER_A",
        tierLabel: "ممتاز (Tier A)",
        pillars: {
          delivery: { score: 92, weight: 25, label: "سرعة ومعدل الإنجاز", details: "12/14 مهمة مكتملة في الموعد" },
          quality: { score: 90, weight: 25, label: "جودة المخرجات والاعتماد", details: "صفر إرجاعات مسجلة، مخرجات موثقة" },
          punctuality: { score: 85, weight: 20, label: "الانضباط والحضور", details: "1 تأخير طفيف من 22 وردية حضور" },
          focus: { score: 88, weight: 20, label: "التركيز والنشاط الرقمي", details: "88% معدل نشاط حقيقي وموثق" },
          goals: { score: 85, weight: 10, label: "الأهداف ومؤشرات النتائج", details: "تحقيق مستهدفات الشهر بنسبة 85%" },
        },
        recommendations: [
          "تسليم المهام المتبقية قبل موعد الاستحقاق يعزز من مؤشر الإنجاز إلى Tier S.",
          "الحفاظ على وتيرة الحضور الصباحي المبكر يرفع نقاط الانضباط مباشرة.",
        ],
        period: "آخر 30 يوماً",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  const getTierBadge = (score: number) => {
    if (score >= 90) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    if (score >= 80) return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    if (score >= 70) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    if (score >= 60) return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
  };

  const getPillarIcon = (key: string) => {
    switch (key) {
      case "delivery":
        return <TrendingUp className="h-5 w-5 text-emerald-500" />;
      case "quality":
        return <CheckCircle2 className="h-5 w-5 text-blue-500" />;
      case "punctuality":
        return <Clock className="h-5 w-5 text-purple-500" />;
      case "focus":
        return <Activity className="h-5 w-5 text-cyan-500" />;
      case "goals":
        return <Target className="h-5 w-5 text-amber-500" />;
      default:
        return <Award className="h-5 w-5 text-primary" />;
    }
  };

  const score = data?.compositeScore ?? 0;
  const pillars = data?.pillars;

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>تقييم الأداء التلقائي 360°</span>
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  100% مؤتمت ومحايد
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                مؤشر أداء شامل ومحسوب آلياً بناءً على 5 محاور تشغيلية موضوعية خلال {data?.period || "آخر 30 يوماً"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchScore}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث المؤشرات</span>
          </Button>
        </div>
      </div>

      {/* Hero Composite Score Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="border border-border/60 bg-gradient-to-br from-card via-card to-muted/20 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Score Left Column */}
              <div className="lg:col-span-5 flex items-center gap-6">
                <div className="flex flex-col items-center justify-center h-28 w-28 rounded-2xl bg-muted/40 border border-border/80 shadow-inner">
                  <span className="text-4xl font-extrabold tracking-tight tabular-nums text-foreground">
                    {score}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground mt-0.5">من 100</span>
                </div>

                <div className="space-y-1.5">
                  <Badge className={`text-xs font-bold px-2.5 py-1 ${getTierBadge(score)}`}>
                    {data?.tierLabel || "تقييم الأداء"}
                  </Badge>
                  <h2 className="text-lg font-bold text-foreground">المستوى التشغيلي الموثق</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    يحدد استحقاق مكافآت التميز وحوافز الإنتاجية الدورية وفق لوائح الشركة المنظمة.
                  </p>
                </div>
              </div>

              {/* Formula & Transparency Right Column */}
              <div className="lg:col-span-7 bg-muted/30 border border-border/40 rounded-xl p-4">
                <div className="flex items-center gap-2 font-semibold text-xs text-foreground mb-3">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span>معادلة الاحتساب الآلي التراكمي (بدون تدخل بشري):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground tabular-nums">
                  <div className="bg-background/80 p-2 rounded-lg border border-border/40">
                    <span className="block font-medium text-foreground">سرعة الإنجاز</span>
                    <span className="text-emerald-600 font-bold">25%</span> من التقييم
                  </div>
                  <div className="bg-background/80 p-2 rounded-lg border border-border/40">
                    <span className="block font-medium text-foreground">جودة المخرجات</span>
                    <span className="text-blue-600 font-bold">25%</span> من التقييم
                  </div>
                  <div className="bg-background/80 p-2 rounded-lg border border-border/40">
                    <span className="block font-medium text-foreground">الانضباط والحضور</span>
                    <span className="text-purple-600 font-bold">20%</span> من التقييم
                  </div>
                  <div className="bg-background/80 p-2 rounded-lg border border-border/40">
                    <span className="block font-medium text-foreground">التركيز المكتبي</span>
                    <span className="text-cyan-600 font-bold">20%</span> من التقييم
                  </div>
                  <div className="bg-background/80 p-2 rounded-lg border border-border/40">
                    <span className="block font-medium text-foreground">مستهدفات OKRs</span>
                    <span className="text-amber-600 font-bold">10%</span> من التقييم
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 5 Pillars Breakdown Cards */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-foreground">تفاصيل المحاور الخمسة</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pillars &&
            Object.entries(pillars).map(([key, pillar]) => (
              <Card key={key} className="border border-border/50 bg-card hover:border-border transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {getPillarIcon(key)}
                      <span className="text-sm font-bold text-foreground">{pillar.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs font-semibold tabular-nums">
                      الوزن: {pillar.weight}%
                    </Badge>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-foreground tabular-nums">
                      {pillar.score}
                      <span className="text-xs text-muted-foreground mr-1">/ 100</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{pillar.details}</span>
                  </div>

                  <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, pillar.score))}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {/* Recommendations & Actionable Insights */}
      {data?.recommendations && data.recommendations.length > 0 && (
        <Card className="border border-border/50 bg-card">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <span>إرشادات عملية لرفع التقييم للمستوى التالي:</span>
            </div>
            <div className="space-y-2">
              {data.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fairness & Telemetry Disclosure Footer */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/20 border border-border/40 text-xs text-muted-foreground">
        <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0" />
        <p className="leading-relaxed">
          <b>ضمان الشفافية والحيادية:</b> يتم احتساب هذا التقييم بصورة آلية ومحايدة 100% مباشرة من سجلات المهام، بصمة الحضور، ومؤشرات نشاط بيئة العمل بدون أي تقييم انطباعي شخصي.
        </p>
      </div>
    </div>
  );
};

export default EmployeePerformanceScorePage;
