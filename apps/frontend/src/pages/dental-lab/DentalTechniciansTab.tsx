import { useTranslation } from "react-i18next";
import { Plus, RefreshCw, Search, Users, Wallet, X as XMarkIcon } from "lucide-react";
import { MODAL_INPUT_CLS } from "./shared";
import { useDentalTechnicians } from "./technicians/hooks/useDentalTechnicians";
import { TechnicianKpiCards } from "./technicians/components/TechnicianKpiCards";
import { TechnicianTable } from "./technicians/components/TechnicianTable";
import { TechnicianEditModal } from "./technicians/modals/TechnicianEditModal";
import { TechnicianPayoutModal } from "./technicians/modals/TechnicianPayoutModal";
import { TechnicianLedgerModal } from "./technicians/modals/TechnicianLedgerModal";

export default function DentalTechniciansTab() {
  const { t } = useTranslation();
  const {
    rows,
    team,
    wageDefault,
    loading,
    error,
    setError,
    searchInput,
    setSearchInput,
    modal,
    setModal,
    payoutModalTech,
    setPayoutModalTech,
    ledgerModalTech,
    setLedgerModalTech,
    saving,
    removingId,
    totalWages,
    totalPaid,
    totalBalanceDue,
    load,
    openCreate,
    openEdit,
    save,
    remove,
    toggleActive,
  } = useDentalTechnicians();

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">فريق العمل والمحطات</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            إدارة تخصصات ومحطات فريق المعمل، أجور المراحل، وسندات صرف المستحقات والسلف
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load()}
            className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t("dentalLab.common.refresh")}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة عضو جديد للفريق
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <TechnicianKpiCards
        wageDefault={wageDefault}
        totalWages={totalWages}
        totalPaid={totalPaid}
        totalBalanceDue={totalBalanceDue}
      />

      {/* Technicians Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h3 className="font-semibold">أعضاء فريق العمل والتخصصات</h3>
            <Wallet className="w-4 h-4 text-gray-400" />
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
            <input
              className={`${inputCls} pr-9 w-64`}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="بحث بالاسم أو الهاتف..."
            />
          </div>
        </div>

        <TechnicianTable
          rows={rows}
          wageDefault={wageDefault}
          loading={loading}
          removingId={removingId}
          team={team}
          onOpenEdit={openEdit}
          onRemove={remove}
          onToggleActive={toggleActive}
          onOpenPayout={(tech) => setPayoutModalTech(tech)}
          onOpenLedger={(tech) => setLedgerModalTech(tech)}
        />
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <TechnicianEditModal
          modal={modal}
          setModal={setModal}
          rows={rows}
          saving={saving}
          error={error}
          onSave={save}
          onClose={() => setModal(null)}
        />
      )}

      {/* Payout Modal */}
      {payoutModalTech && (
        <TechnicianPayoutModal
          tech={payoutModalTech}
          onClose={() => setPayoutModalTech(null)}
          onSaved={async () => {
            setPayoutModalTech(null);
            await load(true);
          }}
        />
      )}

      {/* Ledger Modal */}
      {ledgerModalTech && (
        <TechnicianLedgerModal
          tech={ledgerModalTech}
          onClose={() => setLedgerModalTech(null)}
          onAddPayout={() => {
            const current = ledgerModalTech;
            setLedgerModalTech(null);
            setPayoutModalTech(current);
          }}
          onDataChanged={async () => {
            await load(true);
          }}
        />
      )}
    </div>
  );
}
