import React from 'react';
import { Plus, Sparkles, GitCommit, Truck, FileText, BarChart3, Activity, Trash2, Folder } from 'lucide-react';
import { AgentReportType } from '../../services/agentReportsService';

interface ReportTypesColumnProps {
  types: AgentReportType[];
  selectedTypeId: string | null;
  onSelectType: (type: AgentReportType) => void;
  onOpenCreateModal: () => void;
  onDeleteType: (type: AgentReportType) => void;
  loading: boolean;
}

const getIconComponent = (iconName?: string | null) => {
  switch (iconName) {
    case 'sparkles':
      return Sparkles;
    case 'git-commit':
      return GitCommit;
    case 'truck':
      return Truck;
    case 'bar-chart':
      return BarChart3;
    case 'activity':
      return Activity;
    case 'file-text':
    default:
      return FileText;
  }
};

export const ReportTypesColumn: React.FC<ReportTypesColumnProps> = ({
  types,
  selectedTypeId,
  onSelectType,
  onOpenCreateModal,
  onDeleteType,
  loading,
}) => {
  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50/40">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-slate-500" />
          <h2 className="text-xs font-semibold text-slate-800 tracking-wide">أنواع التقارير</h2>
          <span className="text-[11px] font-medium text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded-full tabular-nums">
            {types.length}
          </span>
        </div>
        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg active:scale-[0.98] transition-all"
          title="إضافة نوع جديد"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>نوع جديد</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && types.length === 0 ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : types.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            لا توجد أنواع تقارير حالياً.
          </div>
        ) : (
          types.map((type) => {
            const IconComp = getIconComponent(type.icon);
            const isSelected = type.id === selectedTypeId;

            return (
              <div
                key={type.id}
                onClick={() => onSelectType(type)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-primary/10 text-primary font-medium shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs truncate font-medium">{type.name}</p>
                    {type.description && (
                      <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                        {type.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full tabular-nums font-medium ${
                      isSelected
                        ? 'bg-primary/20 text-primary'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {type.reportsCount}
                  </span>
                  {/* Delete button (only show on hover if not default or can be clicked) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteType(type);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded-md transition-opacity"
                    title="حذف النوع"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
