import { CheckCircle2, CircleOff, Trash2, X } from 'lucide-react';
import { Button } from "../../../components/ui/button";

export function BulkActionsBar({
  selectedCount, onActivate, onDeactivate, onDelete, onClear,
}: {
  selectedCount: number;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">تم تحديد {selectedCount} شركة</p>
          <p className="text-xs text-muted-foreground">.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <Button type="button" variant="outline" className="rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800/70 dark:hover:bg-emerald-950/30" onClick={onActivate}>
            <CheckCircle2 className="size-4" /> تفعيل
          </Button>
          <Button type="button" variant="outline" className="rounded-lg border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800/70 dark:hover:bg-amber-950/30" onClick={onDeactivate}>
            <CircleOff className="size-4" /> تعطيل
          </Button>
          <Button type="button" variant="destructive" className="rounded-lg" onClick={onDelete}>
            <Trash2 className="size-4" /> حذف
          </Button>
          <Button type="button" variant="ghost" className="rounded-lg" onClick={onClear}>
            <X className="size-4" /> مسح التحديد
          </Button>
        </div>
      </div>
    </div>
  );
}
