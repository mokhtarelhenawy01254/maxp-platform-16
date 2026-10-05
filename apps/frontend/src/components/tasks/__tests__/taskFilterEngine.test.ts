import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  matchesUnifiedFilter,
  filterTasksWithUnifiedEngine,
  parseUnifiedFiltersFromUrl,
  serializeUnifiedFiltersToQuery,
  defaultUnifiedTaskFilters,
  UnifiedTaskFilters,
} from '../taskFilterEngine';

describe('Unified Task Filter Engine — Web & Desktop Parity Suite', () => {
  const sampleTasks = [
    {
      id: 'task-101-marketing',
      title: 'مراجعة حملات الفيسبوك وسناب',
      description: 'تدقيق الميزانية وإعادة ضبط الاستهداف للأعياد',
      assignedTo: 'usr-ahmed',
      assignedToId: 'usr-ahmed',
      assignee: { firstName: 'أحمد', lastName: 'علي', email: 'ahmed@maxp.online' },
      creator: { firstName: 'شادي', lastName: 'محمود', email: 'shady@maxp.online' },
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      tags: ['marketing', 'campaigns', 'urgent'],
      dueDate: '2026-10-06T18:00:00.000Z',
      createdAt: '2026-10-01T10:00:00.000Z',
      projectName: 'متجر سوان',
    },
    {
      id: 'task-102-design',
      title: 'تصميم بنرات إنستغرام لمنتجات الخريف',
      description: 'أبعاد 1080x1080 لجميع المنتجات الجديدة',
      assignedTo: 'usr-sara',
      assignedToId: 'usr-sara',
      assignee: { firstName: 'سارة', lastName: 'محمد', email: 'sara@maxp.online' },
      creator: { firstName: 'أحمد', lastName: 'علي', email: 'ahmed@maxp.online' },
      status: 'COMPLETED',
      priority: 'LOW',
      tags: ['design', 'social'],
      dueDate: '2026-10-04T12:00:00.000Z',
      createdAt: '2026-10-02T10:00:00.000Z',
      projectName: 'متجر سوان',
    },
    {
      id: 'task-103-finance',
      title: 'مراجعة تقرير المبيعات والأرباح',
      description: 'مقارنة إيرادات شوبيفاي مع بوابات الدفع',
      assignedTo: 'usr-ahmed',
      assignedToId: 'usr-ahmed',
      assignee: { firstName: 'أحمد', lastName: 'علي', email: 'ahmed@maxp.online' },
      creator: { firstName: 'مختار', lastName: 'سليمان', email: 'mokhtar@maxp.online' },
      status: 'IN_REVIEW',
      priority: 'URGENT',
      tags: ['finance', 'audit'],
      dueDate: '2026-10-07T15:00:00.000Z',
      createdAt: '2026-10-03T10:00:00.000Z',
      projectName: 'المالية',
    },
    {
      id: 'task-104-dev',
      title: 'تطوير كود الفلتر الموحد للشاشات السبع',
      description: 'إصلاح البحث المتعدد وفلتر المستخدم في الويب والديسكتوب',
      assignedTo: 'usr-mahmoud',
      assignedToId: 'usr-mahmoud',
      assignee: { firstName: 'محمود', lastName: 'حسن', email: 'mahmoud@maxp.online' },
      creator: { firstName: 'أحمد', lastName: 'علي', email: 'ahmed@maxp.online' },
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      tags: ['frontend', 'bugfix', 'core'],
      dueDate: '2026-10-06T18:00:00.000Z',
      createdAt: '2026-10-04T10:00:00.000Z',
      projectName: 'منصة MaxP',
    },
  ];

  // 1. Acceptance Criterion: Employee name + title word
  it('Criterion 1: finds a task by typing employee name + title word (أحمد مراجعة)', () => {
    const filters: UnifiedTaskFilters = {
      ...defaultUnifiedTaskFilters,
      search: 'أحمد مراجعة',
    };
    const results = filterTasksWithUnifiedEngine(sampleTasks, filters);
    // Both 101 and 103 are assigned to Ahmed AND have 'مراجعة' in title
    expect(results.length).toBe(2);
    expect(results.map((t) => t.id)).toEqual(['task-101-marketing', 'task-103-finance']);
  });

  // 2. Acceptance Criterion: Search by ID code fragment
  it('Criterion 2: finds a task by partial task id/code (103 or marketing)', () => {
    const filterId: UnifiedTaskFilters = {
      ...defaultUnifiedTaskFilters,
      search: '103',
    };
    const resultsId = filterTasksWithUnifiedEngine(sampleTasks, filterId);
    expect(resultsId.length).toBe(1);
    expect(resultsId[0].id).toBe('task-103-finance');

    const filterCode: UnifiedTaskFilters = {
      ...defaultUnifiedTaskFilters,
      search: 'marketing',
    };
    const resultsCode = filterTasksWithUnifiedEngine(sampleTasks, filterCode);
    expect(resultsCode.length).toBe(1);
    expect(resultsCode[0].id).toBe('task-101-marketing');
  });

  // 3. User filter dropdown + Status/Priority
  it('Criterion 3: filters precisely by assigned team member dropdown + priority', () => {
    const filterUserUrgent: UnifiedTaskFilters = {
      ...defaultUnifiedTaskFilters,
      assignedTo: 'usr-ahmed',
      priority: 'URGENT',
    };
    const results = filterTasksWithUnifiedEngine(sampleTasks, filterUserUrgent);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('task-103-finance');
  });

  // 4. Tag filtering
  it('Criterion 4: filters by specific tag (bugfix)', () => {
    const filterTag: UnifiedTaskFilters = {
      ...defaultUnifiedTaskFilters,
      tag: 'bugfix',
    };
    const results = filterTasksWithUnifiedEngine(sampleTasks, filterTag);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('task-104-dev');
  });

  // 5. Date range filtering (due date bounds)
  it('Criterion 5: filters by dueDate range', () => {
    const filterDate: UnifiedTaskFilters = {
      ...defaultUnifiedTaskFilters,
      dueDateFrom: '2026-10-05',
      dueDateTo: '2026-10-06',
    };
    const results = filterTasksWithUnifiedEngine(sampleTasks, filterDate);
    // 101 and 104 are due on 2026-10-06
    expect(results.length).toBe(2);
    expect(results.map((t) => t.id)).toEqual(['task-101-marketing', 'task-104-dev']);
  });

  // 6. URL search params serialization & deserialization round-trip
  it('Criterion 6: serializes and restores unified filters from URL search params', () => {
    const originalFilters: UnifiedTaskFilters = {
      search: 'حملات سناب',
      assignedTo: 'usr-ahmed',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDateFrom: '2026-10-01',
      dueDateTo: '2026-10-10',
      tag: 'marketing',
    };

    const queryStr = serializeUnifiedFiltersToQuery(originalFilters);
    expect(queryStr).toContain('search=%D8%AD%D9%85%D9%84%D8%A7%D8%AA+%D8%B3%D9%86%D8%A7%D8%A8');
    expect(queryStr).toContain('assignedTo=usr-ahmed');
    expect(queryStr).toContain('status=IN_PROGRESS');

    const restoredFilters = parseUnifiedFiltersFromUrl(queryStr);
    expect(restoredFilters.search).toBe('حملات سناب');
    expect(restoredFilters.assignedTo).toBe('usr-ahmed');
    expect(restoredFilters.status).toBe('IN_PROGRESS');
    expect(restoredFilters.priority).toBe('HIGH');
    expect(restoredFilters.dueDateFrom).toBe('2026-10-01');
    expect(restoredFilters.dueDateTo).toBe('2026-10-10');
    expect(restoredFilters.tag).toBe('marketing');
  });

  // 7. Case-insensitivity & Arabic diacritic flexibility
  it('Criterion 7: search is case-insensitive and whitespace-tolerant', () => {
    const filterMessy: UnifiedTaskFilters = {
      ...defaultUnifiedTaskFilters,
      search: '   فيسبوك   AHMED   ',
    };
    const results = filterTasksWithUnifiedEngine(sampleTasks, filterMessy);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('task-101-marketing');
  });
});
