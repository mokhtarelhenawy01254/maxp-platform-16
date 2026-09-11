import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Package,
  Plus,
  AlertTriangle,
  Layers,
  Building2,
  CheckCircle2,
  Calendar,
  Sparkles,
  Loader2,
  X,
  History,
} from "lucide-react";
import {
  DentalMaterial,
  DentalSupplier,
  DentalMaterialsSummary,
  fetchDentalMaterials,
  createDentalMaterial,
  recordDentalMaterialStockIn,
  fetchDentalSuppliers,
  fetchDentalMaterialsSummary,
  fmtMoney,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
} from "./shared";

const CATEGORY_LABELS: Record<string, string> = {
  MILLING_DISC: "أقراص خراطة (CAD/CAM)",
  MILLING_BLOCK: "بلوكات خراطة",
  IMPLANT_PART: "أجزاء زرعات (Ti-Base)",
  CONSUMABLE: "مستهلكات وسوائل",
  TOOL_BUR: "بنط خراطة (Burs)",
};

export default function DentalMaterialsTab() {
  const { t } = useTranslation();
  const [materials, setMaterials] = useState<DentalMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<DentalSupplier[]>([]);
  const [summary, setSummary] = useState<DentalMaterialsSummary | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals state
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [selectedMaterialForStockIn, setSelectedMaterialForStockIn] = useState<DentalMaterial | null>(null);

  // New Material form state
  const [newMatName, setNewMatName] = useState("");
  const [newMatCategory, setNewMatCategory] = useState<string>("MILLING_DISC");
  const [newMatBrand, setNewMatBrand] = useState("");
  const [newMatSupplierId, setNewMatSupplierId] = useState("");
  const [newMatDefaultShade, setNewMatDefaultShade] = useState("");
  const [newMatStandardCapacity, setNewMatStandardCapacity] = useState("20");
  const [newMatCostPerItem, setNewMatCostPerItem] = useState("");
  const [newMatMinAlert, setNewMatMinAlert] = useState("2");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stock In form state
  const [stockLotNumber, setStockLotNumber] = useState("");
  const [stockShade, setStockShade] = useState("");
  const [stockThickness, setStockThickness] = useState("14");
  const [stockUnits, setStockUnits] = useState("20");
  const [stockTotalCost, setStockTotalCost] = useState("");
  const [stockSupplierId, setStockSupplierId] = useState("");
  const [stockExpiryDate, setStockExpiryDate] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const [mats, supps, sum] = await Promise.all([
        fetchDentalMaterials(),
        fetchDentalSuppliers().catch(() => []),
        fetchDentalMaterialsSummary().catch(() => null),
      ]);
      setMaterials(mats);
      setSuppliers(supps);
      setSummary(sum);
    } catch (err: any) {
      setActionError(err?.response?.data?.error || "حدث خطأ في تحميل الخامات");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredMaterials = useMemo(() => {
    if (selectedCategory === "ALL") return materials;
    return materials.filter((m) => m.category === selectedCategory);
  }, [materials, selectedCategory]);

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatName.trim()) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const supp = suppliers.find((s) => s.id === newMatSupplierId);
      await createDentalMaterial({
        name: newMatName.trim(),
        category: newMatCategory as any,
        brand: newMatBrand.trim() || undefined,
        supplierId: newMatSupplierId || undefined,
        supplierName: supp ? supp.name : undefined,
        defaultShade: newMatDefaultShade.trim() || undefined,
        standardCapacity: Number(newMatStandardCapacity) || 20,
        costPerItem: Number(newMatCostPerItem) || 0,
        minStockAlert: Number(newMatMinAlert) || 2,
      });
      setIsAddMaterialModalOpen(false);
      setNewMatName("");
      setNewMatBrand("");
      setNewMatDefaultShade("");
      setNewMatCostPerItem("");
      await loadData();
    } catch (err: any) {
      setActionError(err?.response?.data?.error || "فشل إنشاء الخامة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialForStockIn || !stockLotNumber.trim()) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const supp = suppliers.find((s) => s.id === stockSupplierId);
      await recordDentalMaterialStockIn({
        materialId: selectedMaterialForStockIn.id,
        lotNumber: stockLotNumber.trim(),
        shade: stockShade.trim() || undefined,
        thicknessMm: Number(stockThickness) || undefined,
        initialUnits: Number(stockUnits) || undefined,
        totalCost: Number(stockTotalCost) || undefined,
        supplierId: stockSupplierId || undefined,
        supplierName: supp ? supp.name : undefined,
        expiryDate: stockExpiryDate || undefined,
      });
      setIsStockInModalOpen(false);
      setSelectedMaterialForStockIn(null);
      setStockLotNumber("");
      setStockShade("");
      setStockTotalCost("");
      await loadData();
    } catch (err: any) {
      setActionError(err?.response?.data?.error || "فشل توريد رصيد الخامة");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
            <Package className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <span>خامات المعمل والموردين (Dental Materials & Supply)</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            إدارة خامات الزيركون والـ CAD/CAM والزرعات برقم التشغيلة الطبي (Lot#) وحساب استهلاك كل كراون.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddMaterialModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>خامة جديدة</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs">
            <span>أنواع الخامات النشطة</span>
            <Layers className="w-4 h-4 text-cyan-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-2">
            {summary?.totalMaterials ?? materials.length}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs">
            <span>أقراص وباتشات قيد العمل</span>
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
            {summary?.totalActiveStocks ?? 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs">
            <span>إجمالي الوحدات المتاحة للخرط</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {summary?.totalStockUnits ?? 0} <span className="text-xs font-normal">كراون</span>
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs">
            <span>تنبيهات قرب النفاد</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {summary?.lowStockCount ?? 0}
          </p>
        </div>
      </div>

      {/* Categories Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setSelectedCategory("ALL")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            selectedCategory === "ALL"
              ? "bg-cyan-600 text-white shadow-sm"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          الكل ({materials.length})
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
          const count = materials.filter((m) => m.category === key).length;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedCategory(key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === key
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Materials List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
          <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">لا توجد خامات مسجلة في هذا التصنيف</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
            أضف خامات الزيركون، الإيماكس، أو أجزاء الزرعات لربطها بالحالات وأوامر التشغيل.
          </p>
          <button
            type="button"
            onClick={() => setIsAddMaterialModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-700 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة خامة أولى</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMaterials.map((mat) => {
            const activeStocks = mat.stocks || [];
            const totalUnits = mat.totalAvailableUnits ?? 0;
            const isLow = mat.isLowStock;
            return (
              <div
                key={mat.id}
                className="bg-white dark:bg-gray-800 border border-gray-200/90 dark:border-gray-700/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {CATEGORY_LABELS[mat.category] || mat.category}
                      </span>
                      <h4 className="text-base font-black text-gray-900 dark:text-white mt-1 truncate">
                        {mat.name}
                      </h4>
                      {mat.brand && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ماركة: {mat.brand}
                        </span>
                      )}
                    </div>
                    {isLow && (
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300/40 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        رصيد منخفض
                      </span>
                    )}
                  </div>

                  {/* Stock Gauge */}
                  <div className="my-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-gray-600 dark:text-gray-300">الرصيد المتاح:</span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                        {totalUnits} وحدة ({activeStocks.length} قرص/لوت)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isLow ? "bg-amber-500" : "bg-cyan-600"
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(8, (totalUnits / ((mat.standardCapacity || 20) * 3)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Active Lots Details */}
                  {activeStocks.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                        التشغيلات النشطة (Active Lots):
                      </span>
                      <div className="max-h-28 overflow-y-auto space-y-1 text-xs">
                        {activeStocks.map((stk) => (
                          <div
                            key={stk.id}
                            className="flex items-center justify-between p-1.5 bg-gray-100/70 dark:bg-gray-700/50 rounded-lg text-[11px]"
                          >
                            <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                              Lot# {stk.lotNumber}
                              {stk.shade ? ` (${stk.shade})` : ""}
                            </span>
                            <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                              {stk.remainingUnits}/{stk.initialUnits} وحدة
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-gray-500">
                    <span>تكلفة الكراون: </span>
                    <strong className="text-gray-900 dark:text-white font-mono">
                      {fmtMoney(mat.costPerUnit)} ج.م
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMaterialForStockIn(mat);
                      setStockShade(mat.defaultShade || "");
                      setStockUnits(String(mat.standardCapacity || 20));
                      setStockTotalCost(mat.costPerItem ? String(mat.costPerItem) : "");
                      setStockSupplierId(mat.supplierId || "");
                      setIsStockInModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 text-xs font-bold hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>توريد قرص جديد</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Add New Material */}
      {isAddMaterialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className={MODAL_CONTENT_CLS}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">إضافة خامة معمل جديدة</h3>
              <button
                type="button"
                onClick={() => setIsAddMaterialModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">اسم الخامة *</label>
                <input
                  type="text"
                  required
                  value={newMatName}
                  onChange={(e) => setNewMatName(e.target.value)}
                  placeholder="مثال: Katana Zirconia HTML أو e.max CAD"
                  className={MODAL_INPUT_CLS}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">التصنيف</label>
                  <select
                    value={newMatCategory}
                    onChange={(e) => setNewMatCategory(e.target.value)}
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
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">الماركة المصنعة</label>
                  <input
                    type="text"
                    value={newMatBrand}
                    onChange={(e) => setNewMatBrand(e.target.value)}
                    placeholder="Noritake, Ivoclar..."
                    className={MODAL_INPUT_CLS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">سعة القرص بالوحدات</label>
                  <input
                    type="number"
                    min="1"
                    value={newMatStandardCapacity}
                    onChange={(e) => setNewMatStandardCapacity(e.target.value)}
                    placeholder="20"
                    className={MODAL_INPUT_CLS}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">اللون الافتراضي</label>
                  <input
                    type="text"
                    value={newMatDefaultShade}
                    onChange={(e) => setNewMatDefaultShade(e.target.value)}
                    placeholder="A2, Bleach..."
                    className={MODAL_INPUT_CLS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">تكلفة شراء القرص الكامل (ج.م)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newMatCostPerItem}
                    onChange={(e) => setNewMatCostPerItem(e.target.value)}
                    placeholder="مثال: 3200"
                    className={MODAL_INPUT_CLS}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">تنبيه قرب النفاد (أقل من)</label>
                  <input
                    type="number"
                    value={newMatMinAlert}
                    onChange={(e) => setNewMatMinAlert(e.target.value)}
                    className={MODAL_INPUT_CLS}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">شركة التوريد المعتمدة (المورد)</label>
                <select
                  value={newMatSupplierId}
                  onChange={(e) => setNewMatSupplierId(e.target.value)}
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
                  onClick={() => setIsAddMaterialModalOpen(false)}
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
      )}

      {/* Modal 2: Stock In (توريد قرص / باتش جديد) */}
      {isStockInModalOpen && selectedMaterialForStockIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className={MODAL_CONTENT_CLS}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">توريد قرص / باتش جديد</h3>
                <p className="text-xs text-cyan-600 font-semibold mt-0.5">
                  الخامة: {selectedMaterialForStockIn.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsStockInModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockIn} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  رقم التشغيلة (Lot Number) * <span className="text-[11px] text-gray-400 font-normal">(مطلوب لشهادة الضمان)</span>
                </label>
                <input
                  type="text"
                  required
                  value={stockLotNumber}
                  onChange={(e) => setStockLotNumber(e.target.value)}
                  placeholder="e.g. LOT-2026-X198"
                  className={MODAL_INPUT_CLS}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">درجة اللون (Shade)</label>
                  <input
                    type="text"
                    value={stockShade}
                    onChange={(e) => setStockShade(e.target.value)}
                    placeholder="A1, A2, A3, Bleach..."
                    className={MODAL_INPUT_CLS}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">السماكة (mm)</label>
                  <select
                    value={stockThickness}
                    onChange={(e) => setStockThickness(e.target.value)}
                    className={MODAL_INPUT_CLS}
                  >
                    <option value="10">10 mm</option>
                    <option value="12">12 mm</option>
                    <option value="14">14 mm</option>
                    <option value="16">16 mm</option>
                    <option value="18">18 mm</option>
                    <option value="20">20 mm</option>
                    <option value="25">25 mm</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">عدد الوحدات القابلة للخرط</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stockUnits}
                    onChange={(e) => setStockUnits(e.target.value)}
                    className={MODAL_INPUT_CLS}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">إجمالي تكلفة الشراء (ج.م)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={stockTotalCost}
                    onChange={(e) => setStockTotalCost(e.target.value)}
                    placeholder="مثال: 3400"
                    className={MODAL_INPUT_CLS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">شركة التوريد (المورد)</label>
                  <select
                    value={stockSupplierId}
                    onChange={(e) => setStockSupplierId(e.target.value)}
                    className={MODAL_INPUT_CLS}
                  >
                    <option value="">-- اختر المورد --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">تاريخ انتهاء الصلاحية</label>
                  <input
                    type="date"
                    value={stockExpiryDate}
                    onChange={(e) => setStockExpiryDate(e.target.value)}
                    className={MODAL_INPUT_CLS}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700 mt-4">
                <button
                  type="button"
                  onClick={() => setIsStockInModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "جاري التوريد..." : "تسجيل وارد المخزن"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
