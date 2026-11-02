import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuthSimple";
import tokenManager from "../../../utils/tokenManager";
import { buildApiUrl } from "../../../utils/urlHelper";
import {
  TaskTabKey,
  TaskDetails,
  TaskRunningTimer,
  TaskPerson,
  toRunningTimer,
  toTaskPerson,
  normalizeTaskDetails,
  getArray,
} from "./types";

export const useTaskDetailsController = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeCompanyId = user?.companyId ?? null;
  const isApprover = ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER", "MANAGER"].includes(user?.role || "");

  const [task, setTask] = useState<TaskDetails | null>(null);
  // منشئ المهمة يقدر يعتمد مهمته هو كمان (زي تطبيق الديسكتوب)
  const isTaskCreator = Boolean(task?.createdByUser?.id && user?.id && task.createdByUser.id === user.id);
  const canApprove = isApprover || isTaskCreator;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TaskTabKey>("subtasks");
  const [newComment, setNewComment] = useState("");
  const [newSubtask, setNewSubtask] = useState({ title: "", description: "" });
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [runningTimer, setRunningTimer] = useState<TaskRunningTimer | null>(null);
  const [users, setUsers] = useState<TaskPerson[]>([]);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [showManualTimeForm, setShowManualTimeForm] = useState(false);
  const [manualTimeEntry, setManualTimeEntry] = useState({
    hours: 0,
    minutes: 0,
    description: "",
  });
  const [uploading, setUploading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const getAccessToken = (): string | null => tokenManager.getAccessToken();

  const fetchTaskDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/${id}/details`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok && data.success && data.data) {
        setTask(normalizeTaskDetails(data.data));
        return;
      }

      setTask(null);
    } catch (error) {
      console.error("Error fetching task details:", error);
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchRunningTimer = useCallback(async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl("tasks/running-timer"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setRunningTimer(toRunningTimer(data?.success ? data.data : null));
    } catch (error) {
      console.error("Error fetching running timer:", error);
      setRunningTimer(null);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl("tasks/company-users"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Error fetching users:", {
          status: response.status,
          code: errData?.code,
          message: errData?.message || response.statusText,
        });
        return;
      }
      const data = await response.json();

      if (data.success) {
        setUsers(
          getArray(data.data)
            .map((u) => toTaskPerson(u))
            .filter((u): u is TaskPerson => Boolean(u)),
        );
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  useEffect(() => {
    if (!id || !activeCompanyId) {
      return;
    }

    void fetchTaskDetails();
    void fetchRunningTimer();
    void fetchUsers();
  }, [id, activeCompanyId, fetchTaskDetails, fetchRunningTimer, fetchUsers]);

  const startTimer = async () => {
    if (!id) return;
    try {
      const token = getAccessToken();
      const response = await fetch(
        buildApiUrl(`tasks/${id}/time-tracking/start`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        },
      );

      const data = await response.json();
      if (data.success) {
        setRunningTimer(toRunningTimer(data.data));
        fetchTaskDetails();
      } else {
        window.alert(data.error || "فشل في بدء المؤقت");
      }
    } catch (error) {
      console.error("Error starting timer:", error);
    }
  };

  const stopTimer = async () => {
    if (!runningTimer) {
      return;
    }

    try {
      const token = getAccessToken();
      const response = await fetch(
        buildApiUrl(`tasks/time-tracking/${runningTimer.id}/stop`),
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await response.json();
      if (data.success) {
        setRunningTimer(null);
        fetchTaskDetails();
        fetchRunningTimer();
      }
    } catch (error) {
      console.error("Error stopping timer:", error);
    }
  };

  const addComment = async () => {
    if (!id || !newComment.trim()) {
      return;
    }

    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/${id}/comments`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment }),
      });

      const data = await response.json();
      if (data.success) {
        setNewComment("");
        fetchTaskDetails();
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const createSubtask = async () => {
    if (!id || !newSubtask.title.trim()) {
      return;
    }

    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/${id}/subtasks`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newSubtask),
      });

      const data = await response.json();
      if (data.success) {
        setNewSubtask({ title: "", description: "" });
        setShowSubtaskForm(false);
        fetchTaskDetails();
      }
    } catch (error) {
      console.error("Error creating subtask:", error);
    }
  };

  const updateComment = async (commentId: string) => {
    if (!editCommentContent.trim()) {
      return;
    }

    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/comments/${commentId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editCommentContent }),
      });

      const data = await response.json();
      if (data.success) {
        setEditingComment(null);
        setEditCommentContent("");
        fetchTaskDetails();
      }
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التعليق؟")) {
      return;
    }

    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/comments/${commentId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        fetchTaskDetails();
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const addManualTime = async () => {
    if (!id) return;
    const totalMinutes = manualTimeEntry.hours * 60 + manualTimeEntry.minutes;
    if (totalMinutes <= 0) {
      return;
    }

    try {
      const token = getAccessToken();
      const now = new Date();
      const startTime = new Date(now.getTime() - totalMinutes * 60000);

      const response = await fetch(buildApiUrl(`tasks/${id}/time-entries`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          startTime: startTime.toISOString(),
          endTime: now.toISOString(),
          duration: totalMinutes,
          description: manualTimeEntry.description,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setManualTimeEntry({ hours: 0, minutes: 0, description: "" });
        setShowManualTimeForm(false);
        fetchTaskDetails();
      }
    } catch (error) {
      console.error("Error adding manual time:", error);
    }
  };

  const updateSubtaskStatus = async (subtaskId: string, status: string) => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/${subtaskId}/status`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (data.success) {
        fetchTaskDetails();
      }
    } catch (error) {
      console.error("Error updating subtask status:", error);
    }
  };

  const toggleWatcher = async () => {
    if (!id || !task) return;
    try {
      const token = getAccessToken();
      const currentUserId = localStorage.getItem("userId");
      const isWatching = task.watchersList.some(
        (watcher) => watcher.id === currentUserId,
      );

      if (isWatching) {
        await fetch(buildApiUrl(`tasks/${id}/watchers/${currentUserId}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(buildApiUrl(`tasks/${id}/watchers`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: currentUserId }),
        });
      }

      fetchTaskDetails();
    } catch (error) {
      console.error("Error toggling watcher:", error);
    }
  };

  const updateTask = async (updates: Record<string, unknown>) => {
    if (!id) return;
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/${id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (data.success) {
        setTask((current) =>
          data.data ? normalizeTaskDetails(data.data) : current,
        );
        fetchTaskDetails();
      } else {
        window.alert(data.error || "فشل في تحديث المهمة");
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const deleteTask = async () => {
    if (!id) return;
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        navigate("/tasks");
      } else {
        window.alert(data.error || "فشل في حذف المهمة");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const uploadAttachment = async (file: File) => {
    if (!id) return;
    try {
      setUploading(true);
      const token = getAccessToken();
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(buildApiUrl("upload"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const uploadData = await uploadResponse.json();
      if (uploadData.success) {
        await fetch(buildApiUrl(`tasks/${id}/attachments`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileName: uploadData.fileName,
            originalName: file.name,
            fileSize: file.size,
            fileType: file.type,
            filePath: uploadData.filePath,
          }),
        });

        fetchTaskDetails();
      }
    } catch (error) {
      console.error("Error uploading attachment:", error);
    } finally {
      setUploading(false);
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المرفق؟")) {
      return;
    }

    try {
      const token = getAccessToken();
      const response = await fetch(
        buildApiUrl(`tasks/attachments/${attachmentId}`),
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await response.json();
      if (data.success) {
        fetchTaskDetails();
      }
    } catch (error) {
      console.error("Error deleting attachment:", error);
    }
  };

  return {
    id,
    navigate,
    isApprover,
    canApprove,
    task,
    loading,
    activeTab,
    setActiveTab,
    newComment,
    setNewComment,
    newSubtask,
    setNewSubtask,
    showSubtaskForm,
    setShowSubtaskForm,
    runningTimer,
    users,
    editingComment,
    setEditingComment,
    editCommentContent,
    setEditCommentContent,
    showManualTimeForm,
    setShowManualTimeForm,
    manualTimeEntry,
    setManualTimeEntry,
    uploading,
    showFullDescription,
    setShowFullDescription,
    fetchTaskDetails,
    startTimer,
    stopTimer,
    addComment,
    createSubtask,
    updateComment,
    deleteComment,
    addManualTime,
    updateSubtaskStatus,
    toggleWatcher,
    updateTask,
    deleteTask,
    uploadAttachment,
    deleteAttachment,
  };
};
