import React from "react";
import { AppAccessRoute } from "../../components/protection/AppAccessRoute";
import { BusinessPageShell } from "../../components/business/BusinessSurface";
import { TaskWorkspaceTabs } from "./components/TaskWorkspaceTabs";
import { ProjectWorkspaceView } from "./components/ProjectWorkspaceView";
import { ProjectsTab } from "./components/ProjectsTab";
import { CategoriesTab } from "./components/CategoriesTab";
import { ComplianceReportsTab } from "./components/ComplianceReportsTab";
import { TaskBacklogTab } from "./components/TaskBacklogTab";
import { TaskSettingsTab } from "./components/TaskSettingsTab";
import { TaskIntegrationsTab } from "./components/TaskIntegrationsTab";
import {
  useTasksPageController,
  TasksMainTab,
  TasksModals,
  TasksMobileCommandBar,
  createInitialTaskDraft,
  type TasksProps,
} from "./tasks-page/index";

const Tasks: React.FC<TasksProps> = ({ embeddedInModal }) => {
  const controller = useTasksPageController(embeddedInModal);

  if (controller.loading) {
    return (
      <BusinessPageShell className="p-3 md:p-4">
        <div className="mx-auto max-w-[1360px] space-y-2">
          <div className="business-page-panel animate-pulse space-y-2 rounded-[18px] px-3 py-3 md:px-4">
            <div className="h-3 w-24 rounded-full bg-muted"></div>
            <div className="h-5 w-52 rounded-xl bg-muted"></div>
            <div className="flex flex-wrap gap-2">
              <div className="h-8 w-28 rounded-xl bg-muted"></div>
              <div className="h-8 w-28 rounded-xl bg-muted"></div>
            </div>
          </div>
          <div className="grid animate-pulse grid-cols-2 gap-2 xl:grid-cols-4">
            {[...Array(4)].map((_, idx) => (
              <div
                key={idx}
                className="business-metric-card h-16 rounded-[16px] bg-card/80"
              ></div>
            ))}
          </div>
          <div className="business-page-panel animate-pulse rounded-[18px] px-3 py-3 md:px-4">
            <div className="mb-3 h-4 w-36 rounded-full bg-muted"></div>
            <div className="grid gap-2 md:grid-cols-2">
              {[...Array(4)].map((_, idx) => (
                <div
                  key={idx}
                  className="h-14 rounded-[14px] border border-border/60 bg-background/70"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </BusinessPageShell>
    );
  }

  const renderActiveTabContent = () => {
    if (controller.activeProjectWorkspace) {
      return (
        <ProjectWorkspaceView
          project={controller.activeProjectWorkspace}
          tasks={controller.safeTasks}
          onBack={controller.handleCloseProjectWorkspace}
          onRefreshTasks={controller.reloadAll || controller.fetchTasks}
          onTaskStatusChange={controller.updateTaskStatus}
          onOpenTaskDetails={(t) => {
            controller.setSelectedTask(t);
            controller.setShowTaskModal(true);
          }}
          onEditTask={(t) => {
            controller.setEditingTask(t);
            controller.setShowEditTaskModal(true);
          }}
          onDeleteTask={controller.deleteTask}
          onCreateTaskInProject={() => {
            controller.setNewTask({
              ...createInitialTaskDraft(
                controller.activeUserId || "",
                controller.user?.name || ""
              ),
              projectId: controller.activeProjectWorkspace?.id || "",
            });
            controller.setShowCreateTaskModal(true);
          }}
          onOpenCreateTask={(projId) => {
            controller.setNewTask({
              ...createInitialTaskDraft(
                controller.activeUserId || "",
                controller.user?.name || ""
              ),
              projectId: projId || controller.activeProjectWorkspace?.id || "",
            });
            controller.setShowCreateTaskModal(true);
          }}
          formatDate={controller.formatDate}
          formatPrice={controller.formatPrice}
          userRole={controller.user?.role}
        />
      );
    }

    if (controller.activeTab === "tasks") {
      return <TasksMainTab controller={controller} />;
    }

    if (controller.activeTab === "projects") {
      return (
        <ProjectsTab
          projects={controller.projects}
          formatPrice={controller.formatPrice}
          formatDate={controller.formatDate}
          setSelectedProject={controller.setSelectedProject}
          setShowProjectModal={controller.setShowProjectModal}
          setEditingProject={controller.setEditingProject}
          setShowEditProjectModal={controller.setShowEditProjectModal}
          setShowCreateProjectModal={controller.setShowCreateProjectModal}
          deleteProject={controller.deleteProject}
          onOpenProjectWorkspace={controller.handleOpenProjectWorkspace}
        />
      );
    }

    if (controller.activeTab === "categories") {
      return (
        <CategoriesTab
          categories={controller.categories}
          setShowCategoryModal={controller.setShowCategoryModal}
          setEditingCategory={controller.setEditingCategory}
          deleteCategory={controller.deleteCategory}
        />
      );
    }

    if (controller.activeTab === "compliance") {
      return (
        <ComplianceReportsTab
          userRole={controller.user?.role}
          onRefreshTasks={controller.reloadAll || controller.fetchTasks}
        />
      );
    }

    if (controller.activeTab === "backlog") {
      return <TaskBacklogTab onTaskCreated={controller.fetchTasks} />;
    }

    if (controller.activeTab === "settings") {
      return (
        <TaskSettingsTab
          role={controller.user?.role}
          settings={controller.workspaceSettings}
          onSave={controller.saveWorkspacePreferences}
          onReset={controller.resetWorkspacePreferences}
        />
      );
    }

    if (controller.canManageIntegrations) {
      return <TaskIntegrationsTab users={controller.users} />;
    }

    return null;
  };

  return (
    <AppAccessRoute
      requiredAppSlugs={["business-tools"]}
      redirectMode="overlay-blur"
    >
      <BusinessPageShell className="tasks-page p-2.5 pb-24 md:px-4 md:py-3 xl:px-5 xl:py-4">
        <div className="mx-auto max-w-[1360px] space-y-2.5">
          <TaskWorkspaceTabs
            activeTab={controller.activeTab}
            onTabChange={controller.setActiveTab}
            canManageIntegrations={controller.canManageIntegrations}
            taskCount={controller.tasks.length}
            projectCount={controller.projects.length}
            categoryCount={controller.categories.length}
          />

          <div className="space-y-2">{renderActiveTabContent()}</div>

          <TasksModals controller={controller} />
        </div>

        <TasksMobileCommandBar controller={controller} />
      </BusinessPageShell>
    </AppAccessRoute>
  );
};

export default Tasks;
