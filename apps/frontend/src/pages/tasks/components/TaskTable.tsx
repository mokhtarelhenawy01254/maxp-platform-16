import React from "react";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import type { Task, TaskSortBy } from "../types";
import { DeliveryGateModal } from "./DeliveryGateModal";
import { ApprovalGateModal } from "./ApprovalGateModal";
import {
  type TaskTableProps,
  useTaskGateModals,
  TaskTableHeader,
  TaskTablePagination,
  TaskTableMobileCard,
  TaskTableRow,
  TaskSortIndicator,
  SkeletonRow,
  MobileSkeletonCard,
} from "./task-table";

export type { TaskTableProps };

export const TaskTable: React.FC<TaskTableProps> = ({
  canApprove = true,
  approverUserId,
  userRole = "",
  onReloadTasks,
  paginatedTasks = [],
  filteredAndSortedTasks = [],
  searchQuery = "",
  selectedTasks = [],
  loading = false,
  sortBy = "createdAt",
  sortOrder = "desc",
  handleSelectTask,
  handleSelectAll,
  isOverdue,
  getStatusColor,
  getStatusText,
  getStatusIcon,
  getPriorityColor,
  getPriorityText,
  formatDate,
  updateTaskStatus,
  deleteTask,
  duplicateTask,
  setSelectedTask,
  setShowTaskModal,
  setEditingTask,
  setShowEditTaskModal,
  currentPage,
  setCurrentPage,
  totalPages,
  serverTotalTasks = 0,
}) => {
  const {
    deliveryGateTask,
    setDeliveryGateTask,
    approvalGateTask,
    setApprovalGateTask,
    isSubmittingGate,
    handleDeliverySubmit,
    handleApprove,
    handleDirectApprove,
    handleReturn,
  } = useTaskGateModals({ onReloadTasks, updateTaskStatus });

  const totalCount =
    serverTotalTasks > 0 ? serverTotalTasks : filteredAndSortedTasks.length;
  const isEmpty = !loading && paginatedTasks.length === 0;

  const openTask = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const editTask = (task: Task) => {
    setEditingTask(task);
    setShowEditTaskModal(true);
  };

  return (
    <div
      id="tasks-queue"
      data-testid="tasks-queue"
      className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)] mb-8 sm:mb-6"
    >
      <TaskTableHeader
        loading={loading}
        searchQuery={searchQuery}
        totalCount={totalCount}
        paginatedCount={paginatedTasks.length}
        selectedCount={selectedTasks.length}
        filteredCount={filteredAndSortedTasks.length}
      />

      {/* Mobile Card List */}
      <div className="space-y-2 p-2.5 md:hidden">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <MobileSkeletonCard key={`skel-${i}`} />)
          : null}

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-border bg-background/60 px-4 py-12 text-center">
            <ClipboardDocumentListIcon className="size-12 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                لا توجد مهام مطابقة
              </p>
              <p className="text-sm text-muted-foreground">
                جرّب تخفيف الفلاتر أو أضف مهمة جديدة من أعلى الصفحة.
              </p>
            </div>
          </div>
        ) : null}

        {!loading &&
          paginatedTasks.map((task) => (
            <TaskTableMobileCard
              key={task.id}
              task={task}
              isSelected={selectedTasks.includes(task.id)}
              onSelect={handleSelectTask}
              isOverdue={isOverdue}
              getStatusColor={getStatusColor}
              getStatusText={getStatusText}
              getPriorityColor={getPriorityColor}
              getPriorityText={getPriorityText}
              formatDate={formatDate}
              updateTaskStatus={updateTaskStatus}
              canApprove={canApprove || Boolean(approverUserId && task.createdBy === approverUserId)}
              onOpenTask={openTask}
              onEditTask={editTask}
              onDuplicateTask={duplicateTask}
              onDeleteTask={deleteTask}
              onOpenDeliveryGate={setDeliveryGateTask}
              onOpenApprovalGate={setApprovalGateTask}
              onDirectApprove={handleDirectApprove}
            />
          ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/60">
              <thead className="bg-background/90 backdrop-blur">
                <tr>
                  <th className="w-10 px-3 py-2 text-center text-xs font-semibold text-muted-foreground">
                    <div className="mx-auto size-4 rounded bg-muted" />
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">المهمة</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">الحالة</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">الاستحقاق</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">التقدم</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={`skel-${i}`} />
                ))}
              </tbody>
            </table>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-dashed border-border bg-background/60">
              <ClipboardDocumentListIcon className="size-8 text-muted-foreground/50" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-foreground">
                لا توجد مهام مطابقة
              </p>
              <p className="text-xs text-muted-foreground">
                لم نعثر على عناصر ضمن النطاق الحالي. راجع الفلاتر أو أضف مهمة جديدة.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-h-[65vh] overflow-auto">
            <table className="min-w-full divide-y divide-border/60">
              <thead className="sticky top-0 z-10 bg-background/90 backdrop-blur">
                <tr>
                  <th className="w-10 px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedTasks.length === paginatedTasks.length &&
                        paginatedTasks.length > 0
                      }
                      onChange={handleSelectAll}
                      className="size-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                    المهمة
                    <TaskSortIndicator column="title" currentSort={sortBy} order={sortOrder} />
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                    الحالة
                    <TaskSortIndicator column="status" currentSort={sortBy} order={sortOrder} />
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                    الاستحقاق
                    <TaskSortIndicator column="dueDate" currentSort={sortBy} order={sortOrder} />
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                    التقدم
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginatedTasks.map((task) => (
                  <TaskTableRow
                    key={task.id}
                    task={task}
                    isSelected={selectedTasks.includes(task.id)}
                    onSelect={handleSelectTask}
                    isOverdue={isOverdue}
                    getStatusColor={getStatusColor}
                    getStatusText={getStatusText}
                    getStatusIcon={getStatusIcon}
                    getPriorityColor={getPriorityColor}
                    getPriorityText={getPriorityText}
                    formatDate={formatDate}
                    updateTaskStatus={updateTaskStatus}
                    canApprove={canApprove || Boolean(approverUserId && task.createdBy === approverUserId)}
                    onOpenTask={openTask}
                    onEditTask={editTask}
                    onDuplicateTask={duplicateTask}
                    onDeleteTask={deleteTask}
                    onOpenDeliveryGate={setDeliveryGateTask}
                    onOpenApprovalGate={setApprovalGateTask}
                    onDirectApprove={handleDirectApprove}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && (
        <TaskTablePagination
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
        />
      )}

      {deliveryGateTask && (
        <DeliveryGateModal
          isOpen={Boolean(deliveryGateTask)}
          onClose={() => setDeliveryGateTask(null)}
          task={deliveryGateTask}
          onSubmit={handleDeliverySubmit}
          isSubmitting={isSubmittingGate}
        />
      )}

      {approvalGateTask && (
        <ApprovalGateModal
          isOpen={Boolean(approvalGateTask)}
          onClose={() => setApprovalGateTask(null)}
          task={approvalGateTask}
          currentUserRole={userRole}
          onApprove={handleApprove}
          onReturn={handleReturn}
          isSubmitting={isSubmittingGate}
        />
      )}
    </div>
  );
};
