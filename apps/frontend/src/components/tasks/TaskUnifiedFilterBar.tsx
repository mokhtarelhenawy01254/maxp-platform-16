import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  TagIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import {
  UnifiedTaskFilters,
  defaultUnifiedTaskFilters,
  serializeUnifiedFiltersToQuery,
  persistUnifiedFilters,
} from './taskFilterEngine';
import { AdvancedSearch, SearchFilters } from './AdvancedSearch';
import { buildApiUrl } from '../../utils/urlHelper';
import tokenManager from '../../utils/tokenManager';

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
  users: propUsers,
  totalCount,
  filteredCount,
  className = '',
  onRefresh,
  isLoading = false,
}) => {
  const [internalUsers, setInternalUsers] = useState<TeamMember[]>([]);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const [tagInput, setTagInput] = useState(filters.tag && filters.tag !== 'all' ? filters.tag : '');

  // Synchronize internal tagInput with filters
  useEffect(() => {
    setTagInput(filters.tag && filters.tag !== 'all' ? filters.tag : '');
  }, [filters.tag]);

  // Fetch company users if not provided through props
  useEffect(() => {
    if (propUsers && propUsers.length > 0) return;
    let isCancelled = false;
    const fetchUsers = async () => {
      try {
        const token = tokenManager.getAccessToken();
        if (!token) return;
        const res = await fetch(buildApiUrl('tasks/company-users'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data) && !isCancelled) {
            setInternalUsers(data.data);
          }
        }
      } catch (err) {
        console.warn('[TaskUnifiedFilterBar] Failed to load company users:', err);
      }
    };
    fetchUsers();
    return () => {
      isCancelled = true;
    };
  }, [propUsers]);

  const teamList = useMemo(() => {
    return (propUsers && propUsers.length > 0) ? propUsers : internalUsers;
  }, [propUsers, internalUsers]);

  // Helper to update individual filter keys
  const updateFilter = useCallback(
    (key: keyof UnifiedTaskFilters, value: string) => {
      const next: UnifiedTaskFilters = { ...filters, [key]: value };
      persistUnifiedFilters(next);
      onFiltersChange(next);

      // Sync with URL params without page reload
      try {
        const queryStr = serializeUnifiedFiltersToQuery(next, new URLSearchParams(window.location.search));
        const newUrl = `${window.location.pathname}${queryStr}${window.location.hash}`;
        window.history.replaceState(null, '', newUrl);
      } catch {}
    },
    [filters, onFiltersChange]
  );

  // Date range preset handlers
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
      const queryStr = serializeUnifiedFiltersToQuery(defaultUnifiedTaskFilters, new URLSearchParams(window.location.search));
      const newUrl = `${window.location.pathname}${queryStr}${window.location.hash}`;
      window.history.replaceState(null, '', newUrl);
    } catch {}
  };

  // Convert unified filters to AdvancedSearch format when opening modal
  const advancedSearchInitial = useMemo<Partial<SearchFilters>>(() => {
    return {
      query: filters.search,
      assignedTo: filters.assignedTo !== 'all' ? filters.assignedTo : '',
      status: filters.status !== 'all' ? [filters.status] : [],
      priority: filters.priority !== 'all' ? [filters.priority] : [],
      dueDateFrom: filters.dueDateFrom,
      dueDateTo: filters.dueDateTo,
      tags: filters.tag !== 'all' && filters.tag.trim() ? [filters.tag.trim()] : [],
    };
  }, [filters]);

  // Handle when search is triggered inside AdvancedSearch modal
  const handleAdvancedSearchSubmit = (modalFilters: SearchFilters) => {
    const next: UnifiedTaskFilters = {
      search: modalFilters.query || '',
      assignedTo: modalFilters.assignedTo || 'all',
      status: modalFilters.status.length > 0 ? modalFilters.status[0] : 'all',
      priority: modalFilters.priority.length > 0 ? modalFilters.priority[0] : 'all',
      dueDateFrom: modalFilters.dueDateFrom || '',
      dueDateTo: modalFilters.dueDateTo || '',
      tag: modalFilters.tags.length > 0 ? modalFilters.tags[0] : 'all',
    };
    persistUnifiedFilters(next);
    onFiltersChange(next);
    setIsAdvancedModalOpen(false);

    try {
      const queryStr = serializeUnifiedFiltersToQuery(next, new URLSearchParams(window.location.search));
      const newUrl = `${window.location.pathname}${queryStr}${window.location.hash}`;
      window.history.replaceState(null, '', newUrl);
    } catch {}
  };

  return (
    <div
      className={`relative rounded-xl border border-border/70 bg-card/80 p-2.5 shadow-sm backdrop-blur-sm transition-all ${className}`}
      dir="rtl"
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* 1. Fast Omnisearch Text Input */}
        <div className="relative min-w-[200px] flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="بحث بالعنوان، الوصف، المكلف، كود المهمة #id..."
            className="h-8 w-full rounded-lg border border-border/60 bg-background/90 pr-8 pl-7 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => updateFilter('search', '')}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title="مسح البحث"
            >
              <XMarkIcon className="size-3.5" />
            </button>
          )}
        </div>

        {/* 2. Team Member (Assigned User) Filter Dropdown */}
        <div className="flex items-center gap-1">
          <UserGroupIcon className="size-4 text-muted-foreground/70" />
          <select
            value={filters.assignedTo}
            onChange={(e) => updateFilter('assignedTo', e.target.value)}
            className="h-8 rounded-lg border border-border/60 bg-background/90 px-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            title="تصفية حسب المسؤول"
          >
            <option value="all">كافة أعضاء الفريق</option>
            {teamList.map((u) => {
              const displayName =
                u.name ||
                `${u.firstName || ''} ${u.lastName || ''}`.trim() ||
                u.id;
              return (
                <option key={u.id} value={u.id}>
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
          className="h-8 rounded-lg border border-border/60 bg-background/90 px-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
          title="تصفية حسب الحالة"
        >
          <option value="all">كافة الحالات</option>
          <option value="pending">في الانتظار</option>
          <option value="in_progress">قيد التنفيذ</option>
          <option value="in_review">بانتظار المراجعة</option>
          <option value="revision">تحتاج مراجعة</option>
          <option value="completed">مكتملة</option>
          <option value="cancelled">ملغاة</option>
        </select>

        {/* 4. Priority Filter Dropdown */}
        <select
          value={filters.priority}
          onChange={(e) => updateFilter('priority', e.target.value)}
          className="h-8 rounded-lg border border-border/60 bg-background/90 px-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
          title="تصفية حسب الأولوية"
        >
          <option value="all">كافة الأولويات</option>
          <option value="urgent">عاجل 🚨</option>
          <option value="high">عالي ⚡</option>
          <option value="medium">متوسط</option>
          <option value="low">منخفض</option>
        </select>

        {/* 5. Date Filter (Quick range or custom) */}
        <div className="flex items-center gap-1">
          <CalendarDaysIcon className="size-4 text-muted-foreground/70" />
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
            className="h-8 rounded-lg border border-border/60 bg-background/90 px-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            title="تصفية حسب الموعد"
          >
            <option value="all">كافة المواعيد</option>
            <option value="today">اليوم</option>
            <option value="custom">مخصص...</option>
          </select>

          {/* Quick Date Inputs if custom */}
          {(filters.dueDateFrom || filters.dueDateTo) && (
            <div className="flex items-center gap-1 text-xs">
              <input
                type="date"
                value={filters.dueDateFrom}
                onChange={(e) => updateFilter('dueDateFrom', e.target.value)}
                className="h-8 rounded-lg border border-border/60 bg-background/90 px-1 text-[11px] text-foreground focus:outline-none"
                title="من تاريخ"
              />
              <span className="text-muted-foreground">-</span>
              <input
                type="date"
                value={filters.dueDateTo}
                onChange={(e) => updateFilter('dueDateTo', e.target.value)}
                className="h-8 rounded-lg border border-border/60 bg-background/90 px-1 text-[11px] text-foreground focus:outline-none"
                title="إلى تاريخ"
              />
            </div>
          )}
        </div>

        {/* 6. Tag Filter */}
        <div className="relative flex items-center">
          <TagIcon className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground/70" />
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
            className="h-8 w-24 rounded-lg border border-border/60 bg-background/90 pr-6 pl-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none sm:w-28"
            title="اضغط Enter للتطبيق"
          />
        </div>

        {/* 7. Advanced Search Button */}
        <button
          type="button"
          onClick={() => setIsAdvancedModalOpen(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/70 bg-secondary/30 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          title="فتح البحث المتقدم الكامل"
        >
          <AdjustmentsHorizontalIcon className="size-3.5 text-primary" />
          <span>بحث متقدم</span>
          {activeFiltersCount > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* 8. Reset Button */}
        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-500/20 dark:text-rose-400"
            title="تصفير كل الفلاتر"
          >
            <XMarkIcon className="size-3.5" />
            <span>تصفير</span>
          </button>
        )}

        {/* 9. Refresh Button */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            title="تحديث البيانات"
          >
            <ArrowPathIcon className={`size-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </button>
        )}

        {/* 10. Result Count Badge */}
        {filteredCount !== undefined && (
          <div className="mr-auto flex items-center gap-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{filteredCount}</span>
            {totalCount !== undefined && totalCount !== filteredCount && (
              <span>من أصل <span className="tabular-nums">{totalCount}</span></span>
            )}
            <span>مهمة</span>
          </div>
        )}
      </div>

      {/* Advanced Search Modal Connection */}
      {isAdvancedModalOpen && (
        <AdvancedSearch
          initialFilters={advancedSearchInitial}
          onSearch={handleAdvancedSearchSubmit}
          onClose={() => setIsAdvancedModalOpen(false)}
        />
      )}
    </div>
  );
};
