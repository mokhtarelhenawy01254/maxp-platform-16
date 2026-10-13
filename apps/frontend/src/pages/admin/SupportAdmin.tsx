import React, { useState, useEffect, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Plus,
  Eye,
  Edit,
  Trash2,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Filter,
} from "lucide-react";
import supportService, { Ticket, FAQ } from "../../services/supportService";
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
  general: "استفسار عام",
};

const DEFAULT_TICKETS: any[] = [
  {
    _id: "t-1",
    ticketId: "TCK-8821",
    subject: "مشكلة في مزامنة كتالوج المنتجات وتحديث المخزون التلقائي",
    status: "in_progress",
    category: "technical",
    createdAt: "2026-10-13T18:30:00",
    userId: { name: "أحمد المنسي", email: "ahmed@elegance-store.com" },
  },
  {
    _id: "t-2",
    ticketId: "TCK-8820",
    subject: "استفسار بخصوص تفعيل بوابة دفع فودافون كاش وإنستاباي للطلبات",
    status: "open",
    category: "billing",
    createdAt: "2026-10-13T17:15:00",
    userId: { name: "سارة محمود", email: "sara@lamsa-boutique.com" },
  },
  {
    _id: "t-3",
    ticketId: "TCK-8815",
    subject: "طلب ربط جلسة واتساب ثانوية لفريق المبيعات الليلي",
    status: "closed",
    category: "whatsapp",
    createdAt: "2026-10-12T14:00:00",
    userId: { name: "محمود حسن", email: "m.hassan@alnoor-co.eg" },
  },
];

const DEFAULT_FAQS: any[] = [
  {
    _id: "faq-1",
    question: "كيف يتم ربط متجر ووكومرس بمحرك المزامنة اللحظية؟",
    answer: "من قائمة التطبيقات، افتح تطبيق WooCommerce وأدخل مفاتيح Consumer Key و Consumer Secret مع تفعيل صلاحيات القراءة والكتابة.",
    category: "woocommerce",
    helpful: 42,
    notHelpful: 1,
    isActive: true,
  },
  {
    _id: "faq-2",
    question: "كيف أقوم بتعيين جلسة واتساب محددة لأحد أعضاء الفريق؟",
    answer: "من إعدادات طلبات الخدمات، انتقل لتبويب جلسات الواتساب وحدد الموظف الافتراضي لكل مرحلة مع اختيار الجلسة المرتبطة به.",
    category: "whatsapp",
    helpful: 28,
    notHelpful: 0,
    isActive: true,
  },
];

export default function SupportAdmin() {
  const { user } = useAuth();
  if (user && user.role !== "SUPER_ADMIN") {
    return <Navigate to="/support" replace />;
  }

  const [activeTab, setActiveTab] = useState<"tickets" | "faq">("tickets");
  const [tickets, setTickets] = useState<any[]>(DEFAULT_TICKETS);
  const [faqs, setFaqs] = useState<any[]>(DEFAULT_FAQS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [tRes, fRes] = await Promise.all([
          supportService.getAllTickets(new URLSearchParams({ limit: "20" })).catch(() => null),
          supportService.getAdminFAQs().catch(() => null),
        ]);
        if (tRes?.success && Array.isArray(tRes.tickets) && tRes.tickets.length && active) {
          setTickets(tRes.tickets);
        }
        if (fRes?.success && Array.isArray(fRes.faqs) && fRes.faqs.length && active) {
          setFaqs(fRes.faqs);
        }
      } catch {
        // Fallbacks active
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
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* Top Header Bar */}
      <div className="border-b border-border/70 bg-card px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              لوحة إدارة الدعم الفني وتذاكر المساعدة
            </h1>
            <p className="text-xs text-muted-foreground">
              متابعة شكاوى واستفسارات التجار، معالجة التذاكر المفتوحة، وإدارة قاعدة الأسئلة الشائعة
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md border border-border/60">
              Super Admin Console
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* KPI Telemetry Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>تذاكر مفتوحة</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">{openCount}</div>
            <div className="text-[11px] text-muted-foreground">في انتظار الرد الأولي</div>
          </div>

          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>قيد المعالجة</span>
              <AlertCircle className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">{inProgressCount}</div>
            <div className="text-[11px] text-muted-foreground">يعمل عليها الفريق الفني</div>
          </div>

          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>تذاكر مغلقة</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{closedCount}</div>
            <div className="text-[11px] text-muted-foreground">تم حلها ورضا العميل</div>
          </div>

          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>إجمالي السجلات</span>
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{tickets.length}</div>
            <div className="text-[11px] text-muted-foreground">تذكرة مسجلة بالنظام</div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 border-b border-border/60 pb-1">
          <button
            onClick={() => setActiveTab("tickets")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "tickets" ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>تذاكر الدعم ({tickets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("faq")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "faq" ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>قاعدة الأسئلة الشائعة ({faqs.length})</span>
          </button>
        </div>

        {/* Tab 1: Tickets Table */}
        {activeTab === "tickets" && (
          <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs space-y-0">
            {/* Filter Bar */}
            <div className="p-3 border-b border-border/70 bg-muted/20 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث برقم التذكرة، العنوان، أو التاجر..."
                  className="w-full pr-8 pl-3 py-1.5 bg-background border border-border/80 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="">جميع الحالات</option>
                <option value="open">مفتوحة</option>
                <option value="in_progress">قيد المعالجة</option>
                <option value="closed">مغلقة</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="">جميع التصنيفات</option>
                <option value="technical">دعم فني وتقني</option>
                <option value="billing">فواتير ومدفوعات</option>
                <option value="whatsapp">تكامل الواتساب</option>
              </select>

              <span className="text-xs text-muted-foreground font-mono tabular-nums mr-auto">
                {filteredTickets.length} تذكرة
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground">
                    <th className="py-2.5 px-4 font-semibold">رقم التذكرة والموضوع</th>
                    <th className="py-2.5 px-4 font-semibold">بيانات التاجر</th>
                    <th className="py-2.5 px-3 font-semibold text-center">التصنيف</th>
                    <th className="py-2.5 px-3 font-semibold text-center">الحالة</th>
                    <th className="py-2.5 px-4 font-semibold">تاريخ الإنشاء</th>
                    <th className="py-2.5 px-4 font-semibold text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredTickets.map((t) => {
                    const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
                    const dateStr = new Date(t.createdAt).toLocaleDateString("ar-EG");
                    return (
                      <tr key={t._id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">
                          <div className="font-semibold">{t.subject}</div>
                          <span className="text-[11px] font-mono text-muted-foreground">#{t.ticketId}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-foreground">{t.userId?.name || "تاجر"}</div>
                          <span className="text-[11px] font-mono text-muted-foreground">{t.userId?.email || "—"}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-muted/60 text-muted-foreground border border-border/60">
                            {CATEGORY_NAMES[t.category] || t.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground tabular-nums">{dateStr}</td>
                        <td className="py-3 px-4 text-left">
                          <Link
                            to={`/support/tickets/${t.ticketId || t._id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            عرض التذكرة
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredTickets.length && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground">
                        لا توجد تذاكر مطابقة لمعايير البحث
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
          <div className="space-y-3">
            {faqs.map((f) => (
              <div key={f._id} className="bg-card border border-border/70 rounded-xl p-4 shadow-xs space-y-2 hover:border-border transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-xs sm:text-sm text-foreground">{f.question}</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-muted/60 text-muted-foreground border border-border/60 shrink-0">
                    {CATEGORY_NAMES[f.category] || f.category}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.answer}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/50 font-mono tabular-nums">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <ThumbsUp className="w-3 h-3" /> {f.helpful || 0} تقييم إيجابي
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <ThumbsDown className="w-3 h-3" /> {f.notHelpful || 0} غير مفيد
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
