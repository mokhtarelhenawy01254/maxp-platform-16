import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Power,
  RotateCw,
  Layers,
  Clock,
  Coins,
  ListOrdered,
  Calendar,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import {
  ProductionStageTemplateSet,
  manufacturingApi,
} from '../../manufacturingApi';
import { StageTemplateSetModal } from '../modals/StageTemplateSetModal';
import { StageTemplateSetDetailsModal } from '../modals/StageTemplateSetDetailsModal';

interface StageTemplateSetsTabProps {
  sets: ProductionStageTemplateSet[];
  loading: boolean;
  onRefresh: () => void;
}

export const StageTemplateSetsTab: React.FC<StageTemplateSetsTabProps> = ({
  sets,
  loading,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<ProductionStageTemplateSet | null>(null);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedSetIdForDetails, setSelectedSetIdForDetails] = useState<string | null>(null);

  const filteredSets = sets.filter((s) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchCode = s.code.toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }
    if (statusFilter === 'ACTIVE' && !s.isActive) return false;
    if (statusFilter === 'INACTIVE' && s.isActive) return false;
    return true;
  });

  const handleCreateNew = () => {
    setEditingSet(null);
    setCreateModalOpen(true);
  };

  const handleEdit = (s: ProductionStageTemplateSet) => {
    setEditingSet(s);
    setCreateModalOpen(true);
  };

  const handleOpenDetails = (setId: string) => {
    setSelectedSetIdForDetails(setId);
    setDetailsModalOpen(true);
  };

  const handleToggleActive = async (s: ProductionStageTemplateSet) => {
    try {
      if (s.isActive) {
        await manufacturingApi.archiveStageTemplateSet(s.id);
      } else {
        await manufacturingApi.updateStageTemplateSet(s.id, { isActive: true });
      }
      onRefresh();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'فشل تعديل حالة المجموعة');
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Top Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border/70 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في المجموعات والمسارات القياسية..."
              className="w-full pr-8 pl-3 py-1.5 rounded-lg bg-background border border-border/70 focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg bg-background border border-border/70 text-xs text-muted-foreground"
          >
            <option value="ALL">كافة المجموعات</option>
            <option value="ACTIVE">النشطة فقط</option>
            <option value="INACTIVE">المعطلة</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            title="تحديث البيانات"
            className="p-2 rounded-lg border border-border/70 text-muted-foreground hover:bg-muted/40 transition"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition shadow-xs text-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء مسار تشغيل قياسي (Set)</span>
          </button>
        </div>
      </div>

      {/* Grid of Sets */}
      {filteredSets.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground bg-card border border-dashed border-border/70 rounded-2xl">
          <Layers className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="font-semibold text-foreground">لا توجد مسارات قياسية حالياً</p>
          <p className="text-[11px] mt-1">
            أنشئ مجموعة تضم مراحل منتجاتك (مثل: هودي، قميص، تيشرت) للاستدعاء بضغطة زر
          </p>
          <button
            onClick={handleCreateNew}
            className="mt-3 px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition text-xs"
          >
            إنشاء أول مسار قياسي
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredSets.map((s) => {
            const items = s.items || [];
            const totalMinutes = items.reduce(
              (sum, it) => sum + (Number(it.template?.standardMinutes) || 0),
              0
            );
            const totalLabor = items.reduce(
              (sum, it) => sum + (Number(it.template?.ratePerPiece) || 0),
              0
            );

            return (
              <div
                key={s.id}
                className="rounded-2xl bg-card border border-border/70 p-4 shadow-2xs hover:border-border transition flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-foreground">{s.name}</h3>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                          {s.code}
                        </span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${
                            s.isActive
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {s.isActive ? 'نشط' : 'معطل'}
                        </span>
                      </div>
                      {s.description && (
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                          {s.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(s)}
                        title="تعديل اسم ووصف المسار"
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(s)}
                        title={s.isActive ? 'تعطيل المسار' : 'إعادة تفعيل المسار'}
                        className={`p-1.5 rounded-lg transition ${
                          s.isActive
                            ? 'text-rose-500 hover:bg-rose-500/10'
                            : 'text-emerald-600 hover:bg-emerald-500/10'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Metrics */}
                  <div className="grid grid-cols-3 gap-2 my-3 p-2.5 rounded-xl bg-muted/20 border border-border/60 text-[11px]">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">عدد المراحل</span>
                      <span className="font-mono font-bold text-foreground tabular-nums">
                        {items.length} مرحلة
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">إجمالي الوقت</span>
                      <span className="font-mono font-bold text-foreground tabular-nums">
                        {totalMinutes.toFixed(1)} دقيقة
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">أجر العمالة المعياري</span>
                      <span className="font-mono font-bold text-emerald-600 tabular-nums">
                        {totalLabor.toFixed(2)} ج.م/ق
                      </span>
                    </div>
                  </div>

                  {/* Stage Sequence Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground block">
                      تسلسل المراحل التشغيلية بالمسار:
                    </span>
                    {items.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic py-1">
                        لا توجد مراحل مرتبطة بهذا المسار حتى الآن
                      </p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {items.map((it, idx) => (
                          <span
                            key={it.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background border border-border/70 text-[11px] font-medium"
                          >
                            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-mono flex items-center justify-center font-bold">
                              {it.sequence}
                            </span>
                            <span className="text-foreground">{it.template?.name || 'مرحلة'}</span>
                            {it.template?.executionEntity === 'EXTERNAL' && (
                              <span className="text-[9px] text-amber-600 font-normal">(خارجي)</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span>
                      مستخدَم:{' '}
                      <strong className="font-mono text-foreground font-bold tabular-nums">
                        {s.usageCount || 0}
                      </strong>{' '}
                      مرة
                    </span>
                    {s.lastUsedAt && (
                      <span className="text-[10px]">
                        آخر استدعاء: {new Date(s.lastUsedAt).toLocaleDateString('ar-EG')}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenDetails(s.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition text-xs"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>إدارة وترتيب البنود ({items.length})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <StageTemplateSetModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={onRefresh}
        initialSet={editingSet}
      />

      <StageTemplateSetDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        onRefreshSets={onRefresh}
        setId={selectedSetIdForDetails}
      />
    </div>
  );
};
