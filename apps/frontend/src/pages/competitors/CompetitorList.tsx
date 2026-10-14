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
  Calendar,
  Compass,
  Radar,
  Radio,
  Layers,
  MapPin,
  Share2,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import CompetitorStatusBar from './CompetitorStatusBar';
import GlobalCompetitorStatusBar, { type StatusFilter } from './GlobalCompetitorStatusBar';
import { updateCompetitorStatus, useCompetitorStatusSync } from './useCompetitorStatus';
import type { CompetitorStatus } from './CompetitorStatusBar';
import { getLocalizedDateTime } from '../../utils/localization';
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
      if (res.data.success) setStatusCounts(res.data.data);
    } catch {
      console.error('Failed to fetch status counts');
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
      if (res.data.success) setCompetitors(res.data.data || []);
    } catch {
      console.error('Failed to fetch competitors');
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

  const handleStatusFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/competitors/${id}`);
      setDeleteConfirm(null);
      void fetchCompetitors();
      void fetchStatusCounts();
    } catch {
      console.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-4" dir={i18n.dir()}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border/70 rounded-xl p-4 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
              ذكاء الأعمال
            </span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-foreground">مراقبة المنافسين</span>
          </div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Radar className="w-4 h-4 text-primary" />
            رادار ذكاء وتحليل المنافسين (Competitor Intelligence)
          </h2>
          <p className="text-xs text-muted-foreground">
            تتبع أسعار المتاجر المنافسة، حملاتهم الإعلانية، ومنتجاتهم الحصرية في السوق لحظياً
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => { void fetchCompetitors(); void fetchStatusCounts(); }}
            className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="تحديث"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => navigate('/competitors/auto-discover')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors"
          >
            <Compass className="w-3.5 h-3.5 text-primary" />
            <span>استكشاف تلقائي</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/competitors/add')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-xs transition-colors active:scale-[0.98]"
          >
            <Plus size={15} />
            <span>إضافة منافس</span>
          </button>
        </div>
      </div>

      {/* Telemetry ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>إجمالي المنافسين المرصودين</span>
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-foreground tabular-nums">
              {statusCounts.total}
            </span>
            <span className="text-[11px] text-muted-foreground">متاجر مسجلة</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>تحت المتابعة الدورية</span>
            <Radio className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-foreground tabular-nums">
              {statusCounts.FOLLOWING}
            </span>
            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">Tracking</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>اكتمال الرصد الشامل</span>
            <Radar className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-foreground tabular-nums">
              {statusCounts.COMPLETED}
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Indexed</span>
          </div>
        </div>
      </div>

      {/* Search and Global Status Filter */}
      <div className="bg-card border border-border/70 rounded-xl p-3.5 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="البحث باسم المتجر المنافس أو الرابط..."
            className="w-full h-9 ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 text-xs rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <GlobalCompetitorStatusBar
          selectedFilter={statusFilter}
          onFilterChange={handleStatusFilterChange}
          counts={statusCounts}
          isLoading={countsLoading}
        />
      </div>

      {/* Grid of Competitors */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-muted-foreground">جاري فحص وتحديث قائمة المنافسين...</div>
      ) : competitors.length === 0 ? (
        <div className="py-12 text-center bg-card border border-dashed border-border/80 rounded-xl space-y-2">
          <Radar className="w-8 h-8 text-muted-foreground/30 mx-auto" />
          <p className="text-xs font-semibold text-foreground">لا يوجد منافسين مسجلين بعد</p>
          <p className="text-[11px] text-muted-foreground">أضف متجراً منافساً لبدء سحب أسعاره وحملاته الإعلانية</p>
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
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-border/60 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {c.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-foreground truncate">{c.name}</h3>
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
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="عرض التفاصيل"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/competitors/${c.id}/edit`)}
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="تعديل"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(c.id)}
                    className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={14} />
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
                  <ExternalLink size={11} className="shrink-0" />
                  <span className="truncate">{c.url.replace(/^https?:\/\//, '')}</span>
                </a>
              )}

              {/* Counts Telemetry */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                <span className="tabular-nums font-medium text-foreground">{c._count.products} منتجات</span>
                <span className="text-border">|</span>
                <span className="tabular-nums font-medium text-foreground">{c._count.ads} إعلانات</span>
                <span className="text-border">|</span>
                <span className="tabular-nums font-medium text-foreground">{c._count.reports} تقارير</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-card border border-border/70 rounded-xl p-5 w-full max-w-sm space-y-3 shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-destructive font-semibold text-xs">
              <AlertTriangle size={16} />
              <span>تأكيد حذف المنافس</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              هل أنت متأكد من حذف هذا المنافس وسجلاته من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground hover:bg-muted"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(deleteConfirm)}
                className="px-3.5 py-1.5 text-xs rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
