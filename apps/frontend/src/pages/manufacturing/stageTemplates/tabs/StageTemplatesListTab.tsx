import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Power,
  RotateCw,
  Building2,
  Clock,
  Coins,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  ProductionStageTemplate,
  ProductionStageType,
  manufacturingApi,
} from '../../manufacturingApi';
import { StageTemplateModal } from '../modals/StageTemplateModal';

interface StageTemplatesListTabProps {
  templates: ProductionStageTemplate[];
  loading: boolean;
  onRefresh: () => void;
}

const STAGE_TYPE_LABELS: Record<ProductionStageType, string> = {
  CUTTING: 'قص وتفصيل',
  PRINTING_EMBROIDERY: 'طباعة وتطريز',
  SEWING: 'خياطة وتجميع',
  FINISHING: 'تشطيب وكي',
  QC: 'فحص وجودة',
  PACKAGING: 'تعبئة وتغليف',
  CUSTOM: 'مرحلة مخصصة',
};

export const StageTemplatesListTab: React.FC<StageTemplatesListTabProps> = ({
  templates,
  loading,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [stageTypeFilter, setStageTypeFilter] = useState('');
  const [executionFilter, setExecutionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProductionStageTemplate | null>(null);

  const filteredTemplates = templates.filter((t) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchCode = t.code.toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }
    if (stageTypeFilter && t.stageType !== stageTypeFilter) return false;
    if (executionFilter && t.executionEntity !== executionFilter) return false;
    if (statusFilter === 'ACTIVE' && !t.isActive) return false;
    if (statusFilter === 'INACTIVE' && t.isActive) return false;
    return true;
  });

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setModalOpen(true);
  };

  const handleEdit = (tmpl: ProductionStageTemplate) => {
    setEditingTemplate(tmpl);
    setModalOpen(true);
  };

  const handleToggleActive = async (tmpl: ProductionStageTemplate) => {
    try {
      if (tmpl.isActive) {
        await manufacturingApi.archiveStageTemplate(tmpl.id);
      } else {
        await manufacturingApi.updateStageTemplate(tmpl.id, { isActive: true });
      }
      onRefresh();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'فشل تعديل حالة القالب');
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
              placeholder="بحث بالاسم أو الكود..."
              className="w-full pr-8 pl-3 py-1.5 rounded-lg bg-background border border-border/70 focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
            />
          </div>

          <select
            value={stageTypeFilter}
            onChange={(e) => setStageTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-background border border-border/70 text-xs text-muted-foreground"
          >
            <option value="">جميع أنواع المراحل</option>
            {Object.entries(STAGE_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={executionFilter}
            onChange={(e) => setExecutionFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-background border border-border/70 text-xs text-muted-foreground"
          >
            <option value="">كافة جهات التنفيذ</option>
            <option value="INTERNAL">داخلي بصالة المصنع</option>
            <option value="EXTERNAL">خارجي (مصانع شركاء)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg bg-background border border-border/70 text-xs text-muted-foreground"
          >
            <option value="ALL">كافة الحالات</option>
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
            <span>إنشاء قالب مرحلة جديد</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
              <tr>
                <th className="p-3 font-semibold w-24">الكود</th>
                <th className="p-3 font-semibold">اسم المرحلة القياسية</th>
                <th className="p-3 font-semibold">نوع المرحلة</th>
                <th className="p-3 font-semibold">جهة التنفيذ</th>
                <th className="p-3 font-semibold">أجر القطعة القياسي</th>
                <th className="p-3 font-semibold">الوقت المعياري</th>
                <th className="p-3 font-semibold text-center">مرات الاستدعاء</th>
                <th className="p-3 font-semibold text-center">الحالة</th>
                <th className="p-3 font-semibold text-center w-28">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    {loading ? 'جاري التحميل...' : 'لا توجد قوالب مراحل مطابقة للبحث أو الفلتر'}
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/20 transition">
                    <td className="p-3 font-mono text-muted-foreground font-semibold">{t.code}</td>
                    <td className="p-3">
                      <div className="font-bold text-foreground">{t.name}</div>
                      {t.instructions && (
                        <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                          {t.instructions}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-muted border border-border/60">
                        {STAGE_TYPE_LABELS[t.stageType] || t.stageType}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            t.executionEntity === 'EXTERNAL'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-primary/10 text-primary border border-primary/20'
                          }`}
                        >
                          {t.executionEntity === 'EXTERNAL' ? 'خارجي' : 'داخلي'}
                        </span>
                        {t.defaultPartnerFactory && (
                          <span className="text-[10px] text-muted-foreground">
                            ({t.defaultPartnerFactory.name})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-600 tabular-nums">
                      {Number(t.ratePerPiece).toFixed(2)}{' '}
                      <span className="text-[10px] font-sans font-normal text-muted-foreground">ج.م/قطعة</span>
                    </td>
                    <td className="p-3 font-mono text-foreground tabular-nums">
                      {t.standardMinutes}{' '}
                      <span className="text-[10px] font-sans text-muted-foreground">دقيقة</span>
                    </td>
                    <td className="p-3 text-center font-mono tabular-nums">
                      <span className="px-2 py-0.5 rounded-full bg-muted font-bold text-[10px]">
                        {t.usageCount || 0}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          t.isActive
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {t.isActive ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(t)}
                          title="تعديل القالب"
                          className="p-1 rounded text-primary hover:bg-primary/10 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(t)}
                          title={t.isActive ? 'تعطيل القالب' : 'إعادة تفعيل القالب'}
                          className={`p-1 rounded transition ${
                            t.isActive
                              ? 'text-rose-500 hover:bg-rose-500/10'
                              : 'text-emerald-600 hover:bg-emerald-500/10'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StageTemplateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={onRefresh}
        initialTemplate={editingTemplate}
      />
    </div>
  );
};
