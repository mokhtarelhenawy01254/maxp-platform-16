import React from 'react';
import { X } from 'lucide-react';
import { PartnerFactory } from '../../manufacturingApi';
import { DateInput } from '../../../../components/ui/DateInput';

export interface SampleFactoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  factories: PartnerFactory[];
  selectedFactoryId: string;
  setSelectedFactoryId: (val: string) => void;
  selectedExpectedDeliveryAt: string;
  setSelectedExpectedDeliveryAt: (val: string) => void;
  onSaveFactoryCommercial: (e: React.FormEvent) => void;
}

export const SampleFactoryModal: React.FC<SampleFactoryModalProps> = ({
  isOpen,
  onClose,
  loading,
  factories,
  selectedFactoryId,
  setSelectedFactoryId,
  selectedExpectedDeliveryAt,
  setSelectedExpectedDeliveryAt,
  onSaveFactoryCommercial,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-sm text-foreground">
            تعديل المصنع وموعد الاستلام
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSaveFactoryCommercial} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">المصنع المنفذ</label>
            <select
              value={selectedFactoryId}
              onChange={(e) => setSelectedFactoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">بدون مصنع</option>
              {factories.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.code ? `(${f.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">
              موعد استلام العينة من المصنع
            </label>
            <DateInput
              value={selectedExpectedDeliveryAt}
              onChange={(e) => setSelectedExpectedDeliveryAt(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-1 focus:ring-primary tabular-nums"
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg border hover:bg-muted"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
