import React from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { Button } from "../../../components/ui/button";
import { TaskWorkspaceControlBar } from "../components/TaskWorkspaceControlBar";
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
    isTodayStripOpen,
    setIsTodayStripOpen,
    isGoalsStripOpen,
    setIsGoalsStripOpen,
  } = controller;

  const todayDueCount = React.useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return safeTasks.filter((t) => {
      if (!t.dueDate) return false;
      const due = t.dueDate.slice(0, 10);
      const isOpen = t.status !== "completed" && t.status !== "cancelled";
      return (due === todayStr || due < todayStr) && isOpen;
    }).length;
  }, [safeTasks]);

  return (
    <section className="space-y-2.5">
      {loadError && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-center">
          <p className="text-sm font-medium text-rose-700 dark:text-rose-300 mb-1.5">
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

      <TaskWorkspaceControlBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setCurrentPage={setCurrentPage}
        taskFilter={taskFilter}
        setTaskFilter={setTaskFilter}
        quickFilter={quickFilter}
        setQuickFilter={setQuickFilter}
        filters={filters}
        setFilters={setFilters}
        projects={projects}
        categories={categories}
        users={users}
        hideCompleted={hideCompleted}
        setHideCompleted={setHideCompleted}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        todayTasksCount={todayDueCount}
        showTodayStrip={isTodayStripOpen}
        onToggleTodayStrip={() => setIsTodayStripOpen?.(!isTodayStripOpen)}
        goalsCount={goals?.length || 0}
        showGoalsStrip={isGoalsStripOpen}
        onToggleGoalsStrip={() => setIsGoalsStripOpen?.(!isGoalsStripOpen)}
        onCreateTask={() => setShowCreateTaskModal(true)}
        setShowCreateTaskModal={setShowCreateTaskModal}
      />

      {isTodayStripOpen && (
        <TodayTasksFocusStrip
          tasks={safeTasks}
          onTaskStatusChange={updateTaskStatus}
          onOpenTaskDetails={(t) => {
            setSelectedTask(t);
            setShowTaskModal(true);
          }}
          onSelectTodayFilter={() => setQuickFilter("today")}
          isExpanded={isTodayStripOpen}
          onToggleExpand={() => setIsTodayStripOpen?.(false)}
          collapsible
        />
      )}

      {isGoalsStripOpen && (
        <GoalProgressStrip
          goals={goals}
          onOpenCreateGoal={() => setShowCreateGoalModal(true)}
          isExpanded={isGoalsStripOpen}
          onToggleExpand={() => setIsGoalsStripOpen?.(false)}
          collapsible
        />
      )}

      {selectedTasks.length > 0 ? (
        <div
          ref={bulkActionsRef}
          className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 animate-in fade-in-50 duration-150"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-foreground tabular-nums">
              تم تحديد {selectedTasks.length} مهمة
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7.5 rounded-lg px-2.5 text-xs"
                onClick={() => handleBulkStatusChange("in_progress")}
              >
                بدء التنفيذ
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7.5 rounded-lg border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
                onClick={() => handleBulkStatusChange("completed")}
              >
                إكمال
              </Button>
              {isApprover && (
                <Button
                  type="button"
                  size="sm"
                  className="h-7.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 text-xs font-medium"
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
                className="h-7.5 rounded-lg border-rose-500/30 bg-rose-500/10 px-2.5 text-xs text-rose-700 hover:bg-rose-500/15 dark:text-rose-300"
                onClick={handleBulkDelete}
              >
                حذف
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7.5 rounded-lg px-2.5 text-xs text-muted-foreground"
                onClick={() => setSelectedTasks([])}
              >
                إلغاء التحديد
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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
          <TaskTable
            canApprove={isApprover}
            approverUserId={user?.id}
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
