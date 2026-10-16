import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  RotateCw,
  Layers,
  Copy,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';
import { ManufacturingHeader } from '../ManufacturingHeader';
import { manufacturingApi, BillOfMaterials } from '../manufacturingApi';
import { BomModal } from './BomModal';
import { BomDetailDrawer } from './BomDetailDrawer';

export const ManufacturingBomsPage: React.FC = () => {
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals & Drawers
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'clone'>('create');
  const [selectedBom, setSelectedBom] = useState<BillOfMaterials | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await manufacturingApi.listBoms();
      setBoms(res);
    } catch (err: any) {
      console.error('Failed to load BOMs', err);
      setError('تعذر تحميل قوائم المكونات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredBoms = useMemo(() => {
    return boms.filter((b) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        b.code.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        (b.notes || '').toLowerCase().includes(q);

      const matchActive =
        activeFilter === 'ALL' ||
        (activeFilter === 'ACTIVE' && b.isActive) ||
        (activeFilter === 'INACTIVE' && !b.isActive);

      return matchSearch && matchActive;
    });
  }, [boms, search, activeFilter]);

  const handleToggleActive = async (bom: BillOfMaterials) => {
    try {
      await manufacturingApi.updateBom(bom.id, { isActive: !bom.isActive });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'فشل تحديث حالة القائمة');
    }
  };

  const handleDelete = async (bom: BillOfMaterials) => {
    if (!window.confirm(`هل أنت متأكد من حذف قائمة المكونات "${bom.name}" (${bom.code})؟`)) {
      return;
    }
    try {
      await manufacturingApi.deleteBom(bom.id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'تعذر حذف القائمة (قد يكون مرتبطاً بها أوامر تشغيل)');
    }
  };

  const handleOpenCreate = () => {
    setSelectedBom(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const handleOpenEdit = (bom: BillOfMaterials) => {
    setSelectedBom(bom);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleOpenClone = (bom: BillOfMaterials) => {
    setSelectedBom(bom);
    setModalMode('clone');
    setModalOpen(true);
  };

  const handleOpenDetail = (bom: BillOfMaterials) => {
    setSelectedBom(bom);
    setDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      <ManufacturingHeader
        title="قوائم المكونات والوصفات (BOMs)"
        subtitle="إدارة المواصفات الفنية ومصفوفات الخامات ومعدلات الهدر وأجور المراحل"
        actions={
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>قائمة مكونات جديدة (BOM)</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        {/* Filter Strip */}
        <div className="p-3 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بكود الـ BOM أو اسم الموديل..."
                className="w-full pl-3 pr-9 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60 text-xs">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  activeFilter === 'ALL' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                الكل ({boms.length})
              </button>
              <button
                onClick={() => setActiveFilter('ACTIVE')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  activeFilter === 'ACTIVE' ? 'bg-card text-emerald-600 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                المفعلة ({boms.filter((b) => b.isActive).length})
              </button>
              <button
                onClick={() => setActiveFilter('INACTIVE')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  activeFilter === 'INACTIVE' ? 'bg-card text-muted-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                المعطلة ({boms.filter((b) => !b.isActive).length})
              </button>
            </div>

            <button
              onClick={loadData}
              title="تحديث البيانات"
              className="p-2 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={loadData}
              className="px-2.5 py-1 rounded bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 text-[11px] flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        )}

        {/* BOMs Table */}
        <div className="rounded-xl bg-card border border-border/70 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="p-3.5 font-semibold">كود القائمة والإصدار</th>
                  <th className="p-3.5 font-semibold">اسم الموديل / الوصف</th>
                  <th className="p-3.5 font-semibold text-center">الخامات</th>
                  <th className="p-3.5 font-semibold text-center">المراحل</th>
                  <th className="p-3.5 font-semibold text-center">نسبة الهالك</th>
                  <th className="p-3.5 font-semibold">أجر العمالة</th>
                  <th className="p-3.5 font-semibold">الأعباء MOH</th>
                  <th className="p-3.5 font-semibold text-center">الحالة</th>
                  <th className="p-3.5 font-semibold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground text-xs">
                      <div className="flex items-center justify-center gap-2">
                        <RotateCw className="w-4 h-4 animate-spin text-primary" />
                        <span>جارٍ تحميل قوائم المكونات...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredBoms.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground text-xs">
                      لا توجد قوائم مكونات مطابقة لمعايير البحث.
                    </td>
                  </tr>
                ) : (
                  filteredBoms.map((bom) => {
                    const compCount = bom.components?.length ?? bom._count?.components ?? 0;
                    const stageCount = bom.standardStages?.length ?? 0;
                    return (
                      <tr key={bom.id} className="hover:bg-muted/20 transition">
                        <td className="p-3 font-mono">
                          <button
                            onClick={() => handleOpenDetail(bom)}
                            className="font-bold text-primary hover:underline flex items-center gap-1.5"
                          >
                            <span>{bom.code}</span>
                            <span className="text-[10px] font-normal px-1 rounded bg-muted text-muted-foreground border border-border/60">
                              v{bom.version}
                            </span>
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-foreground">{bom.name}</div>
                          {bom.notes && <div className="text-[11px] text-muted-foreground truncate max-w-xs">{bom.notes}</div>}
                        </td>
                        <td className="p-3 text-center font-mono tabular-nums text-foreground">
                          {compCount} خامات
                        </td>
                        <td className="p-3 text-center font-mono tabular-nums text-foreground">
                          {stageCount} مراحل
                        </td>
                        <td className="p-3 text-center font-mono text-amber-600 font-bold">
                          {bom.wasteMarginPercent}%
                        </td>
                        <td className="p-3 font-mono tabular-nums text-foreground">
                          {Number(bom.laborCostPerUnit).toFixed(2)}{' '}
                          <span className="text-[10px] text-muted-foreground font-sans">ج.م</span>
                        </td>
                        <td className="p-3 font-mono tabular-nums text-foreground">
                          {Number(bom.overheadCostPerUnit).toFixed(2)}{' '}
                          <span className="text-[10px] text-muted-foreground font-sans">ج.م</span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleActive(bom)}
                            title={bom.isActive ? 'انقر للتعطيل' : 'انقر للتفعيل'}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                              bom.isActive
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-muted text-muted-foreground border-border/60 hover:bg-muted/80'
                            }`}
                          >
                            {bom.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            <span>{bom.isActive ? 'مفعلة' : 'معطلة'}</span>
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenDetail(bom)}
                              title="عرض التفاصيل والمكونات"
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(bom)}
                              title="تعديل الـ BOM"
                              className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted/50 transition"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenClone(bom)}
                              title="استنساخ إصدار جديد"
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(bom)}
                              title="حذف الـ BOM"
                              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted/50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals & Drawer */}
      <BomModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadData}
        initialBom={selectedBom}
        mode={modalMode}
      />

      <BomDetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        bom={selectedBom}
        onEdit={handleOpenEdit}
        onClone={handleOpenClone}
      />
    </div>
  );
};

export default ManufacturingBomsPage;
