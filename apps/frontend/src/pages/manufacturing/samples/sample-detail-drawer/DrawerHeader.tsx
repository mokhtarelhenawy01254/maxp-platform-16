import React from 'react';
import { X, Share2, Pencil, Trash2 } from 'lucide-react';
import { SampleOrder } from '../../manufacturingApi';
import { SampleStatusBadge, MaterialSourceBadge } from '../SampleStatusBadge';

export interface DrawerHeaderProps {
  sample: SampleOrder;
  onShare: () => void;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const DrawerHeader: React.FC<DrawerHeaderProps> = ({
  sample,
  onShare,
  onClose,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between bg-muted/20">
      <div className="flex items-center gap-2.5">
        <h2 className="text-base font-bold text-foreground tabular-nums">
          {sample.sampleNumber}
        </h2>
        <SampleStatusBadge status={sample.status} />
        <MaterialSourceBadge source={sample.materialSource} />
      </div>
      <div className="flex items-center gap-1.5">
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60 transition-colors"
            title="تعديل أمر العينة"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>تعديل</span>
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 transition-colors"
            title="حذف أمر العينة"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>حذف</span>
          </button>
        )}
        <button
          onClick={onShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          title="مشاركة العينة"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>مشاركة</span>
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
