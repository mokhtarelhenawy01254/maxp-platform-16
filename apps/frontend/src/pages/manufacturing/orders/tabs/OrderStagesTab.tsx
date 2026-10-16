import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Play,
  User,
  Wrench,
  Edit2,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import {
  ProductionOrder,
  ProductionStage,
  ProductionStageStatus,
  manufacturingApi,
} from '../../manufacturingApi';

interface OrderStagesTabProps {
  order: ProductionOrder;
  onRefresh: () => void;
}

export const OrderStagesTab: React.FC<OrderStagesTabProps> = ({ order, onRefresh }) => {
  const [editingStage, setEditingStage] = useState<ProductionStage | null>(null);
  const [completedQty, setCompletedQty] = useState(0);
  const [scrapQty, setScrapQty] = useState(0);
  const [actualMinutes, setActualMinutes] = useState(0);
  const [worker, setWorker] = useState('');
  const [status, setStatus] = useState<ProductionStageStatus>('COMPLETED');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stages = order.stages || [];
  const totalLaborCost = stages.reduce((sum, s) => sum + (Number(s.stageLaborCost) || 0), 0);

  const handleOpenEdit = (stage: ProductionStage) => {
    setEditingStage(stage);
    setCompletedQty(Number(stage.completedQuantity) || Number(order.plannedQuantity));
    setScrapQty(0);
    setActualMinutes(Number(stage.actualMinutes) || Number(stage.standardMinutes) || 0);
    setWorker(stage.assignedWorker || '');
    setStatus(stage.status === 'PENDING' ? 'COMPLETED' : stage.status);
    setNotes(stage.notes || '');
    setError(null);
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStage) return;
    try {
      setSaving(true);
      setError(null);
      await manufacturingApi.updateStageProgress(order.id, editingStage.id, {
        completedQuantity: Number(completedQty),
        scrapQuantity: Number(scrapQty),
        actualMinutes: Number(actualMinutes),
        assignedWorker: worker.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
      });
      setEditingStage(null);
      onRefresh();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'فشل تحديث المرحلة');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (st: ProductionStageStatus) => {
    switch (st) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>مكتملة</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <Play className="w-3 h-3" />
            <span>قيد العمل</span>
          </span>
        );
      case 'SKIPPED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border/60">
            <span>تم التخطي</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border/60">
            <Clock className="w-3 h-3" />
            <span>بانتظار البدء</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Stages Summary Bar */}
      <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-foreground">مراحل صالة الإنتاج والتشغيل (Shop Floor Stages)</h3>
          <p className="text-[11px] text-muted-foreground">
            تسجيل إنتاجية العمال والأجور المباشرة بالقطعة لكل مرحلة صناعية
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium">
          إجمالي أجور العمالة المحققة:{' '}
          <span className="font-mono font-bold text-sm tabular-nums">
            {totalLaborCost.toFixed(2)}
          </span>{' '}
          <span className="text-[10px] font-sans">ج.م</span>
        </div>
      </div>

      {/* Stages Table */}
      <div className="rounded-xl bg-card border border-border/70 overflow-hidden shadow-xs">
        <table className="w-full text-right text-xs">
          <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
            <tr>
              <th className="p-3 w-12 text-center font-semibold">#</th>
              <th className="p-3 font-semibold">اسم المرحلة</th>
              <th className="p-3 font-semibold">نوع المرحلة</th>
              <th className="p-3 font-semibold text-center">الحالة</th>
              <th className="p-3 font-semibold text-center">الكمية المنجزة</th>
              <th className="p-3 font-semibold">الفني / العامل</th>
              <th className="p-3 font-semibold">أجر القطعة</th>
              <th className="p-3 font-semibold">تكلفة المرحلة</th>
              <th className="p-3 font-semibold text-center w-24">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {stages.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-muted-foreground">
                  لا توجد مراحل مسجلة لهذا الأمر
                </td>
              </tr>
            ) : (
              stages.map((st) => (
                <tr key={st.id} className="hover:bg-muted/20 transition">
                  <td className="p-3 text-center font-mono text-muted-foreground">{st.sequence}</td>
                  <td className="p-3 font-bold text-foreground">{st.name}</td>
                  <td className="p-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border/60">
                      {st.stageType}
                    </span>
                  </td>
                  <td className="p-3 text-center">{getStatusBadge(st.status)}</td>
                  <td className="p-3 text-center font-mono font-bold text-foreground">
                    {st.completedQuantity} / {order.plannedQuantity}
                  </td>
                  <td className="p-3">
                    {st.assignedWorker ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>{st.assignedWorker}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                  <td className="p-3 font-mono tabular-nums text-muted-foreground">
                    {Number(st.ratePerPiece).toFixed(2)} ج.م
                  </td>
                  <td className="p-3 font-mono font-bold tabular-nums text-emerald-600">
                    {Number(st.stageLaborCost).toFixed(2)} ج.م
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleOpenEdit(st)}
                      disabled={order.status === 'COMPLETED' || order.status === 'CANCELLED'}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 transition"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>تسجيل</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stage Progress Update Modal */}
      {editingStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
          <div className="w-full max-w-md rounded-xl bg-card border border-border/70 shadow-2xl overflow-hidden text-foreground">
            <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
              <h3 className="text-xs font-bold text-foreground">
                تسجيل إنجاز: {editingStage.name}
              </h3>
              <button
                onClick={() => setEditingStage(null)}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveStage} className="p-4 space-y-3.5 text-xs">
              {error && (
                <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">الكمية المنجزة</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={completedQty}
                    onChange={(e) => setCompletedQty(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 text-xs rounded border border-border bg-background font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">الكمية الهالكة بالخطوة</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={scrapQty}
                    onChange={(e) => setScrapQty(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 text-xs rounded border border-border bg-background font-mono text-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">حالة المرحلة</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProductionStageStatus)}
                  className="w-full p-2 text-xs rounded border border-border bg-background"
                >
                  <option value="IN_PROGRESS">قيد العمل (IN_PROGRESS)</option>
                  <option value="COMPLETED">مكتملة (COMPLETED)</option>
                  <option value="SKIPPED">تخطي (SKIPPED)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">اسم العامل / الفني</label>
                  <input
                    type="text"
                    value={worker}
                    onChange={(e) => setWorker(e.target.value)}
                    placeholder="مثال: أحمد عبد الله"
                    className="w-full p-2 text-xs rounded border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">الزمن الفعلي (دقيقة)</label>
                  <input
                    type="number"
                    min="0"
                    value={actualMinutes}
                    onChange={(e) => setActualMinutes(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 text-xs rounded border border-border bg-background font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">ملاحظات المرحلة</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات فنية أو فحص..."
                  className="w-full p-2 text-xs rounded border border-border bg-background"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setEditingStage(null)}
                  className="px-3 py-1.5 rounded border border-border text-muted-foreground hover:bg-muted/40 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {saving ? 'جارٍ الحفظ...' : 'حفظ التحديث'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
