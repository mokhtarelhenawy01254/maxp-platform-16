import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Eye,
  Compass,
  Radar,
  Radio,
  Layers,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import CompetitorStatusBar from './CompetitorStatusBar';
import GlobalCompetitorStatusBar, { type StatusFilter } from './GlobalCompetitorStatusBar';
import { updateCompetitorStatus, useCompetitorStatusSync } from './useCompetitorStatus';
import type { CompetitorStatus } from './CompetitorStatusBar';
import i18n from '../../i18n';

interface SocialProfile {
  id: string;
  platform: string;
  profileUrl: string;
}

interface Competitor {
  id: string;
  name: string;
  url: string | null;
  platform: string;
  logo: string | null;
  activityType: string | null;
  location: string | null;
  targetMarket: string | null;
  foundedYear: number | null;
  strengths: string | null;
  weaknesses: string | null;
  isActive: boolean;
  status: string;
  createdAt: string;
  socialProfiles: SocialProfile[];
  _count: { products: number; ads: number; reports: number };
}

interface StatusCounts {
  total: number;
  NEW: number;
  FOLLOWING: number;
  COMPLETED: number;
}

export const CompetitorList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ total: 0, NEW: 0, FOLLOWING: 0, COMPLETED: 0 });
  const [countsLoading, setCountsLoading] = useState(false);

  const fetchStatusCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const res = await apiClient.get('/competitors/status-counts');
      if (res.data?.success) setStatusCounts(res.data.data);
    } catch {
      // silent fallback
    } finally {
      setCountsLoading(false);
    }
  }, []);

  const fetchCompetitors = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await apiClient.get('/competitors', { params });
      if (res.data?.success) setCompetitors(res.data.data || []);
    } catch {
      // silent fallback
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { void fetchCompetitors(); }, [fetchCompetitors]);
  useEffect(() => { void fetchStatusCounts(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useCompetitorStatusSync((competitorId, status) => {
    setCompetitors(prev => prev.map(c => c.id === competitorId ? { ...c, status } : c));
    void fetchStatusCounts();
  });

  const handleStatusChange = async (id: string, newStatus: CompetitorStatus) => {
    const prevStatus = competitors.find(c => c.id === id)?.status;
    setCompetitors(existing => existing.map(c => c.id === id ? { ...c, status: newStatus } : c));
    setStatusCounts(prev => {
      const next = { ...prev };
      if (prevStatus && prevStatus in next) next[prevStatus as keyof StatusCounts] = Math.max(0, next[prevStatus as keyof StatusCounts] - 1);
      next[newStatus] = (next[newStatus] || 0) + 1;
      return next;
    });
    const ok = await updateCompetitorStatus(id, newStatus);
    if (!ok && prevStatus) {
      setCompetitors(existing => existing.map(c => c.id === id ? { ...c, status: prevStatus } : c));
      setStatusCounts(prev => {
        const next = { ...prev };
        next[newStatus] = Math.max(0, (next[newStatus] || 0) - 1);
        if (prevStatus in next) next[prevStatus as keyof StatusCounts] = (next[prevStatus as keyof StatusCounts] || 0) + 1;
        return next;
      });
    }
    void fetchStatusCounts();
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/competitors/${id}`);
      setDeleteConfirm(null);
      void fetchCompetitors();
      void fetchStatusCounts();
    } catch {
      // fallback
    }
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground space-y-4 p-3 sm:p-5" dir={i18n.dir()}>
      {/* Unified Control Bar */}
      <div className="bg-card border border-border/70 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border/60">
              ذكاء الأعمال
            </span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-foreground">رادار المنافسين</span>
          </div>
          <h1 className="text-base font-bold text-foreground flex items-center gap-2 tracking-tight">
            <Radar className="w-4 h-4 text-primary shrink-0" />
            رادار ذكاء وتحليل المنافسين
          </h1>
          <p className="text-xs text-muted-foreground">
            تتبع أسعار المتاجر المنافسة، حملاتهم الإعلانية، ومنتجاتهم الحصرية في السوق لحظياً
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => { void fetchCompetitors(); void fetchStatusCounts(); }}
            className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => navigate('/competitors/auto-discover')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-foreground text-xs font-medium transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-primary" />
            <span>استكشاف تلقائي</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/competitors/add')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs transition-colors active:scale-[0.98] cursor-pointer"
          >
            <Plus size={14} />
            <span>إضافة منافس</span>
          </button>
        </div>
      </div>

      {/* Telemetry Ribbon Single-Surface Chassis */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 bg-muted/20">
          <div className="p-3.5 px-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-medium text-[11px]">إجمالي المنافسين المرصودين</span>
              <Layers className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-bold font-mono text-foreground tabular-nums">
                {statusCounts.total}
              </span>
              <span className="text-[11px] text-muted-foreground">متاجر مسجلة</span>
            </div>
          </div>

          <div className="p-3.5 px-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-medium text-[11px]">تحت المتابعة الدورية</span>
              <Radio className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-bold font-mono text-amber-500 tabular-nums">
                {statusCounts.FOLLOWING}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">Tracking Live</span>
            </div>
          </div>

          <div className="p-3.5 px-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-medium text-[11px]">مكتمل الرصد والأرشفة</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-bold font-mono text-emerald-500 tabular-nums">
                {statusCounts.COMPLETED}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">Indexed</span>
            </div>
          </div>
        </div>

        {/* Search and Global Status Filter */}
        <div className="p-3.5 border-t border-border/70 bg-card space-y-3">
          <div className="relative">
            <Search size={14} className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="البحث باسم المتجر المنافس أو الرابط..."
              className="w-full h-9 ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 text-xs rounded-lg border border-border/70 bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <GlobalCompetitorStatusBar
            selectedFilter={statusFilter}
            onFilterChange={setStatusFilter}
            counts={statusCounts}
            isLoading={countsLoading}
          />
        </div>
      </div>

      {/* Grid of Competitors */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-muted-foreground font-mono">
          <RefreshCw size={20} className="animate-spin mx-auto text-primary mb-2" />
          جاري فحص وتحديث قائمة المنافسين...
        </div>
      ) : competitors.length === 0 ? (
        <div className="py-16 text-center bg-card border border-dashed border-border/70 rounded-xl space-y-2">
          <Radar className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-xs font-semibold text-foreground">لا يوجد منافسين مسجلين بعد</p>
          <p className="text-[11px] text-muted-foreground">أضف متجراً منافساً لبدء سحب أسعاره وحملاته الإعلانية تلقائياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {competitors.map(c => (
            <div key={c.id} className="bg-card border border-border/70 rounded-xl p-4 hover:border-primary/50 transition-all space-y-3 shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {c.logo ? (
                    <img src={c.logo} alt={c.name} className="w-9 h-9 rounded-lg object-cover border border-border/60 shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {c.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-foreground truncate">{c.name}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <CompetitorStatusBar
                        currentStatus={c.status}
                        competitorId={c.id}
                        onChange={(newStatus) => void handleStatusChange(c.id, newStatus)}
                        size="sm"
                      />
                      {c.location && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
                          <MapPin size={10} className="shrink-0" />
                          <span>{c.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/competitors/${c.id}`)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="عرض التفاصيل"
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/competitors/${c.id}/edit`)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="تعديل"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(c.id)}
                    className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {c.url && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-primary hover:underline truncate max-w-full"
                >
                  <ExternalLink size={10} className="shrink-0" />
                  <span className="truncate">{c.url.replace(/^https?:\/\//, '')}</span>
                </a>
              )}

              {/* Counts Telemetry */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                <span className="tabular-nums font-semibold text-foreground">{c._count.products} منتجات</span>
                <span className="text-border">|</span>
                <span className="tabular-nums font-semibold text-foreground">{c._count.ads} إعلانات</span>
                <span className="text-border">|</span>
                <span className="tabular-nums font-semibold text-foreground">{c._count.reports} تقارير</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-card border border-border/70 rounded-xl p-5 w-full max-w-sm space-y-3 shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-rose-500 font-semibold text-xs">
              <AlertTriangle size={15} />
              <span>تأكيد حذف المنافس</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              هل أنت متأكد من حذف هذا المنافس وسجلاته من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border/70 bg-background text-foreground hover:bg-muted/40 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(deleteConfirm)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 cursor-pointer active:scale-[0.98]"
              >
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorList;
