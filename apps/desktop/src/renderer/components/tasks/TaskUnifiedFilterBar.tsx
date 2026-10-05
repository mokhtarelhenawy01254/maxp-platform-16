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
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        padding: '8px 12px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 10,
        marginBottom: 8,
        width: '100%',
        boxSizing: 'border-box',
      }}
      dir="rtl"
    >
      {/* 1. Fast Omnisearch Text Input */}
      <div style={{ position: 'relative', minWidth: 200, flex: 1, display: 'flex', alignItems: 'center' }}>
        <Search
          size={14}
          color="var(--text-muted)"
          style={{ position: 'absolute', right: 10, pointerEvents: 'none' }}
        />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          placeholder="بحث بالعنوان، الوصف، المكلف، كود المهمة #id..."
          style={{
            width: '100%',
            height: 32,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 7,
            padding: '4px 30px 4px 10px',
            fontSize: 11.5,
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => updateFilter('search', '')}
            style={{
              position: 'absolute',
              left: 8,
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="مسح البحث"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* 2. Team Member (Assigned User) Filter Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Users size={14} color="var(--text-muted)" />
        <select
          value={filters.assignedTo}
          onChange={(e) => updateFilter('assignedTo', e.target.value)}
          style={{
            height: 32,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 7,
            padding: '4px 8px',
            fontSize: 11.5,
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            outline: 'none',
            cursor: 'pointer',
          }}
          title="تصفية حسب المسؤول"
        >
          <option value="all">كافة أعضاء الفريق</option>
          {users.map((u) => {
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
        style={{
          height: 32,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 7,
          padding: '4px 8px',
          fontSize: 11.5,
          color: 'var(--text-primary)',
          fontFamily: 'inherit',
          outline: 'none',
          cursor: 'pointer',
        }}
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
        style={{
          height: 32,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 7,
          padding: '4px 8px',
          fontSize: 11.5,
          color: 'var(--text-primary)',
          fontFamily: 'inherit',
          outline: 'none',
          cursor: 'pointer',
        }}
        title="تصفية حسب الأولوية"
      >
        <option value="all">كافة الأولويات</option>
        <option value="urgent">عاجل</option>
        <option value="high">عالي</option>
        <option value="medium">متوسط</option>
        <option value="low">منخفض</option>
      </select>

      {/* 5. Date Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Calendar size={14} color="var(--text-muted)" />
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
          style={{
            height: 32,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 7,
            padding: '4px 8px',
            fontSize: 11.5,
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            outline: 'none',
            cursor: 'pointer',
          }}
          title="تصفية حسب الموعد"
        >
          <option value="all">كافة المواعيد</option>
          <option value="today">اليوم</option>
          <option value="custom">مخصص...</option>
        </select>

        {/* Quick Date Inputs if custom */}
        {(filters.dueDateFrom || filters.dueDateTo) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="date"
              value={filters.dueDateFrom}
              onChange={(e) => updateFilter('dueDateFrom', e.target.value)}
              style={{
                height: 32,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 7,
                padding: '2px 6px',
                fontSize: 11,
                color: 'var(--text-primary)',
                outline: 'none',
              }}
              title="من تاريخ"
            />
            <span style={{ color: 'var(--text-muted)' }}>-</span>
            <input
              type="date"
              value={filters.dueDateTo}
              onChange={(e) => updateFilter('dueDateTo', e.target.value)}
              style={{
                height: 32,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 7,
                padding: '2px 6px',
                fontSize: 11,
                color: 'var(--text-primary)',
                outline: 'none',
              }}
              title="إلى تاريخ"
            />
          </div>
        )}
      </div>

      {/* 6. Tag Filter */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Tag size={13} color="var(--text-muted)" style={{ position: 'absolute', right: 8, pointerEvents: 'none' }} />
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
          style={{
            height: 32,
            width: 100,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 7,
            padding: '4px 26px 4px 8px',
            fontSize: 11.5,
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            outline: 'none',
          }}
          title="اضغط Enter للتطبيق"
        />
      </div>

      {/* 7. Reset Button */}
      {activeFiltersCount > 0 && (
        <button
          type="button"
          onClick={handleReset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            height: 32,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 7,
            padding: '0 10px',
            fontSize: 11,
            color: '#f87171',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
          title="تصفير كل الفلاتر"
        >
          <X size={13} />
          <span>تصفير</span>
        </button>
      )}

      {/* 8. Refresh Button */}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 7,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
          title="تحديث البيانات"
        >
          <RotateCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>
      )}

      {/* 9. Result Count Badge */}
      {filteredCount !== undefined && (
        <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{filteredCount}</strong>
          {totalCount !== undefined && totalCount !== filteredCount && (
            <span>من أصل <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{totalCount}</strong></span>
          )}
          <span>مهمة</span>
        </div>
      )}
    </div>
  );
};
