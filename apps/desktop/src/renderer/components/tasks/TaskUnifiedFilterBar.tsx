import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  X,
  Users,
  Calendar,
  Tag,
  RotateCw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  UnifiedTaskFilters,
  defaultUnifiedTaskFilters,
  serializeUnifiedFiltersToQuery,
  persistUnifiedFilters,
} from './taskFilterEngine';

export interface TeamMember {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
}

export interface TaskUnifiedFilterBarProps {
  filters: UnifiedTaskFilters;
  onFiltersChange: (filters: UnifiedTaskFilters) => void;
  users?: TeamMember[];
  totalCount?: number;
  filteredCount?: number;
  className?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const TaskUnifiedFilterBar: React.FC<TaskUnifiedFilterBarProps> = ({
  filters,
  onFiltersChange,
  users = [],
  totalCount,
  filteredCount,
  className = '',
  onRefresh,
  isLoading = false,
}) => {
  const [tagInput, setTagInput] = useState(filters.tag && filters.tag !== 'all' ? filters.tag : '');

  // Synchronize internal tagInput with filters
  useEffect(() => {
    setTagInput(filters.tag && filters.tag !== 'all' ? filters.tag : '');
  }, [filters.tag]);

  // Helper to update individual filter keys
  const updateFilter = useCallback(
    (key: keyof UnifiedTaskFilters, value: string) => {
      const next: UnifiedTaskFilters = { ...filters, [key]: value };
      persistUnifiedFilters(next);
      onFiltersChange(next);

      // In Desktop: sync with URL hash or search
      try {
        const queryStr = serializeUnifiedFiltersToQuery(next);
        const hash = window.location.hash || '#/tasks';
        const baseHash = hash.split('?')[0];
        window.location.hash = `${baseHash}${queryStr}`;
      } catch {}
    },
    [filters, onFiltersChange]
  );

  // Date range presets
  const handleDatePreset = (preset: 'all' | 'today' | '7days' | '30days') => {
    const today = new Date().toISOString().slice(0, 10);
    if (preset === 'all') {
      const next: UnifiedTaskFilters = { ...filters, dueDateFrom: '', dueDateTo: '' };
      persistUnifiedFilters(next);
      onFiltersChange(next);
      return;
    }
    if (preset === 'today') {
      const next: UnifiedTaskFilters = { ...filters, dueDateFrom: today, dueDateTo: today };
      persistUnifiedFilters(next);
      onFiltersChange(next);
      return;
    }
    if (preset === '7days') {
      const past = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const next: UnifiedTaskFilters = { ...filters, dueDateFrom: past, dueDateTo: today };
      persistUnifiedFilters(next);
      onFiltersChange(next);
      return;
    }
    if (preset === '30days') {
      const past = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const next: UnifiedTaskFilters = { ...filters, dueDateFrom: past, dueDateTo: today };
      persistUnifiedFilters(next);
      onFiltersChange(next);
      return;
    }
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search.trim()) count++;
    if (filters.assignedTo && filters.assignedTo !== 'all') count++;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.priority && filters.priority !== 'all') count++;
    if (filters.dueDateFrom || filters.dueDateTo) count++;
    if (filters.tag && filters.tag !== 'all') count++;
    return count;
  }, [filters]);

  const handleReset = () => {
    persistUnifiedFilters(defaultUnifiedTaskFilters);
    onFiltersChange(defaultUnifiedTaskFilters);
    try {
      const hash = window.location.hash || '#/tasks';
      const baseHash = hash.split('?')[0];
      window.location.hash = baseHash;
    } catch {}
  };

  return (
    <div
      className={`rounded-xl border border-white/10 bg-black/40 p-2.5 shadow-sm backdrop-blur-md transition-all ${className}`}
      dir="rtl"
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* 1. Fast Omnisearch Text Input */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="بحث بالعنوان، الوصف، المكلف، كود المهمة #id..."
            className="h-8 w-full rounded-lg border border-white/10 bg-white/5 pr-8 pl-7 text-xs text-white placeholder:text-gray-500 focus:border-indigo-500 focus:bg-white/10 focus:outline-none"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => updateFilter('search', '')}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              title="مسح البحث"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* 2. Team Member (Assigned User) Filter Dropdown */}
        <div className="flex items-center gap-1">
          <Users className="size-4 text-gray-400" />
          <select
            value={filters.assignedTo}
            onChange={(e) => updateFilter('assignedTo', e.target.value)}
            className="h-8 rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-medium text-white focus:border-indigo-500 focus:outline-none"
            title="تصفية حسب المسؤول"
          >
            <option value="all" className="bg-gray-900 text-white">كافة أعضاء الفريق</option>
            {users.map((u) => {
              const displayName =
                u.name ||
                `${u.firstName || ''} ${u.lastName || ''}`.trim() ||
                u.id;
              return (
                <option key={u.id} value={u.id} className="bg-gray-900 text-white">
                  {displayName}
                </option>
              );
            })}
          </select>
        </div>

        {/* 3. Status Filter Dropdown */}
        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="h-8 rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-medium text-white focus:border-indigo-500 focus:outline-none"
          title="تصفية حسب الحالة"
        >
          <option value="all" className="bg-gray-900 text-white">كافة الحالات</option>
          <option value="pending" className="bg-gray-900 text-white">في الانتظار</option>
          <option value="in_progress" className="bg-gray-900 text-white">قيد التنفيذ</option>
          <option value="in_review" className="bg-gray-900 text-white">بانتظار المراجعة</option>
          <option value="revision" className="bg-gray-900 text-white">تحتاج مراجعة</option>
          <option value="completed" className="bg-gray-900 text-white">مكتملة</option>
          <option value="cancelled" className="bg-gray-900 text-white">ملغاة</option>
        </select>

        {/* 4. Priority Filter Dropdown */}
        <select
          value={filters.priority}
          onChange={(e) => updateFilter('priority', e.target.value)}
          className="h-8 rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-medium text-white focus:border-indigo-500 focus:outline-none"
          title="تصفية حسب الأولوية"
        >
          <option value="all" className="bg-gray-900 text-white">كافة الأولويات</option>
          <option value="urgent" className="bg-gray-900 text-white">عاجل 🚨</option>
          <option value="high" className="bg-gray-900 text-white">عالي ⚡</option>
          <option value="medium" className="bg-gray-900 text-white">متوسط</option>
          <option value="low" className="bg-gray-900 text-white">منخفض</option>
        </select>

        {/* 5. Date Filter */}
        <div className="flex items-center gap-1">
          <Calendar className="size-4 text-gray-400" />
          <select
            value={
              !filters.dueDateFrom && !filters.dueDateTo
                ? 'all'
                : filters.dueDateFrom === filters.dueDateTo && filters.dueDateFrom === new Date().toISOString().slice(0, 10)
                ? 'today'
                : 'custom'
            }
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'all' || val === 'today') {
                handleDatePreset(val);
              }
            }}
            className="h-8 rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-medium text-white focus:border-indigo-500 focus:outline-none"
            title="تصفية حسب الموعد"
          >
            <option value="all" className="bg-gray-900 text-white">كافة المواعيد</option>
            <option value="today" className="bg-gray-900 text-white">اليوم</option>
            <option value="custom" className="bg-gray-900 text-white">مخصص...</option>
          </select>

          {/* Quick Date Inputs if custom */}
          {(filters.dueDateFrom || filters.dueDateTo) && (
            <div className="flex items-center gap-1 text-xs">
              <input
                type="date"
                value={filters.dueDateFrom}
                onChange={(e) => updateFilter('dueDateFrom', e.target.value)}
                className="h-8 rounded-lg border border-white/10 bg-white/5 px-1 text-[11px] text-white focus:outline-none"
                title="من تاريخ"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={filters.dueDateTo}
                onChange={(e) => updateFilter('dueDateTo', e.target.value)}
                className="h-8 rounded-lg border border-white/10 bg-white/5 px-1 text-[11px] text-white focus:outline-none"
                title="إلى تاريخ"
              />
            </div>
          )}
        </div>

        {/* 6. Tag Filter */}
        <div className="relative flex items-center">
          <Tag className="pointer-events-none absolute right-2 size-3.5 text-gray-400" />
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateFilter('tag', tagInput.trim() || 'all');
              }
            }}
            onBlur={() => {
              if (tagInput.trim() !== (filters.tag === 'all' ? '' : filters.tag)) {
                updateFilter('tag', tagInput.trim() || 'all');
              }
            }}
            placeholder="التاجات..."
            className="h-8 w-24 rounded-lg border border-white/10 bg-white/5 pr-6 pl-2 text-xs text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none sm:w-28"
            title="اضغط Enter للتطبيق"
          />
        </div>

        {/* 7. Reset Button */}
        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
            title="تصفير كل الفلاتر"
          >
            <X className="size-3.5" />
            <span>تصفير</span>
          </button>
        )}

        {/* 8. Refresh Button */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RotateCw className={`size-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        )}

        {/* 9. Result Count Badge */}
        {filteredCount !== undefined && (
          <div className="mr-auto flex items-center gap-1 text-xs text-gray-400">
            <span className="font-semibold text-white tabular-nums">{filteredCount}</span>
            {totalCount !== undefined && totalCount !== filteredCount && (
              <span>من أصل <span className="tabular-nums">{totalCount}</span></span>
            )}
            <span>مهمة</span>
          </div>
        )}
      </div>
    </div>
  );
};
