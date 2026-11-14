import React from 'react';
import {
  GitBranch,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Send,
  ArrowRight,
  List,
  LayoutGrid,
  CheckCircle2,
} from 'lucide-react';
import type { FlowCategory } from './types';
import { SUB_JOURNEYS } from './constants';

interface EducationFlowTopBarProps {
  viewMode: 'list' | 'canvas';
  onToggleViewMode: (mode: 'list' | 'canvas') => void;
  activeCategory: FlowCategory;
  onSelectCategory: (cat: FlowCategory) => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onOpenTestModal: () => void;
  currentFlowTitle?: string;
}

export const EducationFlowTopBar: React.FC<EducationFlowTopBarProps> = ({
  viewMode,
  onToggleViewMode,
  activeCategory,
  onSelectCategory,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onOpenTestModal,
  currentFlowTitle,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 sm:px-6 sticky top-0 z-30 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Breadcrumbs & View Toggle */}
        <div className="flex items-center gap-3">
          {viewMode === 'canvas' ? (
            <button
              type="button"
              onClick={() => onToggleViewMode('list')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-foreground hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs"
            >
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-0" />
              <span>دليل المسارات</span>
            </button>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <GitBranch className="w-4 h-4" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-foreground">
                {viewMode === 'canvas'
                  ? currentFlowTitle || 'محرر مسار الأتمتة'
                  : 'مسارات رسائل النظام التعليمي'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live نشط
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {viewMode === 'canvas'
                ? 'محرر مرئي شبكي (Dot-Grid) مستوحى من ماني شات و Customer.io'
                : 'قائمة المسارات الآلية وقنوات واتساب وماسنجر وإنستجرام'}
            </p>
          </div>
        </div>

        {/* Center: Stage Switcher Tabs (Only in Canvas Mode) */}
        {viewMode === 'canvas' && (
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
        )}

        {/* Right: View Mode Toggle, Zoom Controls & Actions */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          {/* View Mode Toggle Pill */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onToggleViewMode('list')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>دليل المسارات</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleViewMode('canvas')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'canvas'
                  ? 'bg-white dark:bg-slate-900 text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>الكانفاس</span>
            </button>
          </div>

          {/* Zoom Controls (Canvas Mode Only) */}
          {viewMode === 'canvas' && (
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
          )}

          {/* Test Message Button */}
          <button
            type="button"
            onClick={onOpenTestModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">إرسال تجربة حية</span>
          </button>
        </div>
      </div>
    </div>
  );
};
