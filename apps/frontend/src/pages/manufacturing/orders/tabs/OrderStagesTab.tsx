import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Play,
  User,
  Edit2,
  Building2,
  Truck,
  PackageCheck,
  RotateCw,
  FileText,
} from 'lucide-react';
import {
  ProductionOrder,
  ProductionStage,
  ProductionStageStatus,
  manufacturingApi,
} from '../../manufacturingApi';
import { StageAssignmentModal } from './StageAssignmentModal';
import { StageEventModal } from './StageEventModal';

interface OrderStagesTabProps {
  order: ProductionOrder;
  onRefresh: () => void;
}

export const OrderStagesTab: React.FC<OrderStagesTabProps> = ({ order, onRefresh }) => {
  const [editingStage, setEditingStage] = useState<ProductionStage | null>(null);
  const [assigningStage, setAssigningStage] = useState<ProductionStage | null>(null);
  const [eventModalData, setEventModalData] = useState<{
    stage: ProductionStage;
    event: 'SENT' | 'ACK_RECEIPT' | 'COMPLETED';
  } | null>(null);

  // Edit stage form state
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
      setError(err?.response?.data?.message || err?.message || 'فشل تحديث المرحلة');
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

  const isOrderClosed = order.status === 'COMPLETED' || order.status === 'CANCELLED';

  return (
    <div className="space-y-4 text-xs">
      {/* Stages Summary Bar */}
      <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-foreground">
            مراحل صالة الإنتاج والتشغيل (Shop Floor & Subcontract Stages)
          </h3>
          <p className="text-[11px] text-muted-foreground">
            تتبع مراحل التشغيل الداخلي والخارجي، إسناد المصانع الشركاء، وأجور العمالة المحققة
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
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
              <tr>
                <th className="p-3 w-10 text-center font-semibold">#</th>
                <th className="p-3 font-semibold">اسم المرحلة</th>
                <th className="p-3 font-semibold">نوع المرحلة</th>
                <th className="p-3 font-semibold">جهة التنفيذ والمصنع</th>
                <th className="p-3 font-semibold text-center">حالة التشغيل</th>
                <th className="p-3 font-semibold text-center">الكمية المنجزة</th>
                <th className="p-3 font-semibold">مسار المصنع الخارجي</th>
                <th className="p-3 font-semibold">أجر القطعة</th>
                <th className="p-3 font-semibold">التكلفة</th>
                <th className="p-3 font-semibold text-center w-28">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {stages.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-muted-foreground">
                    لا توجد مراحل مسجلة لهذا الأمر
                  </td>
                </tr>
              ) : (
                stages.map((st) => {
                  const isExternal = st.executionEntity === 'EXTERNAL';
                  const isCompleted = st.status === 'COMPLETED';

                  return (
                    <tr key={st.id} className="hover:bg-muted/20 transition">
                      <td className="p-3 text-center font-mono text-muted-foreground">{st.sequence}</td>
                      <td className="p-3">
                        <div className="font-bold text-foreground">{st.name}</div>
                        {st.factoryNotes && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-[180px] mt-0.5" title={st.factoryNotes}>
                            {st.factoryNotes}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border/60">
                          {st.stageType}
                        </span>
                      </td>

                      {/* Execution Entity & Partner Factory */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          {isExternal ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                              <Building2 className="w-3 h-3" />
                              <span>خارجي: {st.partnerFactory?.name || 'مصنع شريك'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
                              <span>داخلي (صالتنا)</span>
                            </span>
                          )}

                          {!isOrderClosed && !isCompleted && (
                            <button
                              onClick={() => setAssigningStage(st)}
                              title="تعديل جهة التنفيذ والمصنع الشريك"
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-center">{getStatusBadge(st.status)}</td>

                      <td className="p-3 text-center font-mono font-bold text-foreground">
                        {st.completedQuantity} / {order.plannedQuantity}
                      </td>

                      {/* External Factory Sequential Events */}
                      <td className="p-3">
                        {isExternal ? (
                          <div className="space-y-1">
                            {/* SENT step */}
                            {!st.sentToFactoryAt ? (
                              <button
                                onClick={() => setEventModalData({ stage: st, event: 'SENT' })}
                                disabled={isOrderClosed || isCompleted}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 disabled:opacity-40"
                              >
                                <Truck className="w-3 h-3" />
                                <span>إرسال للمصنع</span>
                              </button>
                            ) : !st.factoryAckReceiptAt ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Truck className="w-3 h-3 text-blue-500" />
                                  <span>أرسلت</span>
                                </span>
                                <button
                                  onClick={() => setEventModalData({ stage: st, event: 'ACK_RECEIPT' })}
                                  disabled={isOrderClosed || isCompleted}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 disabled:opacity-40"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>تأكيد استلام</span>
                                </button>
                              </div>
                            ) : !st.factoryCompletedAt ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-amber-500" />
                                  <span>استلمها المصنع</span>
                                </span>
                                <button
                                  onClick={() => setEventModalData({ stage: st, event: 'COMPLETED' })}
                                  disabled={isOrderClosed || isCompleted}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 disabled:opacity-40"
                                >
                                  <PackageCheck className="w-3 h-3" />
                                  <span>تأكيد إتمام</span>
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>تم الإنجاز بالمصنع</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 text-[11px]">— تشغيل داخلي —</span>
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
                          disabled={isOrderClosed}
                          className="flex items-center justify-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 transition"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>تسجيل</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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

      {/* Stage Execution Assignment Modal */}
      {assigningStage && (
        <StageAssignmentModal
          orderId={order.id}
          stage={assigningStage}
          onClose={() => setAssigningStage(null)}
          onSuccess={onRefresh}
        />
      )}

      {/* Stage Factory Event Modal */}
      {eventModalData && (
        <StageEventModal
          orderId={order.id}
          stage={eventModalData.stage}
          event={eventModalData.event}
          onClose={() => setEventModalData(null)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
};
