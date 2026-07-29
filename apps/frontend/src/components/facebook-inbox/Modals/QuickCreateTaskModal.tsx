import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import i18n from "../../i18n";
import { tToast } from "../../utils/i18n-toast";
import { buildApiUrl } from "../../../utils/urlHelper";
import { tokenManager } from "../../../utils/tokenManager";
import { CreateTaskModal } from "../../../pages/tasks/components/CreateTaskModal";
import type {
  GoalOption,
  Project,
  RecurringTaskConfig,
  TaskCategory,
  TaskDraft,
  TaskTemplate,
  TaskUser,
} from "../../../pages/tasks/types";

interface QuickCreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const createInitialTaskDraft = (userId: string, userName: string): TaskDraft => ({
  projectId: "",
  categoryId: "",
  goalId: "",
  title: "",
  description: "",
  priority: "medium",
  type: "manual",
  assignedTo: userId,
  assignedToName: userName,
  createdBy: userId,
  createdByName: userName,
  dueDate: "",
  startDate: "",
  estimatedHours: 0,
  measurementType: "TIME",
  metricUnit: "",
  metricTargetValue: null,
  metricCurrentValue: 0,
  tags: [],
});

const ensureArray = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

const getAccessToken = (): string | null => tokenManager.getAccessToken();

const QuickCreateTaskModal: React.FC<QuickCreateTaskModalProps> = ({ isOpen, onClose }) => {
  const [newTask, setNewTask] = useState<TaskDraft>(() =>
    createInitialTaskDraft(
      localStorage.getItem("userId") || "",
      localStorage.getItem("userName") || "",
    ),
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [users, setUsers] = useState<TaskUser[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [recurringConfig, setRecurringConfig] = useState<RecurringTaskConfig>({
    enabled: false,
    frequency: "weekly" as "daily" | "weekly" | "monthly" | "yearly",
    interval: 1,
    daysOfWeek: [] as number[],
    dayOfMonth: 1,
    endType: "never" as "never" | "date" | "count",
    endDate: "",
    endCount: 10,
  });
  const [dataLoaded, setDataLoaded] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const response = await fetch(buildApiUrl("projects"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setProjects(ensureArray<Project>(data.data?.projects || data.data || data.projects));
      }
    } catch {
      // Silent fail
    }
  }, []);

  const fetchGoals = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const response = await fetch(buildApiUrl("tasks/goals?includeDaily=false"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setGoals(ensureArray<GoalOption>(data.goals || data.data || data.tasks));
      }
    } catch {
      // Silent fail
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const response = await fetch(buildApiUrl("tasks/categories/list"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch {
      // Silent fail
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const response = await fetch(buildApiUrl("tasks/company-users"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Error fetching company users:", {
          status: response.status,
          code: errData?.code,
          message: errData?.message || response.statusText,
        });
        return;
      }
      const data = await response.json();
      if (data.success) {
        setUsers(data.data || []);
        const firstCompanyUser = data.data?.[0];
        if (firstCompanyUser) {
          setNewTask((prev) =>
            prev.assignedTo
              ? prev
              : {
                  ...prev,
                  assignedTo: firstCompanyUser.id,
                  assignedToName:
                    firstCompanyUser.name ||
                    `${firstCompanyUser.firstName || ""} ${firstCompanyUser.lastName || ""}`.trim(),
                },
          );
        }
      }
    } catch {
      // Silent fail
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl("tasks/templates"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json()) as {
        success?: boolean;
        data?: TaskTemplate[];
      };
      if (data.success) {
        setTemplates(data.data || []);
      }
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    if (isOpen && !dataLoaded) {
      fetchProjects();
      fetchGoals();
      fetchUsers();
      fetchCategories();
      fetchTemplates();
      setDataLoaded(true);
    }
    if (!isOpen) {
      setDataLoaded(false);
    }
  }, [isOpen, dataLoaded, fetchProjects, fetchGoals, fetchUsers, fetchCategories, fetchTemplates]);

  const applyTemplate = useCallback(
    (template: TaskTemplate) => {
      setNewTask((prev) => ({
        ...prev,
        title: template.title,
        description: template.description || "",
        priority: template.priority || "medium",
        estimatedHours: template.estimatedHours || 0,
        tags: template.tags || [],
      }));
      setShowTemplateSelector(false);
    },
    [],
  );

  const createTask = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        tToast.error("components_QuickCreateTaskModal.login_login_dff4");
        return;
      }
      const url = buildApiUrl("tasks");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newTask),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || data.error || `فشل في إنشاء المهمة (${response.status})`);
        return;
      }
      if (data.success) {
        setNewTask(
          createInitialTaskDraft(
            localStorage.getItem("userId") || "",
            localStorage.getItem("userName") || "",
          ),
        );
        tToast.success("components_QuickCreateTaskModal.success_create_7fd6");
        onClose();
      } else {
        toast.error(data.error || i18n.t("components_QuickCreateTaskModal.failed_create_9b04"));
      }
    } catch {
      tToast.error("components_QuickCreateTaskModal.failed_create_9b04");
    }
  }, [newTask, onClose]);

  if (!isOpen) return null;

  return (
    <CreateTaskModal
      showCreateTaskModal={isOpen}
      setShowCreateTaskModal={(show) => { if (!show) onClose(); }}
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
  );
};

export default QuickCreateTaskModal;
