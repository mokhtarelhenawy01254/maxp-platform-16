import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Eye,
  RotateCcw,
  FlaskConical,
  Sparkles,
  BarChart3,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { facebookAdsService, FacebookAdTest } from "../../services/facebookAdsService";
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

const statusMap: Record<string, { label: string; class: string }> = {
  RUNNING: { label: "قيد التشغيل", class: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  PAUSED: { label: "متوقف مؤقتاً", class: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  DRAFT: { label: "مسودة", class: "bg-muted text-muted-foreground border-border/60" },
  COMPLETED: { label: "مكتمل بحسم", class: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  ARCHIVED: { label: "مؤرشف", class: "bg-muted text-muted-foreground border-border/60" },
};

const ABTestsManagement: React.FC = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<FacebookAdTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED">("all");

  const loadTests = async () => {
    try {
      setLoading(true);
      const data = await facebookAdsService.getAdTests(filter === "all" ? undefined : filter);
      setTests(data || []);
    } catch (error: any) {
      console.error("Error loading tests:", error);
      toast.error(error?.response?.data?.error || "فشل في تحميل الاختبارات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, [filter]);

  const handleStartTest = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await facebookAdsService.startAdTest(id);
      tToast.success("ABTestsManagement.msg_cba6");
      loadTests();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "فشل في بدء الاختبار");
    }
  };

  const handlePauseTest = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await facebookAdsService.pauseAdTest(id);
      tToast.success("ABTestsManagement.msg_e722");
      loadTests();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "فشل في إيقاف الاختبار");
    }
  };

  const handleDeleteTest = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("هل أنت متأكد من حذف هذا الاختبار؟")) return;
    try {
      await facebookAdsService.deleteAdTest(id);
      tToast.success("ABTestsManagement.success_delete_414c");
      loadTests();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "فشل في حذف الاختبار");
    }
  };

  const getTestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CREATIVE: "المحتوى الإبداعي",
      TARGETING: "الجمهور والاستهداف",
      BUDGET: "الميزانية والتوزيع",
      PLACEMENT: "المواضع والمنصات",
    };
    return labels[type] || type || "عام";
  };

  const stats = useMemo(() => {
    const total = tests.length;
    const running = tests.filter((t) => t.status === "RUNNING").length;
    const completed = tests.filter((t) => t.status === "COMPLETED").length;
    const scoredList = tests.filter((t) => t.confidenceLevel !== undefined && t.confidenceLevel !== null);
    const avgConfidence = scoredList.length
      ? Math.round(scoredList.reduce((acc, t) => acc + (t.confidenceLevel || 0), 0) / scoredList.length)
      : 0;
    return { total, running, completed, avgConfidence };
  }, [tests]);

  return (
    <div className="space-y-4 p-4 md:p-6" dir="rtl">
      <FacebookAdsModuleNav />

      {/* Top Chassis Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              اختبارات A/B وتقسيم الزوايا الإعلانية
            </h1>
            <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono tabular-nums bg-muted/40 border-border/70 text-muted-foreground">
              {tests.length} تجربة
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            مقارنة متغيرات الإعلانات، الزوايا التسويقية، والاستهداف لاكتشاف الفائز إحصائياً بأعلى عائد
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadTests} className="h-8 gap-1.5 text-xs border-border/70">
            <RotateCcw className="h-3.5 w-3.5" /> تحديث
          </Button>
          <Button size="sm" onClick={() => navigate("/advertising/facebook-ads/tests/create")} className="h-8 gap-1.5 text-xs font-medium">
            <Plus className="h-3.5 w-3.5" /> إنشاء اختبار جديد
          </Button>
        </div>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>إجمالي التجارب</span>
            <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">{stats.total}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">اختبار مسجل</div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>قيد التشغيل والجمع</span>
            <Play className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-500">{stats.running}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">تجمع بيانات حية</div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>مكتمل بنتيجة حاسمة</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-blue-500">{stats.completed}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">تم تحديد الفائز</div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>متوسط الثقة الإحصائية</span>
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">
            {stats.avgConfidence > 0 ? `${stats.avgConfidence}%` : "—"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Statistical Confidence</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg border border-border/60 bg-muted/20 w-fit">
        {[
          { key: "all", label: "الكل" },
          { key: "RUNNING", label: "قيد التشغيل" },
          { key: "PAUSED", label: "متوقف" },
          { key: "DRAFT", label: "مسودة" },
          { key: "COMPLETED", label: "مكتمل" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filter === tab.key ? "bg-card text-foreground shadow-sm border border-border/60" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tests Single Surface Container */}
      <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
        <div className="p-3 px-4 bg-muted/20 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">سجل اختبارات A/B</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">{tests.length} تجربة</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">جاري تحميل الاختبارات...</div>
        ) : tests.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
            <FlaskConical className="h-8 w-8 mx-auto text-muted-foreground/30" />
            <p className="font-semibold text-foreground">لا توجد اختبارات مسجلة</p>
            <p className="text-muted-foreground">أنشئ اختباراً جديداً لمقارنة زوايا الإعلانات وتحديد الفائز بالأرقام</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {tests.map((test) => {
              const status = statusMap[test.status] || { label: test.status, class: "bg-muted text-muted-foreground border-border/60" };
              return (
                <div
                  key={test.id}
                  onClick={() => navigate(`/advertising/facebook-ads/tests/${test.id}`)}
                  className="p-3.5 px-4 hover:bg-muted/30 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground">{test.name}</h3>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${status.class}`}>
                        {status.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium bg-muted text-muted-foreground border-border/60">
                        {getTestTypeLabel(test.testType)}
                      </Badge>
                    </div>
                    {test.description && <p className="text-xs text-muted-foreground line-clamp-1">{test.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-0.5">
                      {test.variantsList && <span className="font-mono">{test.variantsList.length} متغيرات</span>}
                      {test.totalImpressions > 0 && (
                        <>
                          <span className="font-mono tabular-nums">{test.totalImpressions.toLocaleString()} مشاهدة</span>
                          <span className="font-mono tabular-nums">{test.totalClicks.toLocaleString()} نقرة</span>
                        </>
                      )}
                      {test.confidenceLevel && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
                          {test.confidenceLevel.toFixed(1)}% ثقة إحصائية
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                    {test.status === "DRAFT" && (
                      <Button variant="outline" size="sm" onClick={(e) => handleStartTest(test.id, e)} className="h-7 text-xs gap-1 border-border/70 text-emerald-600">
                        <Play className="h-3 w-3" /> تشغيل
                      </Button>
                    )}
                    {test.status === "RUNNING" && (
                      <Button variant="outline" size="sm" onClick={(e) => handlePauseTest(test.id, e)} className="h-7 text-xs gap-1 border-border/70 text-amber-600">
                        <Pause className="h-3 w-3" /> إيقاف
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => navigate(`/advertising/facebook-ads/tests/${test.id}`)} className="h-7 text-xs gap-1 border-border/70">
                      <Eye className="h-3 w-3" /> التفاصيل
                    </Button>
                    {test.status !== "RUNNING" && (
                      <Button variant="ghost" size="icon" onClick={(e) => handleDeleteTest(test.id, e)} className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ABTestsManagement;
