import React from "react";
import { Loader2 } from "lucide-react";
import {
  useMyDeductionsController,
  MyDeductionsStatsAndFilters,
  MyDeductionsListAndModal,
} from "./deductions";

const MyDeductions: React.FC = () => {
  const {
    t,
    loading,
    stats,
    filteredDeductions,
    selectedDeduction,
    setSelectedDeduction,
    showDetailsModal,
    setShowDetailsModal,
    filterStatus,
    setFilterStatus,
    filterMonth,
    setFilterMonth,
    filterYear,
    setFilterYear,
  } = useMyDeductionsController();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[350px] w-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-8">
      <MyDeductionsStatsAndFilters
        t={t}
        stats={stats}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterMonth={filterMonth}
        setFilterMonth={setFilterMonth}
        filterYear={filterYear}
        setFilterYear={setFilterYear}
      />

      <MyDeductionsListAndModal
        t={t}
        filteredDeductions={filteredDeductions}
        selectedDeduction={selectedDeduction}
        showDetailsModal={showDetailsModal}
        onOpenDetails={(deduction) => {
          setSelectedDeduction(deduction);
          setShowDetailsModal(true);
        }}
        onCloseDetails={() => setShowDetailsModal(false)}
      />
    </div>
  );
};

export default MyDeductions;
