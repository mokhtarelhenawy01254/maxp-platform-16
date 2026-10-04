import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  SparklesIcon,
  PlusIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";
import { buildApiUrl } from "../../../utils/urlHelper";
import { tokenManager } from "../../../utils/tokenManager";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";

interface BacklogItem {
  id: string;
  title: string;
  description: string;
  source: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  type: string;
  status: "PENDING" | "CONVERTED" | "DISCARDED";
  convertedTaskId?: string | null;
  convertedTask?: { id: string; title: string; status: string } | null;
  creator?: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

interface DailyQuota {
  required: number;
  currentCount: number;
  completedCount: number;
  isMet: boolean;
  isCompleted: boolean;
  date: string;
}

interface AutoSuggestionsResponse {
  hasOpenTasks: boolean;
  openTasksCount: number;
  shouldSuggest: boolean;
  reason: string;
  suggestions: BacklogItem[];
}

interface TaskBacklogTabProps {
  onTaskCreated?: () => void;
}

const getAccessToken = (): string | null => tokenManager.getAccessToken();

export const TaskBacklogTab: React.FC<TaskBacklogTabProps> = ({ onTaskCreated }) => {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("PENDING");
  const [search, setSearch] = useState("");
  const [quota, setQuota] = useState<DailyQuota | null>(null);
  const [suggestions, setSuggestions] = useState<AutoSuggestionsResponse | null>(null);

  // New item form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<string>("MEDIUM");
  const [newType, setNewType] = useState<string>("improvement");
  const [submitting, setSubmitting] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const fetchBacklog = useCallback(async () => {
    try {
      const token = getAccessToken();
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (search) params.set("search", search);

      const res = await fetch(buildApiUrl(`tasks/backlog?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setItems(data.data.items || []);
      }
    } catch (err) {
      console.error("Failed to load backlog items", err);
    }
  }, [filterStatus, search]);

  const fetchQuotaAndSuggestions = useCallback(async () => {
    try {
      const token = getAccessToken();
      const [quotaRes, suggestRes] = await Promise.all([
        fetch(buildApiUrl("tasks/daily-quota"), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(buildApiUrl("tasks/auto-suggestions"), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const quotaData = await quotaRes.json();
      if (quotaData.success && quotaData.data) {
        setQuota(quotaData.data);
      }

      const suggestData = await suggestRes.json();
      if (suggestData.success && suggestData.data) {
        setSuggestions(suggestData.data);
      }
    } catch (err) {
      console.error("Failed to load quota and suggestions", err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchBacklog(), fetchQuotaAndSuggestions()]).finally(() => {
      setLoading(false);
    });
  }, [fetchBacklog, fetchQuotaAndSuggestions]);

  const handleCreateBacklog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("يرجى كتابة عنوان للملاحظة أو فكرة التحسين");
      return;
    }

    try {
      setSubmitting(true);
      const token = getAccessToken();
      const res = await fetch(buildApiUrl("tasks/backlog"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || newTitle.trim(),
          priority: newPriority,
          type: newType,
          source: "PRODUCT_NOTE",
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("تم إضافة الفكرة إلى الباك لوج بنجاح");
        setNewTitle("");
        setNewDescription("");
        setShowAddForm(false);
        fetchBacklog();
      } else {
        toast.error(data.error || "تعذر إضافة عنصر الباك لوج");
      }
    } catch {
      toast.error("خطأ أثناء الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToTask = async (item: BacklogItem) => {
    try {
      setConvertingId(item.id);
      const token = getAccessToken();
      const res = await fetch(buildApiUrl(`tasks/backlog/${item.id}/convert`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: item.title,
          description: item.description,
          priority: item.priority,
          type: item.type,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`تم تحويل "${item.title}" إلى مهمة رسمية بنجاح`);
        fetchBacklog();
        fetchQuotaAndSuggestions();
        if (onTaskCreated) onTaskCreated();
      } else {
        toast.error(data.error || "تعذر تحويل العنصر لمهمة");
      }
    } catch {
      toast.error("خطأ في التحويل");
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Quota Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Daily Improvement Quota Widget */}
        <div className="md:col-span-2 rounded-xl border border-border/70 bg-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-sm font-semibold tracking-tight">حصة التحسين اليومية المستمرة</h3>
                <p className="text-[11px] text-muted-foreground">
                  معيار الجودة: إنجاز أو تقديم مهمة تحسين/تطوير واحدة على الأقل يومياً لكل فرد
                </p>
              </div>
            </div>
            {quota && (
              <Badge
                variant="outline"
                className={`tabular-nums text-xs px-2.5 py-0.5 font-medium ${
                  quota.isMet
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {quota.isMet ? "مستوفاة اليوم (1/1+)" : "غير مستوفاة بعد (0/1)"}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="rounded-lg border border-border/50 bg-background/50 p-2">
              <span className="text-[10px] text-muted-foreground block">المطلوب يومياً</span>
              <span className="text-base font-bold tabular-nums">1</span>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/50 p-2">
              <span className="text-[10px] text-muted-foreground block">مهام تحسين بدأت اليوم</span>
              <span className="text-base font-bold tabular-nums text-primary">{quota?.currentCount || 0}</span>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/50 p-2">
              <span className="text-[10px] text-muted-foreground block">سُلِّمت أو اعتُمدت</span>
              <span className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {quota?.completedCount || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Add Action Box */}
        <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <ListBulletIcon className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-semibold">تدوين ملاحظة منتج</h4>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              سجّل أي فكرة، ملاحظة منتج، أو ثغرة تصميم فوراً في الباك لوج ليتم تحويلها لمهام تنفيذية لاحقاً.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full mt-3 h-8 text-xs font-medium gap-1.5"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            {showAddForm ? "إغلاق النموذج" : "إضافة فكرة جديدة للباك لوج"}
          </Button>
        </div>
      </div>

      {/* 2. Auto Suggestion Banner (When 0 open tasks) */}
      {suggestions?.shouldSuggest && suggestions.suggestions.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <ExclamationCircleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="font-semibold">{suggestions.reason}</span>
            </div>
            <Badge variant="outline" className="border-amber-500/40 text-[10px]">
              اقتراح ذكي فوري
            </Badge>
          </div>
          <div className="space-y-1.5 pt-1">
            {suggestions.suggestions.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-card/60 p-2"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-[11px] border-amber-500/30 hover:bg-amber-500/10 shrink-0"
                  onClick={() => handleConvertToTask(item)}
                  disabled={convertingId === item.id}
                >
                  {convertingId === item.id ? "جارِ التحويل..." : "حوّلها لمهمة وابدأ بها"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Add Item Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleCreateBacklog} className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <h4 className="text-xs font-semibold">إضافة فكرة / ملاحظة منتج جديدة</h4>
            <span className="text-[10px] text-muted-foreground">ستُحفظ في الباك لوج كعنصر قابل للتحويل</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-medium text-muted-foreground">عنوان الفكرة أو التحسين *</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="مثال: إضافة زر تحميل تقرير الالتزام كـ PDF"
                className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-medium text-muted-foreground">تفاصيل الملاحظة أو الأثر المتوقع</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                placeholder="شرح موجز للهدف وسبب التغيير..."
                className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">الأولوية</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5"
              >
                <option value="LOW">منخفضة</option>
                <option value="MEDIUM">متوسطة</option>
                <option value="HIGH">عالية</option>
                <option value="URGENT">حرجة</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">نوع الباك لوج</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5"
              >
                <option value="improvement">تحسين مستمر (Improvement)</option>
                <option value="refactor">إعادة هيكلة (Refactor)</option>
                <option value="bugfix">إصلاح ثغرة (Bugfix)</option>
                <option value="feature">ميزة جديدة (Feature)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
              className="text-xs h-8"
            >
              إلغاء
            </Button>
            <Button type="submit" size="sm" disabled={submitting} className="text-xs h-8">
              {submitting ? "جارِ الحفظ..." : "حفظ في الباك لوج"}
            </Button>
          </div>
        </form>
      )}

      {/* 4. Controls: Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {["PENDING", "CONVERTED", "ALL"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                filterStatus === st
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {st === "PENDING" ? "في الانتظار" : st === "CONVERTED" ? "تم تحويلها لمهمة" : "الكل"}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في الباك لوج..."
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-1.5"
          />
        </div>
      </div>

      {/* 5. Backlog Table / Ledger */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">جارِ تحميل عناصر الباك لوج...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
            <p>لا توجد عناصر في الباك لوج بهذا المعيار</p>
            <p className="text-[11px] text-muted-foreground/80">أضف أفكاراً وملاحظات ليتم تنفيذها في الحصص اليومية</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40 text-xs">
            {items.map((item) => {
              const isConverted = item.status === "CONVERTED";
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{item.title}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          item.priority === "URGENT" || item.priority === "HIGH"
                            ? "border-rose-500/30 text-rose-500"
                            : "border-border/60 text-muted-foreground"
                        }`}
                      >
                        {item.priority}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/60">
                        {item.type}
                      </Badge>
                      {item.source && (
                        <span className="text-[10px] text-muted-foreground/70">
                          المصدر: {item.source}
                        </span>
                      )}
                    </div>
                    {item.description && item.description !== item.title && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80">
                      <span>أضيف: {new Date(item.createdAt).toLocaleDateString("ar-EG")}</span>
                      {item.creator && (
                        <span>
                          بواسطة: {item.creator.firstName} {item.creator.lastName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0 flex items-center gap-2 sm:self-center">
                    {isConverted ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 text-[11px] py-1"
                      >
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        تم التحويل لمهمة
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="h-8 text-xs font-medium gap-1.5 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                        onClick={() => handleConvertToTask(item)}
                        disabled={convertingId === item.id}
                      >
                        <ArrowRightIcon className="w-3.5 h-3.5 rotate-180" />
                        {convertingId === item.id ? "جارِ التحويل..." : "حوّلها لمهمة"}
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
