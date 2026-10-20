import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "../../shared";
import { CATEGORY_LABELS, type AddMaterialModalProps } from "../types/materialsTypes";

export function AddMaterialModal({
  isOpen,
  onClose,
  onSubmit,
  suppliers,
  onOpenAddSupplier,
  isSubmitting,
}: AddMaterialModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("MILLING_DISC");
  const [brand, setBrand] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [defaultShade, setDefaultShade] = useState("");
  const [standardCapacity, setStandardCapacity] = useState("20");
  const [costPerItem, setCostPerItem] = useState("");
  const [minAlert, setMinAlert] = useState("2");

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const supp = suppliers.find((s) => s.id === supplierId);
    await onSubmit({
      name: name.trim(),
      category,
      brand: brand.trim() || undefined,
      supplierId: supplierId || undefined,
      supplierName: supp ? supp.name : undefined,
      defaultShade: defaultShade.trim() || undefined,
      standardCapacity: Number(standardCapacity) || 20,
      costPerItem: Number(costPerItem) || 0,
      minStockAlert: Number(minAlert) || 2,
    });
    setName("");
    setBrand("");
    setDefaultShade("");
    setCostPerItem("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className={MODAL_CONTENT_CLS}>
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            إضافة خامة معمل جديدة
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
              اسم الخامة *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: Katana Zirconia HTML أو e.max CAD"
              className={MODAL_INPUT_CLS}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                التصنيف
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={MODAL_INPUT_CLS}
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                الماركة المصنعة
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Noritake, Ivoclar..."
                className={MODAL_INPUT_CLS}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                سعة القرص بالوحدات
              </label>
              <input
                type="number"
                min="1"
                value={standardCapacity}
                onChange={(e) => setStandardCapacity(e.target.value)}
                placeholder="20"
                className={`${MODAL_INPUT_CLS} font-mono tabular-nums`}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                اللون الافتراضي
              </label>
              <input
                type="text"
                value={defaultShade}
                onChange={(e) => setDefaultShade(e.target.value)}
                placeholder="A2, Bleach..."
                className={MODAL_INPUT_CLS}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                تكلفة شراء القرص الكامل (ج.م)
              </label>
              <input
                type="number"
                step="0.1"
                value={costPerItem}
                onChange={(e) => setCostPerItem(e.target.value)}
                placeholder="مثال: 3200"
                className={`${MODAL_INPUT_CLS} font-mono tabular-nums`}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                تنبيه قرب النفاد (أقل من)
              </label>
              <input
                type="number"
                value={minAlert}
                onChange={(e) => setMinAlert(e.target.value)}
                className={`${MODAL_INPUT_CLS} font-mono tabular-nums`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-gray-700 dark:text-gray-300">
                شركة التوريد المعتمدة (المورد)
              </label>
              <button
                type="button"
                onClick={onOpenAddSupplier}
                className="text-xs text-cyan-600 dark:text-cyan-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>مورد جديد</span>
              </button>
            </div>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className={MODAL_INPUT_CLS}
            >
              <option value="">-- اختياري (مورد من نظام الموردين) --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.phone ? `(${s.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "جاري الحفظ..." : "حفظ الخامة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddMaterialModal;
