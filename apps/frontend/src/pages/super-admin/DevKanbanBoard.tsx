import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  Plus,
  Filter,
  Search,
  MessageSquare,
  CheckSquare,
  Bug,
  Sparkles,
  Wrench,
  AlertTriangle,
  TrendingUp,
  Calendar,
  MoreVertical,
  Kanban,
  FileText,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

interface KanbanTask {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  component: string | null;
  order: number;
  dueDate: string | null;
  estimatedHours: number;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  projectName: string | null;
  projectColor: string | null;
  tags: string[];
  commentsCount: number;
  subtasksCount: number;
  checklistsCount: number;
}

interface KanbanData {
  [key: string]: KanbanTask[];
}

const defaultColumns = [
  {
    key: "BACKLOG",
    label: "قائمة الانتظار",
    color: "bg-muted/30",
    headerColor: "bg-muted/60",
  },
  {
    key: "TODO",
    label: "للتنفيذ",
    color: "bg-amber-500/5",
    headerColor: "bg-amber-500/10",
  },
  {
    key: "IN_PROGRESS",
    label: "قيد العمل",
    color: "bg-blue-500/5",
    headerColor: "bg-blue-500/10",
  },
  {
    key: "IN_REVIEW",
    label: "مراجعة",
    color: "bg-purple-500/5",
    headerColor: "bg-purple-500/10",
  },
  {
    key: "TESTING",
    label: "اختبار",
    color: "bg-orange-500/5",
    headerColor: "bg-orange-500/10",
  },
  {
    key: "DONE",
    label: "مكتمل",
    color: "bg-emerald-500/5",
    headerColor: "bg-emerald-500/10",
  },
];

const defaultPriorityColors: Record<string, string> = {
  CRITICAL: "border-r-destructive",
  HIGH: "border-r-amber-500",
  MEDIUM: "border-r-blue-500",
  LOW: "border-r-emerald-500",
};

const typeIcons: Record<string, React.ReactNode> = {
  BUG: <Bug className="size-3.5 text-destructive" />,
  FEATURE: <Sparkles className="size-3.5 text-emerald-500" />,
  ENHANCEMENT: <Wrench className="size-3.5 text-blue-500" />,
  DOCUMENTATION: <FileText className="size-3.5 text-purple-500" />,
  SECURITY: <ShieldAlert className="size-3.5 text-orange-500" />,
  PERFORMANCE: <Zap className="size-3.5 text-amber-500" />,
};

const DevKanbanBoard: React.FC = () => {
  const navigate = useNavigate();
  const [kanbanData, setKanbanData] = useState<KanbanData>({});
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<KanbanTask | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    projectId: "",
    assigneeId: "",
    type: "",
    priority: "",
    search: "",
  });

  const fetchKanbanData = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.projectId) queryParams.set("projectId", filters.projectId);
      if (filters.assigneeId) queryParams.set("assigneeId", filters.assigneeId);
      if (filters.type) queryParams.set("type", filters.type);
      if (filters.priority) queryParams.set("priority", filters.priority);

      const response = await fetch(
        buildApiUrl(`admin/dev-tasks/kanban?${queryParams.toString()}`),
        {
          headers: tokenManager.createAuthHeaders(),
        },
      );

      if (response.ok) {
        const result = await response.json();
        setKanbanData(result.data || {});
      }
    } catch (error) {
      console.error("Error fetching kanban data:", error);
    } finally {
      setLoading(false);
    }
  }, [filters.projectId, filters.assigneeId, filters.type, filters.priority]);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl("admin/dev-tasks/settings"), {
        headers: tokenManager.createAuthHeaders(),
      });
      if (response.ok) {
        const result = await response.json();
        setSettings(result.data);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    fetchKanbanData();
  }, [fetchKanbanData]);

  const handleDragStart = (e: React.DragEvent, task: KanbanTask) => {
    setDraggedTask(task);
    e.dataTransfer.setData("text/plain", task.id);
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    setDragOverColumn(columnKey);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedTask || draggedTask.status === targetColumn) {
      setDraggedTask(null);
      return;
    }

    const sourceColumn = draggedTask.status;
    const taskId = draggedTask.id;

    setKanbanData((prev) => {
      const sourceTasks = [...(prev[sourceColumn] || [])];
      const targetTasks = [...(prev[targetColumn] || [])];
      const taskIndex = sourceTasks.findIndex((t) => t.id === taskId);

      if (taskIndex !== -1) {
        const [movedTask] = sourceTasks.splice(taskIndex, 1);
        if (movedTask) {
          targetTasks.push({ ...movedTask, status: targetColumn });
        }
      }

      return {
        ...prev,
        [sourceColumn]: sourceTasks,
        [targetColumn]: targetTasks,
      };
    });

    try {
      const response = await fetch(
        buildApiUrl(`admin/dev-tasks/${taskId}/status`),
        {
          method: "PATCH",
          headers: tokenManager.createAuthHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ status: targetColumn }),
        },
      );

      if (!response.ok) {
        fetchKanbanData();
      }
    } catch (error) {
      console.error("Error updating task status:", error);
      fetchKanbanData();
    }

    setDraggedTask(null);
  };

  const filteredTasks = useCallback(
    (tasks: KanbanTask[]) => {
      if (!filters.search) return tasks;
      const search = filters.search.toLowerCase();
      return tasks.filter(
        (task) =>
          task.title.toLowerCase().includes(search) ||
          task.projectName?.toLowerCase().includes(search) ||
          task.assigneeName?.toLowerCase().includes(search),
      );
    },
    [filters.search],
  );

  const totalTasksCount = Object.values(kanbanData).reduce((sum, list) => sum + (list?.length || 0), 0);

  const TaskCard: React.FC<{ task: KanbanTask }> = ({ task }) => {
    const priorityInfo = settings?.taskPriorities?.find(
      (p: any) => p.value === task.priority,
    );
    const borderStyle = priorityInfo
      ? { borderRightColor: priorityInfo.color, borderRightWidth: "3px" }
      : undefined;
    const isOverdue = task.dueDate
      ? new Date(task.dueDate) < new Date() && task.status !== "DONE"
      : false;

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        onClick={() => navigate(`/super-admin/dev-tasks/${task.id}`)}
        className={`
          bg-card rounded-lg border border-border/80 p-3 cursor-pointer
          hover:shadow-xs hover:border-foreground/20 transition-all duration-150
          ${!priorityInfo ? defaultPriorityColors[task.priority] + " border-r-[3px]" || "border-r-border" : ""}
          ${draggedTask?.id === task.id ? "opacity-40" : ""}
        `}
        style={borderStyle}
      >
        {/* Type & Project */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {typeIcons[task.type] || <Sparkles className="size-3.5 text-muted-foreground" />}
            {task.projectName && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: task.projectColor || "hsl(var(--primary))" }}
                />
                {task.projectName}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="p-1 hover:bg-muted rounded text-muted-foreground"
          >
            <MoreVertical className="size-3.5" />
          </button>
        </div>

        {/* Title */}
        <h4 className="font-medium text-foreground text-xs mb-2 line-clamp-2 leading-snug">
          {task.title}
        </h4>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 bg-muted/60 text-muted-foreground text-[10px] rounded font-mono border border-border/40"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="px-1.5 py-0.5 text-muted-foreground text-[10px] font-mono">
                +{task.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs">
          <div className="flex items-center gap-2">
            {/* Assignee */}
            {task.assigneeName ? (
              task.assigneeAvatar ? (
                <img
                  src={task.assigneeAvatar}
                  alt={task.assigneeName}
                  className="size-5 rounded-full object-cover"
                />
              ) : (
                <div className="size-5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[10px] font-bold">
                  {task.assigneeName.charAt(0)}
                </div>
              )
            ) : (
              <div className="size-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px]">
                ?
              </div>
            )}

            {/* Due Date */}
            {task.dueDate && (
              <span
                className={`flex items-center gap-1 text-[11px] font-mono tabular-nums ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}
              >
                <Calendar className="size-3" />
                {new Date(task.dueDate).toLocaleDateString("ar-EG", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>

          {/* Counts */}
          <div className="flex items-center gap-2 text-muted-foreground text-[11px] font-mono tabular-nums">
            {task.subtasksCount > 0 && (
              <span className="flex items-center gap-0.5">
                <CheckSquare className="size-3" />
                {task.subtasksCount}
              </span>
            )}
            {task.commentsCount > 0 && (
              <span className="flex items-center gap-0.5">
                <MessageSquare className="size-3" />
                {task.commentsCount}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 space-y-4 max-w-7xl mx-auto w-full" dir={i18n.dir()}>
      {/* Top Header Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Kanban className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                لوحة مهام التطوير (Kanban Board)
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-border/80 bg-muted/30">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {totalTasksCount} مهمة
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              اسحب المهام عبر الأعمدة لتحديث حالتها ومتابعة مسار التنفيذ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Search */}
          <div className="relative">
            <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="بحث في المهام..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="pr-8 h-8 text-xs font-mono w-48 sm:w-60 bg-background/50"
            />
          </div>

          {/* Filter Button */}
          <Button
            type="button"
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98]"
          >
            <Filter className="size-3.5" />
            <span>فلترة</span>
          </Button>

          {/* Add Task */}
          <Button
            type="button"
            size="sm"
            onClick={() => navigate("/super-admin/dev-tasks/new")}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>مهمة جديدة</span>
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="rounded-xl border border-border/80 bg-card/40 p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              النوع
            </label>
            <select
              value={filters.type}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, type: e.target.value }))
              }
              className="w-full border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground text-xs"
            >
              <option value="">كل الأنواع</option>
              <option value="BUG">أخطاء</option>
              <option value="FEATURE">ميزات</option>
              <option value="ENHANCEMENT">تحسينات</option>
              <option value="DOCUMENTATION">توثيق</option>
              <option value="SECURITY">أمني</option>
              <option value="PERFORMANCE">أداء</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              الأولوية
            </label>
            <select
              value={filters.priority}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, priority: e.target.value }))
              }
              className="w-full border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground text-xs"
            >
              <option value="">كل الأولويات</option>
              <option value="CRITICAL">حرجة</option>
              <option value="HIGH">عالية</option>
              <option value="MEDIUM">متوسطة</option>
              <option value="LOW">منخفضة</option>
            </select>
          </div>
          <div className="col-span-2 flex items-end justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setFilters({
                  projectId: "",
                  assigneeId: "",
                  type: "",
                  priority: "",
                  search: "",
                })
              }
              className="h-8 text-xs font-mono text-muted-foreground hover:text-foreground"
            >
              مسح الفلاتر
            </Button>
          </div>
        </div>
      )}

      {/* Kanban Columns */}
      <div className="flex-1 overflow-x-auto min-h-0">
        <div className="flex gap-3 h-full min-w-max pb-4">
          {(settings?.taskStatuses || defaultColumns).map((column: any) => {
            const columnKey = column.value || column.key;
            const columnLabel = column.label;
            const columnTasks = filteredTasks(kanbanData[columnKey] || []);
            const isOver = dragOverColumn === columnKey;

            return (
              <div
                key={columnKey}
                onDragOver={(e) => handleDragOver(e, columnKey)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, columnKey)}
                className={`
                  w-72 flex-shrink-0 rounded-xl overflow-hidden flex flex-col
                  border transition-all duration-150 bg-card/30
                  ${isOver ? "border-primary bg-primary/5 shadow-xs" : "border-border/70"}
                `}
              >
                {/* Column Header */}
                <div className="px-3 py-2.5 border-b border-border/60 bg-muted/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-xs text-foreground">
                      {columnLabel}
                    </h3>
                    <span className="bg-background border border-border/60 text-muted-foreground px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/super-admin/dev-tasks/new?status=${columnKey}`)
                    }
                    className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                {/* Tasks List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-280px)]">
                  {columnTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground font-mono text-xs">
                      لا توجد مهام
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DevKanbanBoard;
