import React from "react";
import {
  useEmployeesPromotionController,
  EmployeesPromotionHeader,
  EmployeesPromotionStatsGrid,
  EmployeesPromotionFilterBar,
  EmployeesPromotionEmptyState,
  EmployeesPromotionList,
} from "./employees-promotion/index";

const EmployeesPromotion: React.FC = () => {
  const {
    promotions,
    filteredPromotions,
    loading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    stats,
    handleUpdateStatus,
    handleDeletePromotion,
    goToNewPromotion,
    goToEditPromotion,
  } = useEmployeesPromotionController();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      <EmployeesPromotionHeader onNewPromotion={goToNewPromotion} />

      <EmployeesPromotionStatsGrid stats={stats} />

      <EmployeesPromotionFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />

      {filteredPromotions.length === 0 ? (
        <EmployeesPromotionEmptyState
          hasAnyPromotions={promotions.length > 0}
          onNewPromotion={goToNewPromotion}
        />
      ) : (
        <EmployeesPromotionList
          promotions={filteredPromotions}
          onUpdateStatus={handleUpdateStatus}
          onDeletePromotion={handleDeletePromotion}
          onEditPromotion={goToEditPromotion}
        />
      )}
    </div>
  );
};

export default EmployeesPromotion;
