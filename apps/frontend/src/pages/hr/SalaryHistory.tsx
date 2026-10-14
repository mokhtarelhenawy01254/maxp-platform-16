import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Sparkles,
  Calendar,
  User,
  ShieldAlert,
  ArrowRight,
  DollarSign,
  Percent,
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import api from "../../services/api";
import { tToast } from "../../utils/i18n-toast";

interface SalaryHistoryItem {
  id: string;
  userId?: string;
  previousSalary: number;
  newSalary: number;
  changeType: string;
  changePercentage?: number;
  effectiveDate: string;
  reason?: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber?: string | null;
  } | null;
}

const SalaryHistory: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [history, setHistory] = useState<SalaryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("ALL");

  useEffect(() => {
    fetchHistory();
  }, [employeeId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      if (employeeId) {
        const response = await api.get(
          `/hr/salary-history/employee/${employeeId}`,
        );
        setHistory(response.data.history || []);
      } else {
        const response = await api.get("/hr/salary-history?limit=100&page=1");
        setHistory(response.data.history || []);
      }
    } catch (error) {
      console.error("Error fetching salary history:", error);
      tToast.error("SalaryHistory.failed_fetch_2afd");
    } finally {
      setLoading(false);
    }
  };

  const getChangeTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      promotion: "ترقية استثنائية",
      annual_increase: "زيادة سنوية",
      adjustment: "تعديل إداري",
      demotion: "تخفيض درجة",
    };
    return typeMap[type] || type;
  };

  const filteredHistory = useMemo(() => {
    if (selectedType === "ALL") return history;
    return history.filter((item) => item.changeType === selectedType);
  }, [history, selectedType]);

  const stats = useMemo(() => {
    const total = history.length;
    const increases = history.filter(
      (h) => (h.changePercentage && h.changePercentage > 0) || h.newSalary > h.previousSalary,
    ).length;
    const decreases = history.filter(
      (h) => (h.changePercentage && h.changePercentage < 0) || h.newSalary < h.previousSalary,
    ).length;
    const latest = history[0]?.newSalary || 0;
    return { total, increases, decreases, latest };
  }, [history]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground font-mono">
            جاري تحميل سجل تعديلات الرواتب...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6" dir="rtl">
      {/* Top Chassis Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div className="flex items-center gap-3">
          {employeeId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 border border-border/60 hover:bg-muted/40"
              onClick={() => navigate(-1)}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                سجل تعديلات الرواتب
              </h1>
              <Badge
                variant="outline"
                className="text-xs px-2 py-0.5 font-mono tabular-nums bg-muted/40 border-border/70 text-muted-foreground"
              >
                {filteredHistory.length} حركة
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {employeeId
                ? "تاريخ التغييرات والترقيات المالية للموظف المحدد"
                : "تاريخ تعديلات الرواتب والترقيات المالية عبر الشركة"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHistory}
            className="h-8 gap-1.5 text-xs border-border/70"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            تحديث
          </Button>
        </div>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>إجمالي الحركات</span>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">
            {stats.total}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            تعديلات مدققة
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>زيادات وترقيات</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-500">
            {stats.increases}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            تعديل بالزيادة
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>تخفيضات وتسويات</span>
            <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-rose-500">
            {stats.decreases}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            تعديل بالإنزال
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>آخر راتب مقيد</span>
            <DollarSign className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">
            {stats.latest.toLocaleString()}
            <span className="text-xs font-normal text-muted-foreground mr-1">
              ج.م
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            أحدث قيمة جارية
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg border border-border/60 bg-muted/20 w-fit">
        {[
          { key: "ALL", label: "الكل" },
          { key: "promotion", label: "الترقيات" },
          { key: "annual_increase", label: "الزيادات السنوية" },
          { key: "adjustment", label: "التعديلات" },
          { key: "demotion", label: "الإنزالات" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedType(tab.key)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              selectedType === tab.key
                ? "bg-card text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Salary History Single Surface */}
      <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
        <div className="p-3 px-4 bg-muted/20 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              سجل التعديلات والقرارات المالية
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {filteredHistory.length} قرار
          </span>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
            <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p>لا توجد تعديلات مسجلة مطابقة للفلتر المحدد</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredHistory.map((item) => {
              const isIncrease = item.newSalary > item.previousSalary;
              const isDecrease = item.newSalary < item.previousSalary;
              const diff = item.newSalary - item.previousSalary;

              return (
                <div
                  key={item.id}
                  className="p-3.5 px-4 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        className={`p-1 rounded ${
                          isIncrease
                            ? "bg-emerald-500/10 text-emerald-500"
                            : isDecrease
                              ? "bg-rose-500/10 text-rose-500"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isIncrease ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : isDecrease ? (
                          <ArrowDownRight className="h-4 w-4" />
                        ) : (
                          <TrendingUp className="h-4 w-4" />
                        )}
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {getChangeTypeLabel(item.changeType)}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 font-mono tabular-nums ${
                          isIncrease
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : isDecrease
                              ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                              : "bg-muted/40 text-muted-foreground border-border/60"
                        }`}
                      >
                        {isIncrease ? "+" : ""}
                        {item.changePercentage !== undefined && item.changePercentage !== null
                          ? typeof item.changePercentage === "number"
                            ? item.changePercentage.toFixed(1)
                            : item.changePercentage
                          : ((diff / (item.previousSalary || 1)) * 100).toFixed(1)}
                        %
                      </Badge>

                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono mr-auto md:mr-0">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(item.effectiveDate).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                    </div>

                    {!employeeId && item.employee && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>
                          {item.employee.firstName} {item.employee.lastName}
                        </span>
                        {item.employee.employeeNumber && (
                          <span className="font-mono text-[10px]">
                            ({item.employee.employeeNumber})
                          </span>
                        )}
                      </div>
                    )}

                    {item.reason && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">السبب: </span>
                        {item.reason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 bg-muted/20 p-2 px-3 rounded-lg border border-border/60 self-start md:self-center">
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground">الراتب السابق</div>
                      <div className="text-xs font-mono tabular-nums text-muted-foreground line-through">
                        {item.previousSalary.toLocaleString()} ج.م
                      </div>
                    </div>
                    <div className="text-muted-foreground">←</div>
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground">الراتب الجديد</div>
                      <div className="text-sm font-bold font-mono tabular-nums text-foreground">
                        {item.newSalary.toLocaleString()}{" "}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          ج.م
                        </span>
                      </div>
                    </div>
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

export default SalaryHistory;
