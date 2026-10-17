import React from "react";
import {
  RefreshCw,
  Printer,
  X,
  Undo2,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface TurboActionsBarProps {
  canManageShipments: boolean;
  canCancelTurboShipment: boolean;
  canUnlinkTurboShipment: boolean;
  canRecreateTurboShipment: boolean;
  turboLoading: boolean;
  turboTrackingNumber?: string;
  onUpdateShipment?: () => void;
  onSyncStatus?: () => void;
  onPrintWaybill: () => void;
  onCancelShipment: () => void;
  onUnlinkShipment: () => void;
  onRecreateShipment?: () => void;
}

export const TurboActionsBar: React.FC<TurboActionsBarProps> = ({
  canManageShipments,
  canCancelTurboShipment,
  canUnlinkTurboShipment,
  canRecreateTurboShipment,
  turboLoading,
  turboTrackingNumber,
  onUpdateShipment,
  onSyncStatus,
  onPrintWaybill,
  onCancelShipment,
  onUnlinkShipment,
  onRecreateShipment,
}) => {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {canManageShipments && onUpdateShipment && (
        <button
          type="button"
          onClick={onUpdateShipment}
          disabled={turboLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 text-xs font-semibold transition-all active:scale-[0.98] shadow-xs"
          title="تحديث بيانات الشحنة (الاسم والتليفون والعنوان) في سيستم تربو"
        >
          {turboLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          <span>تحديث الشحنة في Turbo</span>
        </button>
      )}

      {canManageShipments && onSyncStatus && (
        <button
          type="button"
          onClick={onSyncStatus}
          disabled={turboLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-xs font-semibold transition-all active:scale-[0.98] shadow-xs"
          title="سحب ومزامنة حالة الشحنة المباشرة من سيرفر تربو وتحديث الطلب بالنظام"
        >
          {turboLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          <span>سحب ومزامنة حالة Turbo</span>
        </button>
      )}

      {canManageShipments && (
        <button
          type="button"
          onClick={onPrintWaybill}
          disabled={turboLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 text-xs font-semibold transition-all active:scale-[0.98] shadow-xs"
        >
          <Printer size={13} />
          <span>طباعة بوليصة Turbo</span>
        </button>
      )}

      {canManageShipments && canCancelTurboShipment && (
        <button
          type="button"
          onClick={onCancelShipment}
          disabled={turboLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-destructive text-destructive-foreground rounded-xl hover:bg-destructive/90 disabled:opacity-50 text-xs font-semibold transition-all active:scale-[0.98] shadow-xs"
        >
          <X size={13} />
          <span>إلغاء الشحنة</span>
        </button>
      )}

      {canManageShipments && canUnlinkTurboShipment && (
        <button
          type="button"
          onClick={onUnlinkShipment}
          disabled={turboLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-50 text-xs font-semibold transition-all active:scale-[0.98] shadow-xs"
        >
          <Undo2 size={13} />
          <span>إلغاء ربط Turbo</span>
        </button>
      )}

      {canManageShipments && canRecreateTurboShipment && onRecreateShipment && (
        <button
          type="button"
          onClick={onRecreateShipment}
          disabled={turboLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:opacity-50 text-xs font-semibold transition-all active:scale-[0.98] shadow-xs"
        >
          <RefreshCw size={13} />
          <span>إرجاع على Turbo تاني</span>
        </button>
      )}

      {turboTrackingNumber && (
        <a
          href={`https://portal.turbo-eg.com/track/${turboTrackingNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-xs font-semibold transition-all shadow-xs"
        >
          <ExternalLink size={13} />
          <span>تتبع على Turbo</span>
        </a>
      )}
    </div>
  );
};
