import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  BookOpen,
  Copy,
  Edit,
  CheckCircle2,
  Clock,
  Archive,
  GitBranch,
  Layers,
  FileText,
  RotateCw,
  ExternalLink,
} from 'lucide-react';
import { ManufacturingHeader } from '../ManufacturingHeader';
import { manufacturingApi, TechPack } from '../manufacturingApi';
import { TechPackModal } from './TechPackModal';
import { TechPackVersionsModal } from './TechPackVersionsModal';

export const TechPacksPage: React.FC = () => {
  const [techPacks, setTechPacks] = useState<TechPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'DRAFT' | 'ARCHIVED'>('ALL');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'clone'>('create');
  const [selectedTechPack, setSelectedTechPack] = useState<TechPack | null>(null);

  const [versionsModalOpen, setVersionsModalOpen] = useState(false);
  const [versionTarget, setVersionTarget] = useState<TechPack | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await manufacturingApi.listTechPacks();
      setTechPacks(res);
    } catch (err: any) {
      setError('تعذر تحميل ملفات المنتجات الفنية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTechPacks = useMemo(() => {
    return techPacks.filter((tp) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        tp.code.toLowerCase().includes(q) ||
        tp.name.toLowerCase().includes(q) ||
        (tp.brand || '').toLowerCase().includes(q);

      const matchStatus = statusFilter === 'ALL' || tp.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [techPacks, search, statusFilter]);

  const handleOpenCreate = () => {
    setSelectedTechPack(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const handleOpenEdit = (tp: TechPack) => {
    setSelectedTechPack(tp);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleOpenClone = async (tp: TechPack) => {
    if (window.confirm(`هل تريد استنساخ إصدار مسودة جديد من الملف الفني "${tp.name}" (${tp.code})؟`)) {
      try {
        const cloned = await manufacturingApi.cloneTechPackVersion(tp.id);
        await loadData();
        setSelectedTechPack(cloned);
        setModalMode('edit');
        setModalOpen(true);
      } catch (err: any) {
        alert(err.response?.data?.message || err.message || 'فشل استنساخ الإصدار');
      }
    }
  };

  const handleApprove = async (tp: TechPack) => {
    try {
      await manufacturingApi.approveTechPack(tp.id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'فشل اعتماد الملف الفني');
    }
  };

  const handleArchive = async (tp: TechPack) => {
    if (window.confirm(`هل أنت متأكد من أرشفة الملف الفني "${tp.name}" (${tp.code})؟`)) {
      try {
        await manufacturingApi.archiveTechPack(tp.id);
        await loadData();
      } catch (err: any) {
        alert(err.response?.data?.message || err.message || 'فشل أرشفة الملف الفني');
      }
    }
  };

  const handleOpenVersions = (tp: TechPack) => {
    setVersionTarget(tp);
    setVersionsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      <ManufacturingHeader
        title="ملفات المنتجات الفنية (Tech Packs)"
        subtitle="إدارة المواصفات الفنية والهندسية للموديلات وإصدارات الاعتماد لخطوط الإنتاج وبوابة المصنع"
        actions={
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ملف فني جديد (Tech Pack)</span>
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
              placeholder="بحث بالكود أو اسم الموديل أو البراند..."
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
              الكل ({techPacks.length})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
                statusFilter === 'APPROVED' ? 'bg-card text-emerald-600 shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              المعتمدة ({techPacks.filter((t) => t.status === 'APPROVED').length})
            </button>
            <button
              onClick={() => setStatusFilter('DRAFT')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
                statusFilter === 'DRAFT' ? 'bg-card text-amber-600 shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              المسودات ({techPacks.filter((t) => t.status === 'DRAFT').length})
            </button>
            <button
              onClick={() => setStatusFilter('ARCHIVED')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
                statusFilter === 'ARCHIVED' ? 'bg-card text-muted-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              المؤرشفة ({techPacks.filter((t) => t.status === 'ARCHIVED').length})
            </button>
          </div>
        </div>

        {/* Content Table / Cards */}
        <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-xs">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">جارٍ تحميل ملفات المنتجات الفنية...</div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-destructive">{error}</div>
          ) : filteredTechPacks.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/50" />
              <p>لم يتم العثور على أي ملفات فنية مطابقة للفلاتر المحددة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="p-3 font-semibold">كود الملف والإصدار</th>
                    <th className="p-3 font-semibold">اسم الموديل / المنتج</th>
                    <th className="p-3 font-semibold">البراند</th>
                    <th className="p-3 font-semibold">مواصفات الخامة</th>
                    <th className="p-3 font-semibold">الملفات الفنية</th>
                    <th className="p-3 font-semibold">الحالة</th>
                    <th className="p-3 font-semibold text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredTechPacks.map((tp) => (
                    <tr key={tp.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-foreground">{tp.code}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border/60">
                            V{tp.version}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-foreground block">{tp.name}</span>
                        {tp.instructions && (
                          <span className="text-[10px] text-muted-foreground line-clamp-1 truncate max-w-xs block">
                            {tp.instructions}
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-muted/60 text-foreground font-medium">
                          {tp.brand || 'HUINZO'}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs">
                        <span className="text-[11px] text-foreground line-clamp-1 block">
                          {tp.fabricSummary || '—'}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          <span>{tp.filesCount || (tp.files || []).length} ملف</span>
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {tp.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            معتمد ✅
                          </span>
                        )}
                        {tp.status === 'DRAFT' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            مسودة ⏳
                          </span>
                        )}
                        {tp.status === 'ARCHIVED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-muted text-muted-foreground border border-border/60">
                            <Archive className="w-3 h-3" />
                            مؤرشف
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(tp)}
                            title="تعديل الملف الفني"
                            className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted/50 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenClone(tp)}
                            title="استنساخ إصدار جديد"
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenVersions(tp)}
                            title="سجل الإصدارات"
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                          </button>
                          {tp.status === 'DRAFT' && (
                            <button
                              onClick={() => handleApprove(tp)}
                              title="اعتماد الملف الفني"
                              className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-2xs"
                            >
                              اعتماد
                            </button>
                          )}
                          {tp.status !== 'ARCHIVED' && (
                            <button
                              onClick={() => handleArchive(tp)}
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
      <TechPackModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedTechPack(null);
        }}
        onSuccess={() => {
          setModalOpen(false);
          setSelectedTechPack(null);
          loadData();
        }}
        initialTechPack={selectedTechPack}
        mode={modalMode}
      />

      <TechPackVersionsModal
        isOpen={versionsModalOpen}
        onClose={() => {
          setVersionsModalOpen(false);
          setVersionTarget(null);
        }}
        techPack={versionTarget}
      />
    </div>
  );
};

export default TechPacksPage;
