import { useState, useMemo } from 'react';
import { X, Check, Coffee, Plus } from 'lucide-react';

export interface ModifierOptionItem {
  id: string;
  name: string;
  additionalPrice: number;
  rawProductId?: string;
  rawQuantity?: number;
}

export interface ModifierGroupItem {
  id: string;
  name: string;
  selectionType: string; // 'SINGLE' or 'MULTIPLE'
  isRequired: boolean;
  options: ModifierOptionItem[];
}

interface ItemModifierModalProps {
  product: {
    id: string;
    name: string;
    price: number;
    images?: string[];
  } | null;
  modifierGroups: ModifierGroupItem[];
  onClose: () => void;
  onConfirm: (
    product: any,
    selectedModifiers: ModifierOptionItem[],
    notes: string,
    finalUnitPrice: number
  ) => void;
}

export default function ItemModifierModal({
  product,
  modifierGroups,
  onClose,
  onConfirm
}: ItemModifierModalProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, ModifierOptionItem[]>>({});
  const [notes, setNotes] = useState('');

  if (!product) return null;

  const toggleOption = (group: ModifierGroupItem, option: ModifierOptionItem) => {
    setSelectedOptions((prev) => {
      const current = prev[group.id] || [];
      if (group.selectionType === 'SINGLE') {
        return { ...prev, [group.id]: [option] };
      }
      const exists = current.some((o) => o.id === option.id);
      if (exists) {
        return { ...prev, [group.id]: current.filter((o) => o.id !== option.id) };
      }
      return { ...prev, [group.id]: [...current, option] };
    });
  };

  const allSelectedModifiers = useMemo(() => {
    return Object.values(selectedOptions).flat();
  }, [selectedOptions]);

  const extraPrice = useMemo(() => {
    return allSelectedModifiers.reduce((sum, o) => sum + Number(o.additionalPrice || 0), 0);
  }, [allSelectedModifiers]);

  const finalUnitPrice = Number(product.price) + extraPrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(product, allSelectedModifiers, notes, finalUnitPrice);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b dark:border-gray-700 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">{product.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">تخصيص المشروب والإضافات</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Groups scrollable area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {modifierGroups.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-400">
              لا توجد مجموعات تعديل مخصصة. يمكنك إضافة المشروب مباشرة أو كتابة ملاحظة للبارستا.
            </div>
          ) : (
            modifierGroups.map((group) => {
              const currentGroupSelection = selectedOptions[group.id] || [];
              return (
                <div key={group.id} className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {group.name}
                      {group.isRequired && <span className="text-red-500 mr-1">*</span>}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {group.selectionType === 'SINGLE' ? 'اختيار واحد' : 'اختيارات متعددة'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {group.options.map((opt) => {
                      const isSelected = currentGroupSelection.some((o) => o.id === opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleOption(group, opt)}
                          className={
                            "p-2.5 rounded-xl border text-right transition-all flex items-center justify-between " +
                            (isSelected
                              ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300 font-semibold shadow-xs"
                              : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50")
                          }
                        >
                          <span className="text-xs">{opt.name}</span>
                          <span className="text-[11px] tabular-nums font-medium text-gray-500 dark:text-gray-400">
                            {Number(opt.additionalPrice) > 0 ? `+${opt.additionalPrice} ج` : "مجاناً"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

          {/* Barista Notes */}
          <div className="space-y-1 pt-2 border-t dark:border-gray-700">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              ملاحظة للبارستا (بدون سكر، سخن زيادة، ثلج خفيف...)
            </label>
            <input
              type="text"
              placeholder="اكتب أي تعليمات خاصة للتحضير"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t dark:border-gray-700 flex items-center justify-between gap-3">
          <div className="text-right">
            <span className="text-[11px] text-gray-400 block">إجمالي سعر الكوب</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">
              {finalUnitPrice.toLocaleString()} ج.م
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              إضافة للطلب
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
