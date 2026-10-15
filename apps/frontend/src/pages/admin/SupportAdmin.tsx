import React, { useState, useEffect, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Eye,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import supportService from "../../services/supportService";
import { useAuth } from "../../hooks/useAuthSimple";

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  open: { label: "مفتوحة", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", icon: Clock },
  in_progress: { label: "قيد المعالجة", badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", icon: AlertCircle },
  closed: { label: "مغلقة", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
};

const CATEGORY_NAMES: Record<string, string> = {
  technical: "دعم فني وتقني",
  billing: "فواتير ومدفوعات",
  whatsapp: "تكامل الواتساب",
  woocommerce: "ربط ووكومرس",
  suggestion: "اقتراح تطويري",
  complaint: "شكوى",
  inquiry: "استفسار عن ميزة",
  general: "استفسار عام",
};

export default function SupportAdmin() {
  const { user } = useAuth();
  if (user && user.role !== "SUPER_ADMIN") {
    return <Navigate to="/support" replace />;
  }

  const [activeTab, setActiveTab] = useState<"tickets" | "faq">("tickets");
  const [tickets, setTickets] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [tRes, fRes] = await Promise.all([
          supportService.getAllTickets(new URLSearchParams({ limit: "50" })).catch(() => null),
          supportService.getAdminFAQs().catch(() => null),
        ]);
        if (active) {
          if (tRes?.success && Array.isArray(tRes.tickets)) {
            setTickets(tRes.tickets);
          } else {
            setTickets([]);
          }
          if (fRes?.success && Array.isArray(fRes.faqs)) {
            setFaqs(fRes.faqs);
          } else {
            setFaqs([]);
          }
        }
      } catch {
        if (active) {
          setTickets([]);
          setFaqs([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch = !search || t.subject?.includes(search) || t.ticketId?.includes(search) || t.userId?.name?.includes(search);
      const matchStatus = !statusFilter || t.status === statusFilter;
      const matchCat = !categoryFilter || t.category === categoryFilter;
      return matchSearch && matchStatus && matchCat;
    });
  }, [tickets, search, statusFilter, categoryFilter]);

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const closedCount = tickets.filter((t) => t.status === "closed").length;

  return (
    <div dir="rtl" className="w-full space-y-3.5">
      {/* Linear Single Chassis Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-center shrink-0">
            <MessageSquare className="size-4 text-foreground/80" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                إدارة الدعم الفني وتذاكر المساعدة
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-blue-500" />
                {tickets.length} تذكرة
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              متابعة شكاوى واستفسارات التجار، معالجة التذاكر المفتوحة، وإدارة قاعدة المعرفة
            </p>
          </div>
        </div>

        {/* Tab Switcher Segmented Pills */}
        <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-lg border border-border/70">
          <button
            type="button"
            onClick={() => setActiveTab("tickets")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === "tickets"
                ? "bg-background text-foreground font-semibold shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="size-3.5" />
            <span>التذاكر ({tickets.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("faq")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === "faq"
                ? "bg-background text-foreground font-semibold shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HelpCircle className="size-3.5" />
            <span>الأسئلة الشائعة ({faqs.length})</span>
          </button>
        </div>
      </div>

      {/* Unified Telemetry Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
        <div className="p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">تذاكر مفتوحة</span>
            <Clock className="size-3.5 text-amber-500" />
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
              {openCount}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">بانتظار الرد الأولي</p>
        </div>

        <div className="p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">قيد المعالجة</span>
            <AlertCircle className="size-3.5 text-blue-500" />
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-blue-600 dark:text-blue-400">
              {inProgressCount}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">يعمل عليها الفريق</p>
        </div>

        <div className="p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">تذاكر مغلقة</span>
            <CheckCircle2 className="size-3.5 text-emerald-500" />
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              {closedCount}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">تم حلها بنجاح</p>
        </div>

        <div className="p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">إجمالي السجلات</span>
            <MessageSquare className="size-3.5 text-primary" />
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {tickets.length}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">تذكرة مسجلة بالنظام</p>
        </div>
      </div>

      {/* Tab 1: Tickets Single Surface Table */}
      {activeTab === "tickets" && (
        <div className="rounded-xl border border-border/80 bg-card/40 shadow-xs overflow-hidden">
          {/* Inline Filter Bar */}
          <div className="p-2.5 border-b border-border/60 bg-muted/20 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث برقم التذكرة، الموضوع، أو التاجر..."
                className="w-full pr-8 pl-3 py-1 bg-background/50 border border-border/70 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-background/50 border border-border/70 rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="">جميع الحالات</option>
              <option value="open">مفتوحة</option>
              <option value="in_progress">قيد المعالجة</option>
              <option value="closed">مغلقة</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-background/50 border border-border/70 rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="">جميع التصنيفات</option>
              {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <span className="text-[11px] text-muted-foreground font-mono tabular-nums mr-auto">
              {filteredTickets.length} تذكرة
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground">
                  <th className="py-2.5 px-3.5 font-semibold">رقم التذكرة والموضوع</th>
                  <th className="py-2.5 px-3.5 font-semibold">بيانات التاجر</th>
                  <th className="py-2.5 px-3 font-semibold text-center">التصنيف</th>
                  <th className="py-2.5 px-3 font-semibold text-center">الحالة</th>
                  <th className="py-2.5 px-3.5 font-semibold">تاريخ الإنشاء</th>
                  <th className="py-2.5 px-3.5 font-semibold text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredTickets.map((t) => {
                  const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
                  const dateStr = new Date(t.createdAt).toLocaleDateString("ar-EG");
                  return (
                    <tr key={t._id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3.5 font-medium text-foreground">
                        <div className="font-semibold text-xs">{t.subject}</div>
                        <span className="text-[10px] font-mono text-muted-foreground">#{t.ticketId}</span>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="text-foreground text-xs">{t.userId?.name || "تاجر"}</div>
                        <span className="text-[10px] font-mono text-muted-foreground">{t.userId?.email || "—"}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-muted/60 text-muted-foreground border border-border/60">
                          {CATEGORY_NAMES[t.category] || t.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-muted-foreground tabular-nums text-xs">{dateStr}</td>
                      <td className="py-2.5 px-3.5 text-left">
                        <Link
                          to={`/support/tickets/${t.ticketId || t._id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors border border-transparent hover:border-primary/20"
                        >
                          <Eye className="size-3" />
                          <span>عرض</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {!filteredTickets.length && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-xs font-mono text-muted-foreground">
                      {loading
                        ? "جاري تحميل تذاكر الدعم..."
                        : tickets.length === 0
                        ? "لا توجد أي تذاكر دعم مسجلة حتى الآن"
                        : "لا توجد تذاكر مطابقة لمعايير البحث"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: FAQ Knowledge Base */}
      {activeTab === "faq" && (
        <div className="space-y-2.5">
          {faqs.map((f) => (
            <div key={f._id} className="rounded-xl border border-border/80 bg-card/40 p-3.5 shadow-xs space-y-2 hover:border-border transition-colors">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-xs sm:text-sm text-foreground">{f.question}</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-muted/60 text-muted-foreground border border-border/60 shrink-0">
                  {CATEGORY_NAMES[f.category] || f.category}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.answer}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1.5 border-t border-border/50 font-mono tabular-nums">
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px]">
                  <ThumbsUp className="size-3" /> {f.helpful || 0} تقييم إيجابي
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px]">
                  <ThumbsDown className="size-3" /> {f.notHelpful || 0} غير مفيد
                </span>
              </div>
            </div>
          ))}
          {faqs.length === 0 && (
            <div className="rounded-xl border border-border/80 bg-card/40 p-10 text-center text-xs font-mono text-muted-foreground shadow-xs">
              {loading ? "جاري تحميل الأسئلة الشائعة..." : "لا توجد أسئلة شائعة مضافة حتى الآن"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
