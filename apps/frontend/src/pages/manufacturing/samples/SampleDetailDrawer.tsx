import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  Play,
  Check,
  Plus,
  Upload,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { manufacturingApi, SampleOrder, SampleOrderStage } from '../manufacturingApi';
import { SampleStatusBadge, MaterialSourceBadge } from './SampleStatusBadge';
import { ConvertToOrderModal } from './ConvertToOrderModal';
import { SampleApproveModal, SampleRejectModal } from './SampleApproveRejectModals';

interface SampleDetailDrawerProps {
  sample: SampleOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const SampleDetailDrawer: React.FC<SampleDetailDrawerProps> = ({
  sample,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'stages' | 'attachments'>('stages');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals inside drawer
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);

  // Add stage form state
  const [newStageName, setNewStageName] = useState('');
  const [isAddingStage, setIsAddingStage] = useState(false);

  // File upload
  const [uploadingFile, setUploadingFile] = useState(false);

  if (!isOpen || !sample) return null;

  const handleStageStatusChange = async (stage: SampleOrderStage, newStatus: string) => {
    try {
      setLoading(true);
      await manufacturingApi.updateSampleStage(sample.id, stage.id, {
        status: newStatus,
        startedAt: newStatus === 'IN_PROGRESS' ? new Date().toISOString() : undefined,
        completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
      });
      onRefresh();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'فشل تحديث حالة المرحلة');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;

    try {
      setLoading(true);
      await manufacturingApi.addSampleStage(sample.id, {
        name: newStageName.trim(),
        sequence: (sample.stages?.length || 0) + 1,
      });
      setNewStageName('');
      setIsAddingStage(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'فشل إضافة المرحلة');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (notes: string) => {
    try {
      setLoading(true);
      setActionError(null);
      await manufacturingApi.approveSampleOrder(sample.id, { resultNotes: notes.trim() || undefined });
      setIsApproveModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'فشل اعتماد العينة');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (reason: string) => {
    try {
      setLoading(true);
      setActionError(null);
      await manufacturingApi.rejectSampleOrder(sample.id, { resultNotes: reason.trim() });
      setIsRejectModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'فشل رفض العينة');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);

      await manufacturingApi.uploadSampleFile(sample.id, formData);
      onRefresh();
    } catch (err: any) {
      setActionError('فشل رفع الملف المرفق');
    } finally {
      setUploadingFile(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 w-full max-w-xl z-50 bg-card border-r border-border shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-foreground tabular-nums">{sample.sampleNumber}</h2>
            <SampleStatusBadge status={sample.status} />
            <MaterialSourceBadge source={sample.materialSource} />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Action Error Alert */}
        {actionError && (
          <div className="p-3 mx-4 mt-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Big Conversion / Approval Status Banner */}
        <div className="px-4 pt-3">
          {sample.status === 'CONVERTED' && (
            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-purple-800 dark:text-purple-200 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
                <div>
                  <p>تم تحويل العينة بنجاح لأمر تصنيع كامل</p>
                  <p className="text-[11px] font-normal text-purple-700/80 dark:text-purple-300/80">
                    رقم أمر الإنتاج: {sample.convertedOrder?.orderNumber || sample.convertedOrderId}
                  </p>
                </div>
              </div>
              {sample.convertedOrderId && (
                <button
                  onClick={() => navigate(`/manufacturing/orders/${sample.convertedOrderId}`)}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors shrink-0 flex items-center gap-1 shadow-sm text-xs"
                >
                  <span>اذهب للأمر</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {sample.status === 'APPROVED' && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p>العينة معتمدة وجاهزة للتحويل لأمر تصنيع كامل</p>
                  {sample.resultNotes && (
                    <p className="text-[11px] font-normal text-emerald-700/80 dark:text-emerald-300/80">
                      ملاحظات الاعتماد: {sample.resultNotes}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsConvertModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shrink-0 flex items-center gap-1 shadow-sm text-xs active:scale-95"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>تحويل لأمر تصنيع</span>
              </button>
            </div>
          )}

          {sample.status === 'REJECTED' && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-semibold mb-1">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>تم رفض هذه العينة</span>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                سبب الرفض: <span className="font-medium">{sample.resultNotes || 'غير محدد'}</span>
              </p>
            </div>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="px-4 pt-3 border-b border-border flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab('stages')}
            className={`pb-2.5 font-medium border-b-2 transition-all ${
              activeTab === 'stages'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            مراحل التشغيل ({sample.stages?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-2.5 font-medium border-b-2 transition-all ${
              activeTab === 'info'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            المواصفات والبيانات
          </button>
          <button
            onClick={() => setActiveTab('attachments')}
            className={`pb-2.5 font-medium border-b-2 transition-all ${
              activeTab === 'attachments'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            المرفقات والصور ({sample.attachments?.length || 0})
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: STAGES */}
          {activeTab === 'stages' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">مسار تشغيل مراحل العينة</span>
                <button
                  onClick={() => setIsAddingStage(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> إضافة مرحلة
                </button>
              </div>

              {isAddingStage && (
                <form onSubmit={handleAddStage} className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
                  <input
                    type="text"
                    required
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="اسم المرحلة الجديدة (مثال: تطريز اللوجو)"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingStage(false)}
                      className="px-2.5 py-1 text-xs rounded-md border hover:bg-muted"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground font-medium"
                    >
                      إضافة
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {sample.stages?.map((st) => (
                  <div
                    key={st.id}
                    className="p-3 rounded-xl border border-border/70 bg-card hover:border-border transition-all flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-bold text-[11px] tabular-nums shrink-0">
                        {st.sequence}
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">{st.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {st.status === 'COMPLETED'
                            ? 'مكتملة بنجاح'
                            : st.status === 'IN_PROGRESS'
                            ? 'قيد التنفيذ حالياً'
                            : 'في الانتظار'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {st.status === 'PENDING' && (
                        <button
                          onClick={() => handleStageStatusChange(st, 'IN_PROGRESS')}
                          disabled={loading}
                          className="px-2.5 py-1 rounded-lg border border-blue-500/30 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium hover:bg-blue-100 flex items-center gap-1 active:scale-95"
                        >
                          <Play className="w-3 h-3" />
                          <span>بدء</span>
                        </button>
                      )}
                      {st.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleStageStatusChange(st, 'COMPLETED')}
                          disabled={loading}
                          className="px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium hover:bg-emerald-100 flex items-center gap-1 active:scale-95"
                        >
                          <Check className="w-3 h-3" />
                          <span>إنهاء</span>
                        </button>
                      )}
                      {st.status === 'COMPLETED' && (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تم</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SPECIFICATIONS */}
          {activeTab === 'info' && (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">اسم المنتج:</span>
                  <span className="font-bold text-foreground">{sample.productName}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">العميل:</span>
                  <span className="font-medium">{sample.customerName || 'عميل غير مسجل'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">العلامة التجارية:</span>
                  <span className="font-medium">{sample.brandName || '-'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">الكمية:</span>
                  <span className="font-semibold tabular-nums">{sample.plannedQuantity} قطعة</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">المقاس / اللون:</span>
                  <span className="font-semibold">
                    {sample.size || '-'} / {sample.color || '-'}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">مصدر الخامة:</span>
                  <span className="font-medium">
                    {sample.materialSource === 'CUSTOMER' ? 'خامة من العميل (CMT)' : 'خامة من المصنع'}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">سعر / تكلفة العينة:</span>
                  <span className="font-bold text-foreground tabular-nums">
                    {sample.fee ? `${sample.fee} ج.م` : 'غير محدد'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">موعد التسليم المتوقع:</span>
                  <span className="font-medium">
                    {sample.dueDate ? new Date(sample.dueDate).toLocaleDateString('ar-EG') : '-'}
                  </span>
                </div>
              </div>

              {sample.designNotes && (
                <div className="p-3 rounded-xl border border-border/70 bg-muted/20">
                  <p className="font-semibold text-foreground mb-1">ملاحظات التصميم:</p>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{sample.designNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ATTACHMENTS */}
          {activeTab === 'attachments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">صور ومرفقات العينة</span>
                <label className="text-xs text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingFile ? 'جاري الرفع...' : 'رفع صورة/ملف'}</span>
                  <input type="file" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" />
                </label>
              </div>

              {(!sample.attachments || sample.attachments.length === 0) && (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  لا توجد مرفقات أو صور مرفوعة بعد
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {sample.attachments?.map((att) => (
                  <div key={att.id} className="p-2 rounded-xl border border-border bg-card group relative overflow-hidden">
                    {att.kind === 'IMAGE' ? (
                      <img src={att.url} alt={att.fileName} className="w-full h-32 object-cover rounded-lg mb-1.5" />
                    ) : (
                      <div className="w-full h-32 bg-muted/40 rounded-lg mb-1.5 flex flex-col items-center justify-center text-muted-foreground">
                        <FileText className="w-8 h-8 mb-1" />
                        <span className="text-[10px]">{att.kind}</span>
                      </div>
                    )}
                    <p className="text-[11px] font-medium text-foreground truncate">{att.fileName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        {sample.status !== 'CONVERTED' && (
          <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
            {sample.status !== 'APPROVED' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsApproveModalOpen(true)}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اعتماد العينة</span>
                </button>
                <button
                  onClick={() => setIsRejectModalOpen(true)}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <span>رفض</span>
                </button>
              </div>
            )}

            {sample.status === 'APPROVED' && (
              <button
                onClick={() => setIsConvertModalOpen(true)}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>تحويل العينة إلى أمر تصنيع وتشغيل كامل</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Convert Modal */}
      <ConvertToOrderModal
        isOpen={isConvertModalOpen}
        sample={sample}
        onClose={() => setIsConvertModalOpen(false)}
        onSuccess={(order) => {
          onRefresh();
          navigate(`/manufacturing/orders/${order.id}`);
        }}
      />

      {/* Separate Approve Modal */}
      <SampleApproveModal
        isOpen={isApproveModalOpen}
        loading={loading}
        onClose={() => setIsApproveModalOpen(false)}
        onConfirm={handleApprove}
      />

      {/* Separate Reject Modal */}
      <SampleRejectModal
        isOpen={isRejectModalOpen}
        loading={loading}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleReject}
      />
    </>
  );
};
