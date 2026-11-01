import React from 'react';
import { SampleOrder } from '../../manufacturingApi';
import { DrawerTab } from './types';

export interface DrawerTabsNavProps {
  sample: SampleOrder;
  activeTab: DrawerTab;
  setActiveTab: (tab: DrawerTab) => void;
}

export const DrawerTabsNav: React.FC<DrawerTabsNavProps> = ({
  sample,
  activeTab,
  setActiveTab,
}) => {
  return (
    <div className="px-4 pt-3 border-b border-border flex items-center gap-2 text-xs">
      <button
        onClick={() => setActiveTab('stages')}
        className={`pb-2.5 font-medium border-b-2 transition-all ${
          activeTab === 'stages'
            ? 'border-primary text-primary font-semibold'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        مراحل التشغيل (
        <span className="tabular-nums">{sample.stages?.length || 0}</span>)
      </button>

      <button
        onClick={() => setActiveTab('info')}
        className={`pb-2.5 font-medium border-b-2 transition-all ${
          activeTab === 'info'
            ? 'border-primary text-primary font-semibold'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        المواصفات والبيانات
      </button>

      <button
        onClick={() => setActiveTab('finance')}
        className={`pb-2.5 font-medium border-b-2 transition-all flex items-center gap-1 ${
          activeTab === 'finance'
            ? 'border-primary text-primary font-semibold'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        <span>المصنع والدفع</span>
        {sample.isOverdue && (
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        )}
      </button>

      <button
        onClick={() => setActiveTab('attachments')}
        className={`pb-2.5 font-medium border-b-2 transition-all ${
          activeTab === 'attachments'
            ? 'border-primary text-primary font-semibold'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        المرفقات والصور (
        <span className="tabular-nums">{sample.attachments?.length || 0}</span>)
      </button>

      <button
        onClick={() => setActiveTab('components')}
        className={`pb-2.5 font-medium border-b-2 transition-all ${
          activeTab === 'components'
            ? 'border-primary text-primary font-semibold'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        المكونات (
        <span className="tabular-nums">{sample.components?.length || 0}</span>)
      </button>
    </div>
  );
};
