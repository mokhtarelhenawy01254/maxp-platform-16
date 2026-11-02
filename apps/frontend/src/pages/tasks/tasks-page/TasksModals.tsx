import React from "react";
import { buildApiUrl } from "../../../utils/urlHelper";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import { CategoryModal } from "../components/CategoryModal";
import { EditCategoryModal } from "../components/EditCategoryModal";
import { CreateGoalModal } from "../components/CreateGoalModal";
import { CreateTaskModal } from "../components/CreateTaskModal";
import { TaskDetailsModal } from "../components/TaskDetailsModal";
import { EditTaskModal } from "../components/EditTaskModal";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { ProjectDetailsModal } from "../components/ProjectDetailsModal";
import { EditProjectModal } from "../components/EditProjectModal";
import { FilterSidebar } from "../components/FilterSidebar";
import {
  getStatusColor,
  getStatusText,
  getPriorityColor,
  getPriorityText,
  isOverdue,
} from "./helpers";
import type { useTasksPageController } from "./useTasksPageController";

interface TasksModalsProps {
  controller: ReturnType<typeof useTasksPageController>;
}

export const TasksModals: React.FC<TasksModalsProps> = ({ controller }) => {
  const {
    showCategoryModal,
    setShowCategoryModal,
    newCategory,
    setNewCategory,
    createCategory,
    editingCategory,
    setEditingCategory,
    updateCategory,
    showCreateGoalModal,
    setShowCreateGoalModal,
    fetchGoals,
    users,
    projects,
    showCreateTaskModal,
    setShowCreateTaskModal,
    newTask,
    setNewTask,
    createTask,
    showTemplateSelector,
    setShowTemplateSelector,
    templates,
    applyTemplate,
    goals,
    categories,
    recurringConfig,
    setRecurringConfig,
    showTaskModal,
    setShowTaskModal,
    selectedTask,
    formatDate,
    updateTaskStatus,
    deleteTask,
    setSelectedTask,
    setEditingTask,
    setShowEditTaskModal,
    fetchTasks,
    showEditTaskModal,
    closeEditModal,
    editingTask,
    updateTask,
    showCreateProjectModal,
    setShowCreateProjectModal,
    newProject,
    setNewProject,
    createProject,
    showProjectModal,
    setShowProjectModal,
    selectedProject,
    formatPrice,
    deleteProject,
    setEditingProject,
    showEditProjectModal,
    setShowEditProjectModal,
    editingProject,
    updateProject,
    showFilterSidebar,
    setShowFilterSidebar,
    filters,
    setFilters,
    confirmState,
    setConfirmState,
  } = controller;

  return (
    <>
      {showCategoryModal && (
        <CategoryModal
          show={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          newCategory={newCategory}
          setNewCategory={setNewCategory}
          createCategory={createCategory}
        />
      )}

      {Boolean(editingCategory) && (
        <EditCategoryModal
          category={editingCategory}
          setEditingCategory={setEditingCategory}
          updateCategory={updateCategory}
        />
      )}

      {showCreateGoalModal && (
        <CreateGoalModal
          isOpen={showCreateGoalModal}
          onClose={() => setShowCreateGoalModal(false)}
          onGoalCreated={fetchGoals}
          users={users}
          projects={projects}
        />
      )}

      {showCreateTaskModal && (
        <CreateTaskModal
          showCreateTaskModal={showCreateTaskModal}
          setShowCreateTaskModal={setShowCreateTaskModal}
          newTask={newTask}
          setNewTask={setNewTask}
          createTask={createTask}
          showTemplateSelector={showTemplateSelector}
          setShowTemplateSelector={setShowTemplateSelector}
          templates={templates}
          applyTemplate={applyTemplate}
          projects={projects}
          goals={goals}
          categories={categories}
          users={users}
          recurringConfig={recurringConfig}
          setRecurringConfig={setRecurringConfig}
        />
      )}

      {showTaskModal && Boolean(selectedTask) && (
        <TaskDetailsModal
          show={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          task={selectedTask}
          users={users}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
          getPriorityColor={getPriorityColor}
          getPriorityText={getPriorityText}
          isOverdue={isOverdue}
          formatDate={formatDate}
          updateTaskStatus={updateTaskStatus}
          deleteTask={deleteTask}
          setSelectedTask={setSelectedTask}
          setEditingTask={setEditingTask}
          setShowEditTaskModal={setShowEditTaskModal}
          fetchTasks={fetchTasks}
          buildApiUrl={buildApiUrl}
        />
      )}

      {showEditTaskModal && Boolean(editingTask) && (
        <EditTaskModal
          show={showEditTaskModal}
          onClose={closeEditModal}
          task={editingTask}
          setEditingTask={setEditingTask}
          updateTask={updateTask}
          projects={projects}
          goals={goals}
          categories={categories}
          users={users}
        />
      )}

      {showCreateProjectModal && (
        <CreateProjectModal
          show={showCreateProjectModal}
          onClose={() => setShowCreateProjectModal(false)}
          newProject={newProject}
          setNewProject={setNewProject}
          createProject={createProject}
          users={users}
        />
      )}

      {showProjectModal && Boolean(selectedProject) && (
        <ProjectDetailsModal
          show={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          project={selectedProject}
          getPriorityColor={getPriorityColor}
          getPriorityText={getPriorityText}
          formatPrice={formatPrice}
          formatDate={formatDate}
          deleteProject={deleteProject}
          setEditingProject={setEditingProject}
          setShowEditProjectModal={setShowEditProjectModal}
        />
      )}

      {showEditProjectModal && Boolean(editingProject) && (
        <EditProjectModal
          show={showEditProjectModal}
          onClose={() => setShowEditProjectModal(false)}
          project={editingProject}
          setEditingProject={setEditingProject}
          updateProject={updateProject}
        />
      )}

      {showFilterSidebar && (
        <FilterSidebar
          show={showFilterSidebar}
          onClose={() => setShowFilterSidebar(false)}
          filters={filters}
          setFilters={setFilters}
          projects={projects}
          categories={categories}
          users={users}
        />
      )}

      {confirmState.show && (
        <AlertDialog
          open={confirmState.show}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmState({ show: false, message: "", onConfirm: () => {} });
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmState.message}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 text-white hover:bg-rose-700"
                onClick={() => {
                  confirmState.onConfirm();
                  setConfirmState({ show: false, message: "", onConfirm: () => {} });
                }}
              >
                تأكيد الحذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};
