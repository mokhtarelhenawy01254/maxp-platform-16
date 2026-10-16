import React from 'react';
import { Play, Ban } from 'lucide-react';

interface OrderLifecycleModalsProps {
  startDialogOpen: boolean;
  onCloseStartDialog: () => void;
  autoIssue: boolean;
  onChangeAutoIssue: (val: boolean) => void;
  onConfirmStart: () => void;
  cancelDialogOpen: boolean;
  onCloseCancelDialog: () => void;
  cancelReason: string;
  onChangeCancelReason: (val: string) => void;
  onConfirmCancel: () => void;
  actionLoading: boolean;
}

export const OrderLifecycleModals: React.FC<OrderLifecycleModalsProps> = ({
  startDialogOpen,
  onCloseStartDialog,
  autoIssue,
  onChangeAutoIssue,
  onConfirmStart,
  cancelDialogOpen,
  onCloseCancelDialog,
  cancelReason,
  onChangeCancelReason,
  onConfirmCancel,
  actionLoading,
}) => {
  return (
    <>
      {/* Start Order Dialog */}
      {startDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
          dir="rtl"
        >
          <div className="w-full max-w-md rounded-xl bg-card border border-border/70 shadow-2xl overflow-hidden text-foreground">
            <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold">بدء تشغيل أمر الإنتاج</h3>
              </div>
              <button
                onClick={onCloseStartDialog}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4 text-xs">
              <p className="text-muted-foreground">
                سيتم تحويل حالة الأمر إلى «قيد التشغيل IN_PROGRESS» وفتح خطوط الإنتاج والمراحل.
              </p>
              <label className="flex items-center gap-2 p-3 rounded-lg bg-muted/20 border border-border/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoIssue}
                  onChange={(e) => onChangeAutoIssue(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                />
                <span className="font-semibold text-foreground">
                  صرف الخامات تلقائيًا من المستودع عند بدء التشغيل
                </span>
              </label>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={onCloseStartDialog}
                  className="px-3.5 py-1.5 rounded-lg border border-border text-muted-foreground"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={onConfirmStart}
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700"
                >
                  {actionLoading ? 'جارٍ البدء...' : 'تأكيد وبدء التشغيل'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Dialog */}
      {cancelDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
          dir="rtl"
        >
          <div className="w-full max-w-md rounded-xl bg-card border border-border/70 shadow-2xl overflow-hidden text-foreground">
            <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-rose-600">إلغاء أمر الإنتاج</h3>
              </div>
              <button
                onClick={onCloseCancelDialog}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3.5 text-xs">
              <p className="text-muted-foreground">
                يرجى توضيح سبب إلغاء أمر الإنتاج. سيتم تسجيل سبب الإلغاء في السجل الرسمي للأمر:
              </p>
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => onChangeCancelReason(e.target.value)}
                placeholder="سبب الإلغاء (مثال: إلغاء العميل للموديل، عدم توفر القماش...)"
                className="w-full p-2.5 rounded-lg border border-border bg-background text-xs focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={onCloseCancelDialog}
                  className="px-3.5 py-1.5 rounded-lg border border-border text-muted-foreground"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={onConfirmCancel}
                  disabled={actionLoading || !cancelReason.trim()}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-50"
                >
                  {actionLoading ? 'جارٍ الإلغاء...' : 'تأكيد إلغاء الأمر'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
