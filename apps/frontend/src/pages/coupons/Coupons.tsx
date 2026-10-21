import React from "react";
import { useCouponsController } from "./components/useCouponsController";
import { CouponsHeader } from "./components/CouponsHeader";
import { CouponsStatsStrip } from "./components/CouponsStatsStrip";
import { CouponsFilterBar } from "./components/CouponsFilterBar";
import { CouponsTable } from "./components/CouponsTable";
import { CouponCreateModal } from "./components/CouponCreateModal";
import { CouponEditModal } from "./components/CouponEditModal";
import { CouponDeleteModal } from "./components/CouponDeleteModal";
import { CouponDetailsModal } from "./components/CouponDetailsModal";
import { Coupon } from "./components/types";

export type { Coupon };

const Coupons: React.FC = () => {
  const ctrl = useCouponsController();

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 bg-slate-50/50 dark:bg-slate-950 min-h-screen space-y-4" dir="rtl">
      {/* Header */}
      <CouponsHeader
        loading={ctrl.loading}
        onRefresh={() => {
          ctrl.fetchCoupons();
          ctrl.fetchStats();
        }}
        onCreateOpen={() => ctrl.setShowCreateModal(true)}
      />

      {/* KPI Stats Strip */}
      <CouponsStatsStrip
        stats={ctrl.stats}
        statsLoading={ctrl.statsLoading}
        totalCount={ctrl.totalCount}
      />

      {/* Table Chassis with integrated control bar */}
      <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs overflow-hidden">
        <CouponsFilterBar
          searchQuery={ctrl.searchQuery}
          onSearchChange={ctrl.setSearchQuery}
          filters={ctrl.filters}
          onFiltersChange={(f) => {
            ctrl.setFilters(f);
            ctrl.setPage(1);
          }}
          onReset={ctrl.resetFilters}
        />

        <CouponsTable
          coupons={ctrl.filteredCoupons}
          loading={ctrl.loading}
          page={ctrl.page}
          totalPages={ctrl.totalPages}
          totalCount={ctrl.totalCount}
          onPageChange={ctrl.setPage}
          onCopyCode={ctrl.copyToClipboard}
          onToggleStatus={ctrl.handleToggleStatus}
          onView={(coupon) => {
            ctrl.setSelectedCoupon(coupon);
            ctrl.setShowCouponModal(true);
          }}
          onEdit={(coupon) => {
            ctrl.setEditingCoupon({ ...coupon });
            ctrl.setShowEditModal(true);
          }}
          onDelete={(coupon) => {
            ctrl.setDeletingCoupon(coupon);
            ctrl.setShowDeleteModal(true);
          }}
          getTypeText={ctrl.getTypeText}
          getTypeColor={ctrl.getTypeColor}
        />
      </div>

      {/* Modals */}
      <CouponCreateModal
        isOpen={ctrl.showCreateModal}
        onClose={() => ctrl.setShowCreateModal(false)}
        newCoupon={ctrl.newCoupon}
        onCouponChange={ctrl.setNewCoupon}
        onCreate={ctrl.createCoupon}
        actionLoading={ctrl.actionLoading}
      />

      <CouponEditModal
        isOpen={ctrl.showEditModal}
        onClose={() => ctrl.setShowEditModal(false)}
        editingCoupon={ctrl.editingCoupon}
        onCouponChange={ctrl.setEditingCoupon}
        onUpdate={ctrl.handleUpdateCoupon}
        actionLoading={ctrl.actionLoading}
      />

      <CouponDeleteModal
        isOpen={ctrl.showDeleteModal}
        onClose={() => ctrl.setShowDeleteModal(false)}
        coupon={ctrl.deletingCoupon}
        onDelete={ctrl.handleDeleteCoupon}
        actionLoading={ctrl.actionLoading}
      />

      <CouponDetailsModal
        isOpen={ctrl.showCouponModal}
        onClose={() => ctrl.setShowCouponModal(false)}
        coupon={ctrl.selectedCoupon}
        onEdit={(coupon) => {
          ctrl.setShowCouponModal(false);
          ctrl.setEditingCoupon({ ...coupon });
          ctrl.setShowEditModal(true);
        }}
        onCopyCode={ctrl.copyToClipboard}
        getTypeText={ctrl.getTypeText}
        getTypeColor={ctrl.getTypeColor}
      />
    </div>
  );
};

export default Coupons;
