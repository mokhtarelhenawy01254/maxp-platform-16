import {
  AlertTriangle,
  Building2,
  Loader2,
  Package,
  Plus,
} from "lucide-react";
import { useDentalMaterials } from "./materials/hooks/useDentalMaterials";
import { MaterialsKpiCards } from "./materials/components/MaterialsKpiCards";
import { MaterialsCategoryTabs } from "./materials/components/MaterialsCategoryTabs";
import { MaterialCard } from "./materials/components/MaterialCard";
import { AddMaterialModal } from "./materials/modals/AddMaterialModal";
import { StockInModal } from "./materials/modals/StockInModal";
import { AddSupplierModal } from "./materials/modals/AddSupplierModal";
import { ViewSuppliersModal } from "./materials/modals/ViewSuppliersModal";

export default function DentalMaterialsTab() {
  const {
    materials,
    suppliers,
    summary,
    selectedCategory,
    setSelectedCategory,
    isLoading,
    actionError,
    filteredMaterials,
    isAddMaterialModalOpen,
    setIsAddMaterialModalOpen,
    isStockInModalOpen,
    setIsStockInModalOpen,
    isAddSupplierModalOpen,
    setIsAddSupplierModalOpen,
    isViewSuppliersModalOpen,
    setIsViewSuppliersModalOpen,
    selectedMaterialForStockIn,
    isSubmitting,
    isSubmittingSupplier,
    handleCreateSupplier,
    handleCreateMaterial,
    handleStockIn,
    openStockInFor,
  } = useDentalMaterials();

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
            إدارة خامات الزيركون والـ CAD/CAM والزرعات برقم التشغيلة الطبي (Lot#) وحساب استهلاك كل وحدة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsViewSuppliersModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold transition-all border border-gray-200 dark:border-gray-700 shadow-xs active:scale-95 cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>الموردين والشركات ({suppliers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddSupplierModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-cyan-600/30 dark:border-cyan-500/30 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>مورد جديد</span>
          </button>

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
      <MaterialsKpiCards summary={summary} materialsCount={materials.length} />

      {/* Categories Filter Tabs */}
      <MaterialsCategoryTabs
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        materials={materials}
      />

      {/* Materials List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
          <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            لا توجد خامات مسجلة في هذا التصنيف
          </h3>
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
          {filteredMaterials.map((mat) => (
            <MaterialCard
              key={mat.id}
              material={mat}
              onStockIn={openStockInFor}
            />
          ))}
        </div>
      )}

      {/* Modal 1: Add New Material */}
      <AddMaterialModal
        isOpen={isAddMaterialModalOpen}
        onClose={() => setIsAddMaterialModalOpen(false)}
        onSubmit={handleCreateMaterial}
        suppliers={suppliers}
        onOpenAddSupplier={() => setIsAddSupplierModalOpen(true)}
        isSubmitting={isSubmitting}
      />

      {/* Modal 2: Stock In */}
      <StockInModal
        isOpen={isStockInModalOpen}
        material={selectedMaterialForStockIn}
        onClose={() => setIsStockInModalOpen(false)}
        onSubmit={handleStockIn}
        suppliers={suppliers}
        onOpenAddSupplier={() => setIsAddSupplierModalOpen(true)}
        isSubmitting={isSubmitting}
      />

      {/* Modal 3: Add Supplier */}
      <AddSupplierModal
        isOpen={isAddSupplierModalOpen}
        onClose={() => setIsAddSupplierModalOpen(false)}
        onSubmit={handleCreateSupplier}
        isSubmitting={isSubmittingSupplier}
      />

      {/* Modal 4: View Suppliers */}
      <ViewSuppliersModal
        isOpen={isViewSuppliersModalOpen}
        onClose={() => setIsViewSuppliersModalOpen(false)}
        suppliers={suppliers}
        onOpenAddSupplier={() => setIsAddSupplierModalOpen(true)}
      />
    </div>
  );
}
