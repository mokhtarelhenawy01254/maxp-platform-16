import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Play,
  Pause,
  BarChart3,
  Award,
  CheckCircle2,
  Loader2,
  FlaskConical,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  facebookAdsService,
  FacebookAdTest,
} from "../../services/facebookAdsService";
import { ABTestVariantCard } from "./ABTestVariantCard";

export const ABTestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<FacebookAdTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (id) {
      loadTest();
    }
  }, [id]);

  const loadTest = async () => {
    try {
      setLoading(true);
      const data = await facebookAdsService.getAdTest(id!);
      setTest(data);
    } catch (error: any) {
      console.error("Error loading test:", error);
      toast.error(error?.response?.data?.error || "فشل في تحميل الاختبار");
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async () => {
    if (!id) return;
    try {
      await facebookAdsService.startAdTest(id);
      tToast.success("ABTestDetails.msg_86d5");
      loadTest();
    } catch (error: any) {
      console.error("Error starting test:", error);
      toast.error(error?.response?.data?.error || "فشل في بدء الاختبار");
    }
  };

  const handlePauseTest = async () => {
    if (!id) return;
    try {
      await facebookAdsService.pauseAdTest(id);
      tToast.success("ABTestDetails.msg_8980");
      loadTest();
    } catch (error: any) {
      console.error("Error pausing test:", error);
      toast.error(error?.response?.data?.error || "فشل في إيقاف الاختبار");
    }
  };

  const handleAnalyze = async () => {
    if (!id) return;
    try {
      setAnalyzing(true);
      const result = await facebookAdsService.analyzeAdTest(id);
      setAnalysis(result.analysis);
      setTest(result.test);
      tToast.success("ABTestDetails.msg_bb33");
    } catch (error: any) {
      console.error("Error analyzing test:", error);
      toast.error(error?.response?.data?.error || "فشل في تحليل النتائج");
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePromoteWinner = async () => {
    if (!id) return;
    if (
      !window.confirm(
        "هل أنت متأكد من تعزيز الفائز؟ سيتم إيقاف المتغيرات الأخرى.",
      )
    )
      return;

    try {
      await facebookAdsService.promoteWinner(id);
      tToast.success("ABTestDetails.msg_5e37");
      loadTest();
    } catch (error: any) {
      console.error("Error promoting winner:", error);
      toast.error(error?.response?.data?.error || "فشل في تعزيز الفائز");
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      DRAFT: "bg-muted text-muted-foreground border-border/60",
      RUNNING: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      PAUSED: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      COMPLETED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      ARCHIVED: "bg-muted text-muted-foreground border-border/60",
    };
    return badges[status] || "bg-muted text-muted-foreground border-border/60";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: "مسودة",
      RUNNING: "قيد التشغيل",
      PAUSED: "متوقف",
      COMPLETED: "مكتمل",
      ARCHIVED: "مؤرشف",
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="mt-2 text-xs text-muted-foreground">جاري تحميل بيانات الاختبار...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center">
        <FlaskConical className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm font-medium text-foreground">الاختبار غير موجود</p>
        <button
          onClick={() => navigate("/advertising/facebook-ads/tests")}
          className="mt-3 px-3 py-1.5 text-xs rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors"
        >
          العودة للاختبارات
        </button>
      </div>
    );
  }

  const variants = test.variantsList || [];

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-background">
      {/* 1. TOP COMMAND BAR */}
      <header className="h-auto min-h-12 border-b border-border/70 px-3 sm:px-4 py-2 bg-card/95 backdrop-blur-md flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => navigate("/advertising/facebook-ads/tests")}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="رجوع"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {test.name}
              </h1>
              <span
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${getStatusBadge(test.status)}`}
              >
                {getStatusLabel(test.status)}
              </span>
            </div>
            {test.description && (
              <p className="text-[11px] text-muted-foreground truncate max-w-md">
                {test.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {test.status === "DRAFT" && (
            <button
              onClick={handleStartTest}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-[0.97]"
            >
              <Play className="h-3.5 w-3.5" />
              <span>بدء الاختبار</span>
            </button>
          )}
          {test.status === "RUNNING" && (
            <>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-foreground bg-muted/60 hover:bg-muted border border-border/70 transition-all active:scale-[0.97] disabled:opacity-50"
              >
                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{analyzing ? "جارٍ التحليل..." : "تحليل النتائج"}</span>
              </button>
              <button
                onClick={handlePauseTest}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all active:scale-[0.97]"
              >
                <Pause className="h-3.5 w-3.5" />
                <span>إيقاف</span>
              </button>
            </>
          )}
          {test.status === "PAUSED" && (
            <button
              onClick={handleStartTest}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-[0.97]"
            >
              <Play className="h-3.5 w-3.5" />
              <span>استئناف</span>
            </button>
          )}
          {test.winnerVariantId && test.status === "RUNNING" && (
            <button
              onClick={handlePromoteWinner}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.97]"
            >
              <Award className="h-3.5 w-3.5" />
              <span>تعزيز الفائز</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. CHASSIS SURFACE BODY */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-background divide-y divide-border/60">
        
        {/* Strip 1: Metadata Ribbon */}
        <section className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-muted/10">
          <div className="p-2.5 rounded-md border border-border/60 bg-card">
            <span className="text-[11px] text-muted-foreground">نوع الاختبار</span>
            <div className="mt-0.5 text-xs sm:text-sm font-semibold font-mono text-foreground">
              {test.testType}
            </div>
          </div>
          <div className="p-2.5 rounded-md border border-border/60 bg-card">
            <span className="text-[11px] text-muted-foreground">عدد المتغيرات</span>
            <div className="mt-0.5 text-xs sm:text-sm font-semibold font-mono text-foreground tabular-nums">
              {variants.length}
            </div>
          </div>
          <div className="p-2.5 rounded-md border border-border/60 bg-card">
            <span className="text-[11px] text-muted-foreground">توزيع الترافيك</span>
            <div className="mt-0.5 text-xs sm:text-sm font-semibold font-mono text-foreground tabular-nums">
              {test.trafficSplit}% / {100 - (test.trafficSplit || 50)}%
            </div>
          </div>
          <div className="p-2.5 rounded-md border border-border/60 bg-card">
            <span className="text-[11px] text-muted-foreground">مستوى الثقة</span>
            <div className="mt-0.5 text-xs sm:text-sm font-semibold font-mono text-primary tabular-nums">
              {test.confidenceLevel ? `${test.confidenceLevel.toFixed(1)}%` : "قيد الحساب"}
            </div>
          </div>
        </section>

        {/* Strip 2: Aggregated Statistics */}
        {(test.totalImpressions ?? 0) > 0 && (
          <section className="p-3 sm:p-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
              الإحصائيات الإجمالية
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="p-3 rounded-md border border-border/60 bg-card">
                <span className="text-[11px] text-muted-foreground">المشاهدات</span>
                <div className="mt-1 text-base sm:text-lg font-bold font-mono text-foreground tabular-nums">
                  {(test.totalImpressions ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-md border border-border/60 bg-card">
                <span className="text-[11px] text-muted-foreground">النقرات</span>
                <div className="mt-1 text-base sm:text-lg font-bold font-mono text-foreground tabular-nums">
                  {(test.totalClicks ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-md border border-border/60 bg-card">
                <span className="text-[11px] text-muted-foreground">التحويلات</span>
                <div className="mt-1 text-base sm:text-lg font-bold font-mono text-foreground tabular-nums">
                  {(test.totalConversions ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-md border border-border/60 bg-card">
                <span className="text-[11px] text-muted-foreground">الإنفاق الإجمالي</span>
                <div className="mt-1 text-base sm:text-lg font-bold font-mono text-foreground tabular-nums">
                  {(test.totalSpend ?? 0).toFixed(2)} ج.م
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Strip 3: Statistical Analysis Results */}
        {analysis && (
          <section className="p-3 sm:p-4 space-y-2.5">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              نتائج التحليل الإحصائي
            </h2>
            <div className="p-3.5 rounded-md border border-border/70 bg-card space-y-2.5">
              {analysis.pValue !== null && (
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div>
                    <span className="text-xs font-semibold text-foreground">القيمة الإحصائية (P-value)</span>
                    {analysis.isSignificant && (
                      <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>معنوية إحصائياً (مستوى ثقة 95%)</span>
                      </div>
                    )}
                  </div>
                  <div className="text-base font-bold font-mono text-primary tabular-nums">
                    {Number(analysis.pValue).toFixed(4)}
                  </div>
                </div>
              )}
              {analysis.winner && (
                <div className="p-2.5 rounded bg-emerald-500/[0.06] border border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-foreground">
                      {analysis.winner.winner === "VARIANT_A" ? "Variant A" : "Variant B"}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    تحسن بنسبة {analysis.winner.improvement}%
                  </span>
                </div>
              )}
              {analysis.recommendation && (
                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border/40">
                  <span className="font-semibold text-foreground">التوصية: </span>
                  {analysis.recommendation}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Strip 4: Variants List */}
        <section className="divide-y divide-border/60">
          <div className="px-3 sm:px-4 py-2 bg-muted/20 flex items-center justify-between">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              المتغيرات ({variants.length})
            </h2>
          </div>
          {variants.map((variant) => (
            <ABTestVariantCard key={variant.id} variant={variant} />
          ))}
        </section>

      </main>
    </div>
  );
};

export default ABTestDetails;
