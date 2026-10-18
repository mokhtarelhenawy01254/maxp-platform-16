import React from 'react';
import type { AgentWorkload } from './types';

export interface WorkspaceManagerAssignBarProps {
  assignedTo?: string;
  assignedToName?: string;
  agents: AgentWorkload[];
  isArabic: boolean;
  orderId: string;
  onAssignOrder: (orderId: string, targetUserId: string) => Promise<void>;
}

export const WorkspaceManagerAssignBar: React.FC<WorkspaceManagerAssignBarProps> = ({
  assignedTo,
  assignedToName,
  agents,
  isArabic,
  orderId,
  onAssignOrder,
}) => {
  return (
    <div className="mt-2.5 flex items-center justify-between gap-2 rounded-md border border-border/40 bg-muted/20 px-2.5 py-1.5 text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="font-semibold text-foreground">
          {isArabic ? 'الموظف المسؤول:' : 'Assigned Agent:'}
        </span>
        <span className="font-medium text-primary">
          {assignedToName || (isArabic ? 'غير موزع' : 'Unassigned')}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-muted-foreground">{isArabic ? 'تعيين:' : 'Assign:'}</span>
        <select
          value={assignedTo || ''}
          onChange={(e) => {
            if (e.target.value) {
              void onAssignOrder(orderId, e.target.value);
            }
          }}
          className="h-6 rounded border border-border/60 bg-background px-1.5 text-xs font-semibold text-foreground outline-none focus:border-primary cursor-pointer"
        >
          <option value="" disabled>
            {isArabic ? 'اختر موظف…' : 'Select agent…'}
          </option>
          {agents.map((ag) => (
            <option key={ag.id} value={ag.id}>
              {ag.name} ({ag.pendingCount})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default WorkspaceManagerAssignBar;
