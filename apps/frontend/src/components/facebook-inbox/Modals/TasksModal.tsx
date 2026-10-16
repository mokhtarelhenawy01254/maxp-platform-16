import React from "react";
import { CheckSquare, X } from "lucide-react";
import Tasks from "../../../pages/tasks/Tasks";

interface TasksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TasksModal: React.FC<TasksModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background/80 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex min-h-0 flex-1 flex-col bg-card border border-border/70 m-2 sm:m-4 rounded-2xl overflow-hidden shadow-xl text-foreground">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <CheckSquare className="size-3.5" />
            </span>
            <span className="text-xs sm:text-sm font-semibold text-foreground">
              مهام ومتابعات المحادثات
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-2xs active:scale-95"
            aria-label="إغلاق"
          >
            <X className="size-3.5" />
            <span>إغلاق</span>
          </button>
        </div>

        {/* Embedded Tasks Canvas */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Tasks embeddedInModal />
        </div>
      </div>
    </div>
  );
};

export default TasksModal;
