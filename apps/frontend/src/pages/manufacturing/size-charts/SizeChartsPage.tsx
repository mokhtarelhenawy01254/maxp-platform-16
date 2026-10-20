import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Ruler,
  GitCompare,
  Copy,
  Edit,
  CheckCircle2,
  Clock,
  Archive,
  GitBranch,
  Layers,
} from 'lucide-react';
import { ManufacturingHeader } from '../ManufacturingHeader';
import { manufacturingApi, SizeChart } from '../manufacturingApi';
import { SizeChartModal } from './SizeChartModal';
import { SizeChartComparisonModal } from './SizeChartComparisonModal';
import { SizeChartVersionsModal } from './SizeChartVersionsModal';

export const SizeChartsPage: React.FC = () => {
  const [sizeCharts, setSizeCharts] = useState<SizeChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'DRAFT' | 'ARCHIVED'>('ALL');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'clone'>('create');
  const [selectedSizeChart, setSelectedSizeChart] = useState<SizeChart | null>(null);

  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareTarget, setCompareTarget] = useState<SizeChart | null>(null);

  const [versionsModalOpen, setVersionsModalOpen] = useState(false);
  const [versionTarget, setVersionTarget] = useState<SizeChart | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await manufacturingApi.listSizeCharts();
      setSizeCharts(res);
    } catch (err: any) {
      setError('تعذر تحميل جداول المقاسات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCharts = useMemo(() => {
    return sizeCharts.filter((sc) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        sc.code.toLowerCase().includes(q) ||
        sc.name.toLowerCase().includes(q);

      const matchStatus = statusFilter === 'ALL' || sc.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [sizeCharts, search, statusFilter]);

  const handleOpenCreate = () => {
    setSelectedSizeChart(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const handleOpenEdit = (sc: SizeChart) => {
    setSelectedSizeChart(sc);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleOpenClone = async (sc: SizeChart) => {
    if (window.confirm(`هل تريد استنساخ إصدار مسودة جديد من جدول المقاسات "${sc.name}" (${sc.code})؟`)) {
      try {
        const cloned = await manufacturingApi.cloneSizeChartVersion(sc.id);
        await loadData();
        setSelectedSizeChart(cloned);
        setModalMode('edit');
        setModalOpen(true);
      } catch (err: any) {
        alert(err.response?.data?.message || err.message || 'فشل استنساخ جدول المقاسات');
      }
    }
  };

  const handleApprove = async (sc: SizeChart) => {
    try {
      await manufacturingApi.approveSizeChart(sc.id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'فشل اعتماد جدول المقاسات');
    }
  };

  const handleArchive = async (sc: SizeChart) => {
    if (window.confirm(`هل أنت متأكد من أرشفة جدول المقاسات "${sc.name}" (${sc.code})؟`)) {
      try {
        await manufacturingApi.archiveSizeChart(sc.id);
        await loadData();
      } catch (err: any) {
        alert(err.response?.data?.message || err.message || 'فشل أرشفة جدول المقاسات');
      }
    }
  };

  const handleOpenCompare = (sc: SizeChart) => {
    setCompareTarget(sc);
    setCompareModalOpen(true);
  };

  const handleOpenVersions = (sc: SizeChart) => {
    setVersionTarget(sc);
    setVersionsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      <ManufacturingHeader
        title="جداول المقاسات والمصفوفات الفنية (Size Charts)"
        subtitle="إدارة أبعاد الموديلات بثلاث نسخ مترابطة (عميل / باترون / مصنع) مع فحص نسب التفاوت (Tolerance)"
        actions={
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>جدول مقاسات جديد (Size Chart)</span>
          </button>
        }
      />

      <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto">
        {/* Filter Strip */}
        <div className="p-3 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالكود أو اسم جدول المقاسات..."
              className="w-full pl-3 pr-9 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60 text-xs w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
                statusFilter === 'ALL' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              الكل ({sizeCharts.length})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
                statusFilter === 'APPROVED' ? 'bg-card text-emerald-600 shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              المعتمدة ({sizeCharts.filter((s) => s.status === 'APPROVED').length})
            </button>
            <button
              onClick={() => setStatusFilter('DRAFT')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
                statusFilter === 'DRAFT' ? 'bg-card text-amber-600 shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              المسودات ({sizeCharts.filter((s) => s.status === 'DRAFT').length})
            </button>
            <button
              onClick={() => setStatusFilter('ARCHIVED')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
                statusFilter === 'ARCHIVED' ? 'bg-card text-muted-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              المؤرشفة ({sizeCharts.filter((s) => s.status === 'ARCHIVED').length})
            </button>
          </div>
        </div>

        {/* Content Table / Cards */}
        <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-xs">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">جارٍ تحميل جداول المقاسات...</div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-destructive">{error}</div>
          ) : filteredCharts.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <Ruler className="w-8 h-8 mx-auto text-muted-foreground/50" />
              <p>لم يتم العثور على أي جداول مقاسات مطابقة للفلاتر المحددة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="p-3 font-semibold">كود الجدول والإصدار</th>
                    <th className="p-3 font-semibold">اسم جدول المقاسات</th>
                    <th className="p-3 font-semibold">الوحدة وطريقة القياس</th>
                    <th className="p-3 font-semibold">الملف الفني المرتبط</th>
                    <th className="p-3 font-semibold">إجمالي القياسات</th>
                    <th className="p-3 font-semibold">الحالة</th>
                    <th className="p-3 font-semibold text-center">إجراءات ومقارنة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredCharts.map((sc) => (
                    <tr key={sc.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-foreground">{sc.code}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border/60">
                            V{sc.version}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-foreground block">{sc.name}</span>
                        {sc.notes && (
                          <span className="text-[10px] text-muted-foreground line-clamp-1 truncate max-w-xs block">
                            {sc.notes}
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-foreground">
                            {sc.unit}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            ({sc.measurementMethod === 'FLAT' ? 'فلات نصف محيط' : 'دائري محيط كامل'})
                          </span>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {sc.techPack ? (
                          <span className="px-2 py-0.5 rounded text-[11px] bg-primary/10 text-primary font-medium">
                            {sc.techPack.name} ({sc.techPack.code})
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-foreground">
                          {sc.rowsCount || (sc.rows || []).length} قياس
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {sc.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            معتمد ✅
                          </span>
                        )}
                        {sc.status === 'DRAFT' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            مسودة ⏳
                          </span>
                        )}
                        {sc.status === 'ARCHIVED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-muted text-muted-foreground border border-border/60">
                            <Archive className="w-3 h-3" />
                            مؤرشف
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenCompare(sc)}
                            title="مقارنة النسخ الثلاث وفحص التفاوتات"
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition"
                          >
                            <GitCompare className="w-3.5 h-3.5" />
                            <span>مقارنة النسخ</span>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(sc)}
                            title="تعديل المصفوفة"
                            className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted/50 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenClone(sc)}
                            title="استنساخ إصدار جديد"
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenVersions(sc)}
                            title="سجل الإصدارات"
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                          </button>
                          {sc.status === 'DRAFT' && (
                            <button
                              onClick={() => handleApprove(sc)}
                              title="اعتماد جدول المقاسات"
                              className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-2xs"
                            >
                              اعتماد
                            </button>
                          )}
                          {sc.status !== 'ARCHIVED' && (
                            <button
                              onClick={() => handleArchive(sc)}
                              title="أرشفة"
                              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted/50 transition"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <SizeChartModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedSizeChart(null);
        }}
        onSuccess={() => {
          setModalOpen(false);
          setSelectedSizeChart(null);
          loadData();
        }}
        initialSizeChart={selectedSizeChart}
        mode={modalMode}
      />

      <SizeChartComparisonModal
        isOpen={compareModalOpen}
        onClose={() => {
          setCompareModalOpen(false);
          setCompareTarget(null);
        }}
        sizeChart={compareTarget}
      />

      <SizeChartVersionsModal
        isOpen={versionsModalOpen}
        onClose={() => {
          setVersionsModalOpen(false);
          setVersionTarget(null);
        }}
        sizeChart={versionTarget}
      />
    </div>
  );
};

export default SizeChartsPage;
