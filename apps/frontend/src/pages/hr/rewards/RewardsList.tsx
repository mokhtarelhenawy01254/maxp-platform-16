import React from "react";
import { useTranslation } from "react-i18next";
import { Award, Plus, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { ConfirmDialog } from "../../../components/hr/ConfirmDialog";
import {
  useRewardsListController,
  RewardsListStatsAndFilters,
  RewardsListTable,
} from "./list";

const RewardsList: React.FC = () => {
  const { t } = useTranslation();
  const {
    navigate,
    user,
    loading,
    error,
    records,
    statistics,
    pagination,
    setPagination,
    filters,
    setFilters,
    showFilters,
    setShowFilters,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    deleteTarget,
    setDeleteTarget,
    deleting,
    fetchRewards,
    handleStatusUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    resetFilters,
  } = useRewardsListController();

  if (loading && records.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="size-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            جاري تحميل المكافآت...
          </p>
        </div>
      </div>
    );
  }

  if (error && records.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="size-10 text-destructive mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">
            حدث خطأ
          </h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button size="sm" onClick={() => fetchRewards()}>
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/70">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <Award className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
              {t("rewards.pageTitle")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
              {t("rewards.pageDescription")}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/hr/rewards/create")}
          className="gap-1.5 text-xs font-semibold shadow-xs"
        >
          <Plus className="size-4" />
          {t("rewards.form.addReward")}
        </Button>
      </div>

      {/* Statistics & Filters */}
      <RewardsListStatsAndFilters
        statistics={statistics}
        filters={filters}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onResetFilters={resetFilters}
        onUpdateFilters={setFilters}
      />

      {/* Records Table */}
      <RewardsListTable
        records={records}
        userRole={user?.role}
        deleting={deleting}
        pagination={pagination}
        onPageChange={(nextPage) =>
          setPagination((prev) => ({ ...prev, page: nextPage }))
        }
        onNavigate={navigate}
        onDeleteClick={handleDeleteClick}
        onStatusUpdate={handleStatusUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!deleting) setDeleteConfirmOpen(open);
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="حذف المكافأة"
        description="هل تريد حذف هذه المكافأة؟"
        confirmText="تأكيد الحذف"
        type="danger"
        loading={deleting}
        itemName={deleteTarget?.rewardType?.nameAr || deleteTarget?.rewardName}
        itemDetails={
          deleteTarget
            ? `${deleteTarget.user.firstName} ${deleteTarget.user.lastName} - ${deleteTarget.appliedMonth}/${deleteTarget.appliedYear}`
            : undefined
        }
      />
    </div>
  );
};

export default RewardsList;
