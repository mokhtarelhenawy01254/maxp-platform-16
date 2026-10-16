import React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ListTodo, CheckCircle2 } from "lucide-react";
import { Task } from "../../../types/tasks";
import { TASK_STATUSES } from "../../../constants/taskConstants";

interface TaskSubtasksProps {
  task: Task;
  onAddSubtask: () => void;
  onRequestTesting?: () => void;
  settings?: any;
}

const TaskSubtasks: React.FC<TaskSubtasksProps> = ({
  task,
  onAddSubtask,
  onRequestTesting,
  settings,
}) => {
  const navigate = useNavigate();

  const getStatusInfo = (status: string) => {
    const fromSettings = settings?.taskStatuses?.find(
      (s: any) => s.value === status,
    );
    if (fromSettings) return fromSettings;
    return TASK_STATUSES[status] || TASK_STATUSES["BACKLOG"];
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">
            المهام الفرعية
          </h4>
          {task.subtasks && task.subtasks.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums bg-muted/60 text-muted-foreground border border-border/50">
              {task.subtasks.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRequestTesting && (
            <button
              onClick={onRequestTesting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-all active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>طلب اختبار</span>
            </button>
          )}
          <button
            onClick={onAddSubtask}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة مهمة</span>
          </button>
        </div>
      </div>

      {task.subtasks?.map((subtask) => {
        const statusInfo = getStatusInfo(subtask.status);
        const bgClass = statusInfo?.bg || "bg-muted";
        const textClass = statusInfo?.text || "text-muted-foreground";
        const label = statusInfo?.label || subtask.status;

        return (
          <div
            key={subtask.id}
            className="flex items-center justify-between gap-3 p-3 bg-muted/20 hover:bg-muted/40 border border-border/60 hover:border-border rounded-xl transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-2 h-2 rounded-full ${bgClass} shrink-0`} />
              <button
                onClick={() => navigate(`/super-admin/dev-tasks/${subtask.id}`)}
                className="text-xs font-medium text-foreground hover:text-primary transition-colors text-start truncate"
              >
                {subtask.title}
              </button>
            </div>
            <span
              className={`text-[11px] font-medium px-2.5 py-0.5 rounded-md shrink-0 border border-border/50 ${bgClass} ${textClass}`}
            >
              {label}
            </span>
          </div>
        );
      })}

      {(!task.subtasks || task.subtasks.length === 0) && (
        <div className="text-center py-10 text-xs text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/60 space-y-2">
          <ListTodo className="w-8 h-8 mx-auto text-muted-foreground/40" />
          <p>لا توجد مهام فرعية مضافة بعد</p>
        </div>
      )}
    </div>
  );
};

export default TaskSubtasks;
