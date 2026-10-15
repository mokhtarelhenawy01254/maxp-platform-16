import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  X,
  Download,
  Trash2,
  Search,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";
import errorTracking, { ErrorLog } from "../services/errorTracking";

const ErrorDashboard: React.FC = () => {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [filteredErrors, setFilteredErrors] = useState<ErrorLog[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    loadErrors();
    const interval = setInterval(loadErrors, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [errors, filterCategory, filterSeverity, searchTerm]);

  const loadErrors = () => {
    const storedErrors = errorTracking.getStoredErrors();
    setErrors(storedErrors);
  };

  const applyFilters = () => {
    let filtered = [...errors];

    if (filterCategory !== "all") {
      filtered = filtered.filter((err) => err.category === filterCategory);
    }

    if (filterSeverity !== "all") {
      filtered = filtered.filter((err) => err.severity === filterSeverity);
    }

    if (searchTerm) {
      filtered = filtered.filter((err) =>
        err.message.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredErrors(filtered);
  };

  const handleClearErrors = () => {
    if (confirm("هل أنت متأكد من مسح جميع الأخطاء المسجلة؟")) {
      errorTracking.clearStoredErrors();
      setErrors([]);
    }
  };

  const handleExportJSON = () => {
    const json = errorTracking.exportErrors();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `errors-${new Date().toISOString()}.json`;
    a.click();
  };

  const handleExportCSV = () => {
    const csv = errorTracking.exportErrorsAsCSV();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `errors-${new Date().toISOString()}.csv`;
    a.click();
  };

  const getSeverityBadge = (severity: ErrorLog["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25";
      case "high":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25";
      case "medium":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/25";
      case "low":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25";
      default:
        return "bg-muted text-muted-foreground border-border/60";
    }
  };

  const getCategoryBadge = (category: ErrorLog["category"]) => {
    switch (category) {
      case "api":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
      case "network":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "auth":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
      case "validation":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "ui":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (!import.meta.env.DEV && !showDashboard) {
    return (
      <button
        type="button"
        onClick={() => setShowDashboard(true)}
        className="fixed bottom-4 right-4 bg-card border border-rose-500/30 text-rose-600 dark:text-rose-400 p-3 rounded-full shadow-xl hover:bg-muted active:scale-95 transition-all z-50 cursor-pointer"
        title="عرض لوحة تشخيص الأخطاء"
        aria-label="عرض لوحة تشخيص الأخطاء"
      >
        <AlertTriangle className="w-5 h-5" />
        {errors.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-mono font-bold rounded-full w-5 h-5 flex items-center justify-center tabular-nums shadow-sm">
            {errors.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="bg-card rounded-2xl shadow-2xl border border-border/80 w-full max-w-5xl max-h-[88vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-card p-5 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                لوحة تشخيص وتتبع أخطاء النظام
              </h2>
              <p className="text-xs text-muted-foreground font-mono tabular-nums">
                {errors.length} خطأ مسجل | {filteredErrors.length} مطابق للفلتر
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDashboard(false)}
            className="p-1.5 rounded-lg border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters & Actions */}
        <div className="bg-muted/30 border-b border-border/60 p-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex-1 min-w-56">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="بحث في سجل الأخطاء..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-border/70 bg-card text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                />
              </div>
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-border/70 bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            >
              <option value="all">كل الأنواع</option>
              <option value="api">API</option>
              <option value="network">شبكة</option>
              <option value="auth">مصادقة</option>
              <option value="validation">تحقق</option>
              <option value="ui">واجهة</option>
              <option value="unknown">غير معروف</option>
            </select>

            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-border/70 bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            >
              <option value="all">كل المستويات</option>
              <option value="critical">حرجة</option>
              <option value="high">عالية</option>
              <option value="medium">متوسطة</option>
              <option value="low">منخفضة</option>
            </select>

            <div className="flex items-center gap-1.5 mr-auto">
              <button
                type="button"
                onClick={handleExportJSON}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-all shadow-2xs"
                title="تصدير بصيغة JSON"
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-all shadow-2xs"
                title="تصدير بصيغة CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={handleClearErrors}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all shadow-2xs"
                title="مسح السجل بالكامل"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح</span>
              </button>
            </div>
          </div>
        </div>

        {/* Errors List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredErrors.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <AlertTriangle className="w-10 h-10 mx-auto opacity-30 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">لا توجد أخطاء مسجلة حالياً</p>
              <p className="text-xs text-muted-foreground">النظام يعمل باستقرار وهدوء تام.</p>
            </div>
          ) : (
            filteredErrors.map((error) => (
              <div
                key={error.id}
                className={`border rounded-xl p-3.5 bg-card shadow-2xs space-y-2 ${getSeverityBadge(
                  error.severity,
                )}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono uppercase ${getCategoryBadge(
                          error.category,
                        )}`}
                      >
                        {error.category}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
                        {new Date(error.timestamp).toLocaleString("ar-EG")}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground mb-1">
                      {error.message}
                    </p>
                    {error.context && (
                      <details className="text-xs text-muted-foreground mt-1">
                        <summary className="cursor-pointer hover:underline text-[11px]">
                          عرض سياق الطلب
                        </summary>
                        <pre className="mt-1.5 p-2 bg-muted/60 border border-border/60 rounded-lg text-[10px] font-mono overflow-auto max-h-36">
                          {JSON.stringify(error.context, null, 2)}
                        </pre>
                      </details>
                    )}
                    {error.stack && (
                      <details className="text-xs text-muted-foreground mt-1">
                        <summary className="cursor-pointer hover:underline text-[11px]">
                          Stack Trace
                        </summary>
                        <pre
                          className="mt-1.5 p-2 bg-muted/60 border border-border/60 rounded-lg text-[10px] font-mono overflow-auto max-h-36 text-left"
                          dir="ltr"
                        >
                          {error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDashboard;
