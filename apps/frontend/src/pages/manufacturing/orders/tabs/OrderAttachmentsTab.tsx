import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Video,
  FileText,
  Trash2,
  ExternalLink,
  Plus,
  Filter,
  RotateCw,
  Layers,
  Eye,
} from 'lucide-react';
import {
  ProductionOrder,
  ManufacturingAttachment,
  manufacturingApi,
} from '../../manufacturingApi';
import { AttachmentUploadForm } from './AttachmentUploadForm';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';

interface OrderAttachmentsTabProps {
  order: ProductionOrder;
  onRefresh?: () => void;
}

export const OrderAttachmentsTab: React.FC<OrderAttachmentsTabProps> = ({ order }) => {
  const [attachments, setAttachments] = useState<ManufacturingAttachment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [stageFilter, setStageFilter] = useState<string>('');
  const [kindFilter, setKindFilter] = useState<string>('');

  // Upload Box State
  const [showUploadBox, setShowUploadBox] = useState<boolean>(false);

  // Preview Modal
  const [previewAttachment, setPreviewAttachment] = useState<ManufacturingAttachment | null>(null);

  // Deleting State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const data = await manufacturingApi.listOrderAttachments(order.id);
      setAttachments(data);
    } catch {
      // handled quietly
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [order.id]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المرفق؟')) return;
    try {
      setDeletingId(id);
      await manufacturingApi.deleteAttachment(id);
      await fetchAttachments();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'فشل حذف المرفق');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredAttachments = attachments.filter((att) => {
    if (stageFilter && att.stageId !== stageFilter) return false;
    if (kindFilter && att.kind !== kindFilter) return false;
    return true;
  });

  const stages = order.stages || [];

  return (
    <div className="space-y-4 text-xs" dir="rtl">
      {/* Top Controls & KPI Bar */}
      <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-foreground">
            مستندات وصور أمر الإنتاج والمراحل (Attachments & Gallery)
          </h3>
          <p className="text-[11px] text-muted-foreground">
            توثيق عينات الجودة، صور التشغيل الخارجي، كروت القياس، ومستندات الفحص
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadBox(!showUploadBox)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showUploadBox ? 'إغلاق نافذة الرفع' : 'إضافة مرفق جديد'}</span>
          </button>
        </div>
      </div>

      {/* Upload Box Form */}
      {showUploadBox && (
        <AttachmentUploadForm
          orderId={order.id}
          stages={stages}
          onClose={() => setShowUploadBox(false)}
          onSuccess={fetchAttachments}
        />
      )}

      {/* Filter Bar */}
      <div className="p-3 rounded-xl border border-border/70 bg-card flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>تصفية:</span>
          </div>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="py-1 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs"
          >
            <option value="">كافة المراحل</option>
            {stages.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>

          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="py-1 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs"
          >
            <option value="">كافة الأنواع</option>
            <option value="IMAGE">صور فقط</option>
            <option value="VIDEO">فيديوهات فقط</option>
            <option value="DOC">مستندات فقط</option>
          </select>
        </div>

        <div className="text-[11px] text-muted-foreground tabular-nums">
          إجمالي المرفقات: <span className="font-bold text-foreground">{filteredAttachments.length}</span>
        </div>
      </div>

      {/* Attachments Gallery */}
      {loading ? (
        <div className="p-10 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <RotateCw className="w-5 h-5 animate-spin text-primary" />
          <span>جارٍ تحميل المرفقات...</span>
        </div>
      ) : filteredAttachments.length === 0 ? (
        <div className="p-10 text-center rounded-xl border border-dashed border-border bg-card/40 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <ImageIcon className="w-8 h-8 opacity-40" />
          <p className="font-semibold text-xs text-foreground">لا توجد مرفقات مطابقة</p>
          <p className="text-[11px]">يمكنك رفع وتوثيق صور المراحل والعينات من خلال زر «إضافة مرفق جديد» بالأعلى.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {filteredAttachments.map((att) => {
            const isImage = att.kind === 'IMAGE';
            const isVideo = att.kind === 'VIDEO';

            return (
              <div
                key={att.id}
                className="group relative rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs hover:border-primary/40 hover:shadow-md transition-all flex flex-col"
              >
                {/* Media Preview Area */}
                <div className="relative aspect-square bg-muted/40 overflow-hidden flex items-center justify-center">
                  {isImage ? (
                    <img
                      src={att.url}
                      alt={att.caption || 'مرفق إنتاج'}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : isVideo ? (
                    <div className="p-4 rounded-full bg-primary/10 text-primary">
                      <Video className="w-8 h-8" />
                    </div>
                  ) : (
                    <div className="p-4 rounded-full bg-amber-500/10 text-amber-600">
                      <FileText className="w-8 h-8" />
                    </div>
                  )}

                  {/* Hover Overlay with Preview and External Link */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPreviewAttachment(att)}
                      title="معاينة"
                      className="p-1.5 rounded-full bg-background/90 text-foreground hover:bg-background shadow cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="فتح في نافذة جديدة"
                      className="p-1.5 rounded-full bg-background/90 text-foreground hover:bg-background shadow cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Footer Details */}
                <div className="p-2.5 space-y-1 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="font-semibold text-foreground truncate" title={att.caption || 'مرفق بدون وصف'}>
                      {att.caption || 'مرفق بدون وصف'}
                    </div>

                    {att.stage && (
                      <div className="text-[10px] text-primary flex items-center gap-1 mt-0.5">
                        <Layers className="w-2.5 h-2.5" />
                        <span className="truncate">{att.stage.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                    <span className="tabular-nums">
                      {new Date(att.createdAt).toLocaleDateString('ar-EG')}
                    </span>

                    <button
                      onClick={() => handleDelete(att.id)}
                      disabled={deletingId === att.id}
                      title="حذف المرفق"
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </div>
  );
};
