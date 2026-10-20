import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, RefreshCw, X as XMarkIcon } from "lucide-react";
import DentalWorkTypeStagesModal from "./DentalWorkTypeStagesModal";
import type { DentalWorkType } from "./shared";

import type { WorkTypeForm } from "./work-types/types/workTypeTypes";
import { WorkTypesTable } from "./work-types/components/WorkTypesTable";
import { WorkTypeEditModal } from "./work-types/modals/WorkTypeEditModal";
import { useDentalWorkTypes } from "./work-types/hooks/useDentalWorkTypes";

export default function DentalWorkTypesTab() {
  const { t } = useTranslation();
  const {
    rows,
    loading,
    error,
    setError,
    searchInput,
    setSearchInput,
    removingId,
    load,
    toggleActive,
    remove,
  } = useDentalWorkTypes();

  const [modal, setModal] = useState<WorkTypeForm | null>(null);
  const [stagesModalWorkType, setStagesModalWorkType] =
    useState<DentalWorkType | null>(null);

  const openCreate = () => {
    setError(null);
    setModal({
      name: "",
      category: "OTHER",
      pricingMode: "PER_UNIT",
      price: 0,
      costPrice: 0,
      leadTimeDays: 3,
      urgentLeadTimeDays: 1,
      defaultMaterial: "زيركون (Zirconia Multilayer)",
      materialBrand: "Aidite (3D Pro Zir, Honor)",
      instructions: "",
      defaultWarrantyYears: 5,
      defaultCrownCount: 1,
      sortOrder: 0,
      isActive: true,
    });
  };

  const openEdit = (w: DentalWorkType) => {
    setError(null);
    setModal({
      id: w.id,
      name: w.name,
      category: w.category || "OTHER",
      pricingMode: w.pricingMode || "PER_UNIT",
      price: w.price ?? 0,
      costPrice: w.costPrice ?? 0,
      leadTimeDays: w.leadTimeDays ?? 0,
      urgentLeadTimeDays: w.urgentLeadTimeDays ?? 0,
      defaultMaterial: w.defaultMaterial || "",
      materialBrand: w.materialBrand || "",
      instructions: w.instructions || "",
      defaultWarrantyYears: w.defaultWarrantyYears ?? 0,
      defaultCrownCount: w.defaultCrownCount ?? 1,
      sortOrder: w.sortOrder ?? 0,
      isActive: w.isActive,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("dentalLab.workTypes.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            إدارة الخدمات، تسعير الخدمات والوحدات، الماركات المعتمدة، وهوامش الربح
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load()}
            className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            {t("dentalLab.common.refresh")}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t("dentalLab.workTypes.newWorkType")}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Work Types Table */}
      <WorkTypesTable
        rows={rows}
        loading={loading}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        removingId={removingId}
        onEdit={openEdit}
        onStagesModal={setStagesModalWorkType}
        onToggleActive={toggleActive}
        onRemove={(w) =>
          remove(
            w,
            t("dentalLab.common.confirmDelete"),
            t("dentalLab.workTypes.deleted")
          )
        }
      />

      {/* Create / Edit Modal */}
      {modal && (
        <WorkTypeEditModal
          modal={modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load(true);
          }}
        />
      )}

      {/* Production Stages Template Modal */}
      {stagesModalWorkType && (
        <DentalWorkTypeStagesModal
          workType={stagesModalWorkType}
          onClose={() => setStagesModalWorkType(null)}
          onSaved={async () => {
            await load(true);
          }}
        />
      )}
    </div>
  );
}
