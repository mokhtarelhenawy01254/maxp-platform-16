import React from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { Button } from "../../../components/ui/button";
import { TaskFilters } from "../components/TaskFilters";
import { TaskUnifiedFilterBar } from "../../../components/tasks/TaskUnifiedFilterBar";
import { GoalProgressStrip } from "../components/GoalProgressStrip";
import { TaskTable } from "../components/TaskTable";
import { TaskWorkspaceHeader } from "../components/TaskWorkspaceHeader";
import { TodayTasksFocusStrip } from "../components/TodayTasksFocusStrip";
import { TaskProjectGroupView } from "../components/TaskProjectGroupView";
import { TaskWorkspaceEmptyState } from "../components/TaskWorkspaceEmptyState";
import {
  createInitialTaskDraft,
} from "./types";
import {
  getStatusIcon,
  getStatusColor,
  getStatusText,
  getPriorityColor,
  getPriorityText,
  isOverdue,
} from "./helpers";
import type { useTasksPageController } from "./useTasksPageController";

interface TasksMainTabProps {
  controller: ReturnType<typeof useTasksPageController>;
}

export const TasksMainTab: React.FC<TasksMainTabProps> = ({ controller }) => {
  const {
    safeTasks,
    updateTaskStatus,
    setSelectedTask,
    setShowTaskModal,
    setQuickFilter,
    loadError,
    fetchTasks,
    reloadAll,
    taskFilter,
    hasCommandState,
    selectedTasksCount,
    filteredAndSortedTasks,
    operatorHeadline,
    operatorDescription,
    taskStats,
    setShowFilterSidebar,
    setShowCreateTaskModal,
    setShowCreateProjectModal,
    setShowCreateGoalModal,
    exportToCSV,
    scrollToBulkActions,
    workspaceSettings,
    unifiedFilters,
    setUnifiedFilters,
    users,
    loading,
    searchQuery,
    setSearchQuery,
    setCurrentPage,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    filters,
    setFilters,
    projects,
    categories,
    setTaskFilter,
    hideCompleted,
    setHideCompleted,
    itemsPerPage,
    setItemsPerPage,
    selectedTasks,
    bulkActionsRef,
    handleBulkStatusChange,
    handleBulkDelete,
    setSelectedTasks,
    isApprover,
    goals,
    handleApplyPresetTemplate,
    viewMode,
    quickFilteredTasks,
    quickFilter,
    handleOpenProjectWorkspace,
    setEditingTask,
    setShowEditTaskModal,
    deleteTask,
    activeUserId,
    user,
    setNewTask,
    handleToggleViewMode,
    formatDate,
    formatPrice,
    handleSelectTask,
    handleSelectAll,
    duplicateTask,
    currentPage,
    totalPages,
    serverTotalTasks,
  } = controller;

  return (
    <section className="space-y-3">
      <TodayTasksFocusStrip
        tasks={safeTasks}
        onTaskStatusChange={updateTaskStatus}
        onOpenTaskDetails={(t) => {
          setSelectedTask(t);
          setShowTaskModal(true);
        }}
        onSelectTodayFilter={() => setQuickFilter("today")}
      />

      {loadError && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-center">
          <p className="text-sm font-medium text-rose-700 dark:text-rose-300 mb-2">
            {loadError}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchTasks}
            className="gap-1.5 rounded-xl border-rose-500/30 text-rose-700 hover:bg-rose-500/15"
          >
            <ArrowPathIcon className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      )}

      <TaskWorkspaceHeader
        taskFilter={taskFilter}
        hasCommandState={hasCommandState}
        selectedTasksCount={selectedTasksCount}
        visibleTasksCount={filteredAndSortedTasks.length}
        headline={operatorHeadline}
        description={operatorDescription}
        taskStats={taskStats}
        setShowFilterSidebar={setShowFilterSidebar}
        setShowCreateTaskModal={setShowCreateTaskModal}
        setShowCreateProjectModal={setShowCreateProjectModal}
        setShowCreateGoalModal={setShowCreateGoalModal}
        exportToCSV={exportToCSV}
        scrollToBulkActions={scrollToBulkActions}
        showOverdueIndicators={workspaceSettings.highlightOverdue}
        showProjectShortcut={workspaceSettings.showProjectShortcut}
      />

      <TaskUnifiedFilterBar
        filters={unifiedFilters}
        onFiltersChange={setUnifiedFilters}
        users={users}
        totalCount={safeTasks.length}
        filteredCount={filteredAndSortedTasks.length}
        onRefresh={fetchTasks}
        isLoading={loading}
      />

      <TaskFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setCurrentPage={setCurrentPage}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        filters={filters}
        setFilters={setFilters}
        projects={projects}
        categories={categories}
        users={users}
        setShowFilterSidebar={setShowFilterSidebar}
        taskFilter={taskFilter}
        setTaskFilter={setTaskFilter}
        hideCompleted={hideCompleted}
        setHideCompleted={setHideCompleted}
        taskStats={taskStats}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
      />

      {selectedTasks.length > 0 ? (
        <div
          ref={bulkActionsRef}
          className="rounded-[16px] border border-primary/15 bg-primary/5 px-3 py-2.5"
        >
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">
                تم تحديد {selectedTasks.length} مهمة
              </p>
              <p className="text-xs text-muted-foreground">
                نفّذ إجراءً جماعيًا سريعًا ثم ألغ التحديد عند الانتهاء.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-full px-2.5 text-xs"
                onClick={() => handleBulkStatusChange("in_progress")}
              >
                بدء التنفيذ
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-full border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
                onClick={() => handleBulkStatusChange("completed")}
              >
                إكمال
              </Button>
              {isApprover && (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 text-xs font-medium"
                  onClick={() => handleBulkStatusChange("completed")}
                  title="اعتماد المهام المحددة"
                >
                  اعتماد
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-full border-rose-500/30 bg-rose-500/10 px-2.5 text-xs text-rose-700 hover:bg-rose-500/15 dark:text-rose-300"
                onClick={handleBulkDelete}
              >
                حذف
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 rounded-full px-2.5 text-xs"
                onClick={() => setSelectedTasks([])}
              >
                إلغاء التحديد
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <GoalProgressStrip
        goals={goals}
        onOpenCreateGoal={() => setShowCreateGoalModal(true)}
      />

      {safeTasks.length === 0 && !loading ? (
        <TaskWorkspaceEmptyState
          onCreateTask={() => setShowCreateTaskModal(true)}
          onCreateProject={() => setShowCreateProjectModal(true)}
          onApplyPresetTemplate={handleApplyPresetTemplate}
        />
      ) : viewMode === "grouped" ? (
        <TaskProjectGroupView
          projects={projects}
          tasks={quickFilteredTasks}
          allTasks={safeTasks}
          quickFilter={quickFilter}
          onQuickFilterChange={setQuickFilter}
          onOpenProject={handleOpenProjectWorkspace}
          onTaskStatusChange={updateTaskStatus}
          onOpenTaskDetails={(t) => {
            setSelectedTask(t);
            setShowTaskModal(true);
          }}
          onEditTask={(t) => {
            setEditingTask(t);
            setShowEditTaskModal(true);
          }}
          onDeleteTask={deleteTask}
          onCreateTaskInProject={(projId) => {
            setNewTask({
              ...createInitialTaskDraft(
                activeUserId || "",
                user?.name || ""
              ),
              projectId: projId,
            });
            setShowCreateTaskModal(true);
          }}
          onOpenCreateTask={(projId) => {
            setNewTask({
              ...createInitialTaskDraft(
                activeUserId || "",
                user?.name || ""
              ),
              projectId: projId || "",
            });
            setShowCreateTaskModal(true);
          }}
          onCreateTaskStandalone={() => setShowCreateTaskModal(true)}
          onCreateProject={() => setShowCreateProjectModal(true)}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
          isApprover={isApprover}
          formatDate={formatDate}
          formatPrice={formatPrice}
        />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              عرض القائمة المباشرة ({quickFilteredTasks.length} مهمة)
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleViewMode}
              className="h-7 text-xs rounded-lg"
            >
              التبديل إلى العرض المجمع بالمشروع
            </Button>
          </div>
          <TaskTable
            canApprove={isApprover}
            userRole={user?.role}
            onReloadTasks={reloadAll || fetchTasks}
            paginatedTasks={quickFilteredTasks}
            filteredAndSortedTasks={quickFilteredTasks}
            searchQuery={searchQuery}
            selectedTasks={selectedTasks}
            loading={loading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            handleSelectTask={handleSelectTask}
            handleSelectAll={handleSelectAll}
            isOverdue={isOverdue}
            getStatusColor={getStatusColor}
            getStatusText={getStatusText}
            getStatusIcon={getStatusIcon}
            getPriorityColor={getPriorityColor}
            getPriorityText={getPriorityText}
            formatDate={formatDate}
            updateTaskStatus={updateTaskStatus}
            deleteTask={deleteTask}
            duplicateTask={duplicateTask}
            setSelectedTask={setSelectedTask}
            setShowTaskModal={setShowTaskModal}
            setEditingTask={setEditingTask}
            setShowEditTaskModal={setShowEditTaskModal}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
            serverTotalTasks={serverTotalTasks}
          />
        </div>
      )}
    </section>
  );
};
