import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, RefreshCw, X as XMarkIcon } from "lucide-react";
import type { DentalLabDoctor } from "./shared";

import type { DoctorForm } from "./doctors/types/doctorsTypes";
import { DoctorsSummaryCards } from "./doctors/components/DoctorsSummaryCards";
import { DoctorsViewSwitch } from "./doctors/components/DoctorsViewSwitch";
import { DoctorsTable } from "./doctors/components/DoctorsTable";
import { DoctorEditModal } from "./doctors/modals/DoctorEditModal";
import { BulkPaymentModal } from "./doctors/modals/BulkPaymentModal";
import { PricingModal } from "./doctors/modals/PricingModal";
import { useDentalDoctors } from "./doctors/hooks/useDentalDoctors";

export default function DentalDoctorsTab() {
  const { t } = useTranslation();
  const {
    rows,
    loading,
    error,
    setError,
    searchInput,
    setSearchInput,
    viewMode,
    setViewMode,
    activeCount,
    archivedCount,
    summary,
    removingId,
    load,
    toggleActive,
    remove,
    handleRestore,
    handlePermanentDelete,
  } = useDentalDoctors();

  const [modal, setModal] = useState<DoctorForm | null>(null);
  const [pricingDoctor, setPricingDoctor] = useState<DentalLabDoctor | null>(null);
  const [bulkDoctor, setBulkDoctor] = useState<DentalLabDoctor | null>(null);

  const openCreate = () => {
    setError(null);
    setModal({
      name: "",
      phone: "",
      clinicName: "",
      governorate: "",
      portalPin: "",
      creditLimit: 0,
      notes: "",
      doctors: [],
      isActive: true,
    });
  };

  const openEdit = (d: DentalLabDoctor) => {
    setError(null);
    setModal({
      id: d.id,
      name: d.name,
      phone: d.phone || "",
      clinicName: d.clinicName || "",
      governorate: d.governorate || "",
      portalPin: d.portalPin || "",
      creditLimit: d.creditLimit ?? 0,
      notes: d.notes || "",
      doctors: Array.isArray(d.doctors)
        ? JSON.parse(JSON.stringify(d.doctors))
        : [],
      isActive: d.isActive,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("dentalLab.doctors.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("dentalLab.subtitle")}
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            {t("dentalLab.doctors.newDoctor")}
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

      {/* View Switcher Pills */}
      <DoctorsViewSwitch
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        activeCount={activeCount}
        archivedCount={archivedCount}
      />

      {/* Summary KPI Cards */}
      <DoctorsSummaryCards summary={summary} rows={rows} />

      {/* Main Doctors Table */}
      <DoctorsTable
        rows={rows}
        loading={loading}
        viewMode={viewMode}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        removingId={removingId}
        onEdit={openEdit}
        onBulkPayment={setBulkDoctor}
        onPricing={setPricingDoctor}
        onToggleActive={toggleActive}
        onRemove={(d) =>
          remove(
            d,
            t("dentalLab.common.confirmDelete"),
            t("dentalLab.doctors.deleted")
          )
        }
        onRestore={handleRestore}
        onPermanentDelete={handlePermanentDelete}
      />

      {/* Bulk Payment Modal */}
      {bulkDoctor && (
        <BulkPaymentModal
          doctor={bulkDoctor}
          onClose={() => setBulkDoctor(null)}
          onSaved={() => {
            setBulkDoctor(null);
            load(true);
          }}
        />
      )}

      {/* Custom Pricing Modal */}
      {pricingDoctor && (
        <PricingModal
          doctor={pricingDoctor}
          onClose={() => setPricingDoctor(null)}
          onSaved={() => {
            setPricingDoctor(null);
            load(true);
          }}
        />
      )}

      {/* Create / Edit Doctor Modal */}
      {modal && (
        <DoctorEditModal
          modal={modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load(true);
          }}
        />
      )}
    </div>
  );
}
