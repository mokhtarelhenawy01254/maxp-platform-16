import React from 'react';
import Tasks from '../../../pages/tasks/Tasks';

const overlayStyle: React.CSSProperties = {
  background: "rgba(7, 17, 32, 0.58)",
  backdropFilter: "blur(12px)",
};

interface TasksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TasksModal: React.FC<TasksModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={overlayStyle}
    >
      <div className="relative flex min-h-0 flex-1 flex-col bg-white dark:bg-slate-900 m-2 md:m-3 rounded-2xl overflow-hidden shadow-2xl">
        <div className="absolute left-3 top-3 z-[60]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Tasks embeddedInModal />
        </div>
      </div>
    </div>
  );
};

export default TasksModal;
