import React from 'react';
import {
  GitBranch,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Send,
  SlidersHorizontal,
} from 'lucide-react';
import type { FlowCategory } from './types';
import { SUB_JOURNEYS } from './constants';

interface EducationFlowTopBarProps {
  activeCategory: FlowCategory;
  onSelectCategory: (cat: FlowCategory) => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onOpenTestModal: () => void;
}

export const EducationFlowTopBar: React.FC<EducationFlowTopBarProps> = ({
  activeCategory,
  onSelectCategory,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onOpenTestModal,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6 sticky top-0 z-30 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Title & Live Status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                مسار جدولة رسائل النظام التعليمي
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live نشط
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              خط سير الرسائل والتذكيرات على واتساب وماسنجر لولي الأمر والطالب
            </p>
          </div>
        </div>

        {/* Center: Stage Switcher Tabs */}
        <div className="flex items-center overflow-x-auto bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 scrollbar-none">
          {SUB_JOURNEYS.map((j) => {
            const active = activeCategory === j.id;
            return (
              <button
                key={j.id}
                type="button"
                onClick={() => onSelectCategory(j.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {j.name}
              </button>
            );
          })}
        </div>

        {/* Right: Zoom Controls & Test Action */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-0.5">
            <button
              type="button"
              onClick={onZoomOut}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-slate-900 transition-all"
              title="تصغير"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-2 text-foreground font-semibold">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={onZoomIn}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-slate-900 transition-all"
              title="تكبير"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onZoomReset}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-slate-900 transition-all border-r border-slate-200 dark:border-slate-700"
              title="ملاءمة الشاشة"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Test Message Button */}
          <button
            type="button"
            onClick={onOpenTestModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>إرسال تجربة حية</span>
          </button>
        </div>
      </div>
    </div>
  );
};
