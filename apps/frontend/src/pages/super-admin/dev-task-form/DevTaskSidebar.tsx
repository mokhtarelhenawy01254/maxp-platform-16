import React from 'react';
import {
  TYPE_OPTIONS,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from '../../../constants/taskConstants';
import type { DevTaskFormData, Project, TeamMember, Release } from './types';
import { DateInput } from '../../../components/ui/DateInput';

interface DevTaskSidebarProps {
  formData: DevTaskFormData;
  handleChange: (field: keyof DevTaskFormData, value: any) => void;
  settings: any;
  teamMembers: TeamMember[];
  projects: Project[];
  releases: Release[];
  watchers: string[];
  setWatchers: React.Dispatch<React.SetStateAction<string[]>>;
  derivedComponentOptions: { value: string; label: string }[];
}

export const DevTaskSidebar: React.FC<DevTaskSidebarProps> = ({
  formData,
  handleChange,
  settings,
  teamMembers,
  projects,
  releases,
  watchers,
  setWatchers,
  derivedComponentOptions,
}) => {
  return (
    <div className="space-y-4">
      {/* Primary Status & Priority Card */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">الحالة</label>
          <select
            value={formData.status}
            onChange={e => handleChange('status', e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-muted/20 border border-border rounded-lg text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            {(settings?.taskStatuses || STATUS_OPTIONS).map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">الأولوية</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(settings?.taskPriorities || PRIORITY_OPTIONS).map((option: any) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange('priority', option.value)}
                className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  formData.priority === option.value
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">النوع</label>
          <select
            value={formData.type}
            onChange={e => handleChange('type', e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-muted/20 border border-border rounded-lg text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            {TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignment Card */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
        <h4 className="text-xs font-semibold text-foreground border-b border-border/60 pb-2">
          التعيين والمسؤولية
        </h4>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            المسؤول الأساسي <span className="text-destructive">*</span>
          </label>
          <select
            value={formData.assigneeId}
            onChange={e => handleChange('assigneeId', e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">اختر المسؤول...</option>
            {teamMembers.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">المراقبون</label>
          <select
            multiple
            value={watchers}
            onChange={e =>
              setWatchers(Array.from(e.target.selectedOptions, o => o.value))
            }
            className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground h-20 focus:ring-1 focus:ring-primary focus:outline-none"
          >
            {teamMembers.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Context & Component Card */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
        <h4 className="text-xs font-semibold text-foreground border-b border-border/60 pb-2">
          المشروع والمكون
        </h4>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">المشروع</label>
          <select
            value={formData.projectId}
            onChange={e => handleChange('projectId', e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">بدون ملف مشروع</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">الإصدار (Release)</label>
          <select
            value={formData.releaseId}
            onChange={e => handleChange('releaseId', e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">بدون إصدار</option>
            {releases.map(r => (
              <option key={r.id} value={r.id}>
                {r.name} (v{r.version})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">المكون (Component)</label>
          <select
            value={formData.component}
            onChange={e => handleChange('component', e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">General</option>
            {derivedComponentOptions.map(c => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dates & Estimation Card */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
        <h4 className="text-xs font-semibold text-foreground border-b border-border/60 pb-2">
          التوقيت والتقدير
        </h4>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">تاريخ البدء</label>
          <DateInput
            value={formData.startDate}
            onChange={e => handleChange('startDate', e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            تاريخ الاستحقاق <span className="text-destructive">*</span>
          </label>
          <DateInput
            value={formData.dueDate}
            onChange={e => handleChange('dueDate', e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">الساعات التقديرية</label>
          <input
            type="number"
            placeholder="0.0"
            step="0.5"
            value={formData.estimatedHours}
            onChange={e => handleChange('estimatedHours', e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground tabular-nums focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Tags Card */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <label className="block text-xs font-medium text-foreground mb-1.5">
          الوسوم (مفصولة بفواصل)
        </label>
        <input
          type="text"
          value={formData.tags}
          onChange={e => handleChange('tags', e.target.value)}
          placeholder="react, api, ui..."
          className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-muted/20 focus:bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
};

export default DevTaskSidebar;
