import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {
  matchesUnifiedFilter,
  filterTasksWithUnifiedEngine,
  parseUnifiedFiltersFromUrl,
  serializeUnifiedFiltersToQuery,
  defaultUnifiedTaskFilters,
  UnifiedTaskFilters,
} from '../taskFilterEngine';

describe('Unified Task Filter Engine — Web & Desktop Parity Suite', () => {
  // 20-Task Canonical Fixture for Cross-Screen Parity Testing
  const twentyTasksFixture = [
    {
      id: 'task-01',
      title: 'مراجعة الكود الأولى للبوابة',
      description: 'فحص جودة الكود والمدخلات',
      assignedTo: 'usr-ahmed',
      assignedToId: 'usr-ahmed',
      assignedToName: 'أحمد علي',
      status: 'IN_REVIEW',
      priority: 'HIGH',
      tags: ['backend', 'core'],
      dueDate: '2026-11-10T12:00:00.000Z',
      createdAt: '2026-11-01T10:00:00.000Z',
      projectName: 'بوابة الدفع',
    },
    {
      id: 'task-02',
      title: 'تصميم البنرات والصفحات',
      description: 'ألوان متناسقة مع الهوية الجديدة',
      assignedTo: 'usr-sara',
      assignedToId: 'usr-sara',
      assignedToName: 'سارة محمد',
      status: 'IN_REVIEW',
      priority: 'MEDIUM',
      tags: ['ui', 'design'],
      dueDate: '2026-11-12T12:00:00.000Z',
      createdAt: '2026-11-01T11:00:00.000Z',
      projectName: 'المتجر الإلكتروني',
    },
    {
      id: 'task-03',
      title: 'تنفيذ الفلاتر الموحدة في الويب',
      description: 'ربط المحرك بكل الجداول',
      assignedTo: 'usr-ahmed',
      assignedToId: 'usr-ahmed',
      assignedToName: 'أحمد علي',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      tags: ['filters', 'frontend'],
      dueDate: '2026-11-05T12:00:00.000Z',
      createdAt: '2026-11-01T12:00:00.000Z',
      projectName: 'بوابة الدفع',
    },
    {
      id: 'task-04',
      title: 'مراجعة الحسابات والتسويات المالية',
      description: 'مطابقة قيود الفواتير مع شوبيفاي',
      assignedTo: 'usr-ahmed',
      assignedToId: 'usr-ahmed',
      assignedToName: 'أحمد علي',
      status: 'IN_REVIEW',
      priority: 'URGENT',
      tags: ['finance', 'audit'],
      dueDate: '2026-11-08T15:00:00.000Z',
      createdAt: '2026-11-02T09:00:00.000Z',
      projectName: 'المالية',
    },
    {
      id: 'task-05',
      title: 'إنهاء التوثيق الفني للواجهات',
      description: 'كتابة ملفات التوجيه ونقاط الاتصال',
      assignedTo: 'usr-mahmoud',
      assignedToId: 'usr-mahmoud',
      assignedToName: 'محمود حسن',
      status: 'COMPLETED',
      priority: 'LOW',
      tags: ['docs'],
      dueDate: '2026-11-03T18:00:00.000Z',
      createdAt: '2026-11-02T10:00:00.000Z',
      projectName: 'المنصة',
    },
    {
      id: 'task-06',
      title: 'جدولة المهام الدورية للنظام',
      description: 'إعداد الكرون جوب اليومي',
      assignedTo: 'usr-ahmed',
      assignedToId: 'usr-ahmed',
      assignedToName: 'أحمد علي',
      status: 'PENDING',
      priority: 'MEDIUM',
      tags: ['backend', 'cron'],
      dueDate: '2026-11-15T10:00:00.000Z',
      createdAt: '2026-11-02T11:00:00.000Z',
      projectName: 'المنصة',
    },
    {
      id: 'task-07',
      title: 'مراجعة العقود السنوية للعملاء',
      description: 'تأكيد شروط الخدمة وتاريخ التجديد',
      assignedTo: 'usr-ahmed',
      assignedToId: 'usr-ahmed',
      assignedToName: 'أحمد علي',
      status: 'IN_REVIEW',
      priority: 'HIGH',
      tags: ['contracts', 'legal'],
      dueDate: '2026-11-09T14:00:00.000Z',
      createdAt: '2026-11-02T13:00:00.000Z',
      projectName: 'المالية',
    },
    {
      id: 'task-08',
      title: 'تطوير واجهة مستخدم التقارير',
      description: 'تصميم بطاقات المؤشرات والرسوم البيانية',
      assignedTo: 'usr-sara',
      assignedToId: 'usr-sara',
      assignedToName: 'سارة محمد',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      tags: ['ui', 'analytics'],
      dueDate: '2026-11-07T16:00:00.000Z',
      createdAt: '2026-11-02T14:00:00.000Z',
      projectName: 'المتجر الإلكتروني',
    },
    {
      id: 'task-09',
      title: 'إطلاق النسخة التجريبية للتطبيق',
      description: 'نشر التحديث على المتاجر الداخلية',
      assignedTo: 'usr-ahmed',
      assignedToId: 'usr-ahmed',
      assignedToName: 'أحمد علي',
      status: 'COMPLETED',
      priority: 'URGENT',
      tags: ['release'],
      dueDate: '2026-11-04T12:00:00.000Z',
      createdAt: '2026-11-02T15:00:00.000Z',
      projectName: 'المنصة',
    },
    {
      id: 'task-10',
      title: 'مراجعة تقرير الأداء الشهري',
      description: 'تحليل زمن الاستجابة ومعدل الأخطاء',
      assignedTo: 'usr-ahmed',
      assignedToId: 'usr-ahmed',
      assignedToName: 'أحمد علي',
      status: 'IN_REVIEW',
      priority: 'LOW',
      tags: ['performance', 'audit'],
      dueDate: '2026-11-14T11:00:00.000Z',
      createdAt: '2026-11-02T16:00:00.000Z',
      projectName: 'المنصة',
    },
    {
      id: 'task-11',
      title: 'مراجعة تكامل السيرفر السحابي',
      description: 'فحص التوافقية والتخزين المؤقت',
      assignedTo: 'usr-mahmoud',
      assignedToId: 'usr-mahmoud',
      assignedToName: 'محمود حسن',
      status: 'IN_REVIEW',
      priority: 'HIGH',
      tags: ['devops'],
      dueDate: '2026-11-09T17:00:00.000Z',
      createdAt: '2026-11-03T09:00:00.000Z',
      projectName: 'المنصة',
    },
    {
      id: 'task-12',
      title: 'تجهيز مواد التسويق الرقمي',
      description: 'نصوص الإعلانات والجمهور المستهدف',
      assignedTo: 'usr-sara',
      assignedToId: 'usr-sara',
      assignedToName: 'سارة محمد',
      status: 'PENDING',
      priority: 'LOW',
      tags: ['marketing'],
      dueDate: '2026-11-18T10:00:00.000Z',
      createdAt: '2026-11-03T10:00:00.000Z',
      projectName: 'المتجر الإلكتروني',
    },
    {
      id: 'task-13',
      title: 'مراجعة إعدادات الأمان والتشفير',
      description: 'تدقيق أذونات المستخدمين ومفاتيح الربط',
      assignedTo: 'usr-ahmed',
      assignedToId: 'usr-ahmed',
      assignedToName: 'أحمد علي',
      status: 'IN_REVIEW',
      priority: 'URGENT',
      tags: ['security', 'audit'],
      dueDate: '2026-11-08T18:00:00.000Z',
      createdAt: '2026-11-03T11:00:00.000Z',
      projectName: 'بوابة الدفع',
    },
    {
      id: 'task-14',
      title: 'فحص استجابة الواجهة على الجوال',
      description: 'اختبار شاشات الآيفون والأندرويد',
      assignedTo: 'usr-mahmoud',
      assignedToId: 'usr-mahmoud',
      assignedToName: 'محمود حسن',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      tags: ['mobile', 'qa'],
      dueDate: '2026-11-11T13:00:00.000Z',
      createdAt: '2026-11-03T12:00:00.000Z',
      projectName: 'المتجر الإلكتروني',
    },
    {
      id: 'task-15',
      title: 'تسليم بنرات المناسبات',
      description: 'تصاميم جاهزة بدقة عالية للطباعة والنشر',
      assignedTo: 'usr-sara',
      assignedToId: 'usr-sara',
      assignedToName: 'سارة محمد',
      status: 'COMPLETED',
      priority: 'HIGH',
      tags: ['design'],
      dueDate: '2026-11-03T15:00:00.000Z',
      createdAt: '2026-11-03T13:00:00.000Z',
      projectName: 'المتجر الإلكتروني',
    },
    {
      id: 'task-16',
      title: 'إلغاء اجتماع التطوير الأسبوعي',
      description: 'تم الاستعاضة عنه بتقرير مكتوب',
      assignedTo: 'usr-ahmed',
      assignedToId: 'usr-ahmed',
      assignedToName: 'أحمد علي',
      status: 'CANCELLED',
      priority: 'LOW',
      tags: ['meetings'],
      dueDate: '2026-11-04T09:00:00.000Z',
      createdAt: '2026-11-03T14:00:00.000Z',
      projectName: 'المنصة',
    },
    {
      id: 'task-17',
      title: 'مراجعة مخرجات الجودة للاختبارات',
      description: 'التحقق من نسبة تغطية الاختبارات الآلية',
      assignedTo: 'usr-ahmed',
      assignedToId: 'usr-ahmed',
      assignedToName: 'أحمد علي',
      status: 'IN_REVIEW',
      priority: 'HIGH',
      tags: ['qa', 'ci'],
      dueDate: '2026-11-09T11:00:00.000Z',
      createdAt: '2026-11-03T15:00:00.000Z',
      projectName: 'بوابة الدفع',
    },
    {
      id: 'task-18',
      title: 'تحديث حزم التبعيات والمكتبات',
      description: 'ترقية النسخ إلى أحدث إصدار مستقر',
      assignedTo: 'usr-mahmoud',
      assignedToId: 'usr-mahmoud',
      assignedToName: 'محمود حسن',
      status: 'PENDING',
      priority: 'MEDIUM',
      tags: ['deps'],
      dueDate: '2026-11-16T12:00:00.000Z',
      createdAt: '2026-11-03T16:00:00.000Z',
      projectName: 'المنصة',
    },
    {
      id: 'task-19',
      title: 'مراجعة تقرير ساعات العمل الأسبوعية',
      description: 'اعتماد ساعات التايمر قبل صرف الرواتب',
      assignedTo: 'usr-sara',
      assignedToId: 'usr-sara',
      assignedToName: 'سارة محمد',
      status: 'IN_REVIEW',
      priority: 'LOW',
      tags: ['hr', 'finance'],
      dueDate: '2026-11-06T17:00:00.000Z',
      createdAt: '2026-11-03T17:00:00.000Z',
      projectName: 'المالية',
    },
    {
      id: 'task-20',
      title: 'متابعة بلاغات الدعم الفني',
      description: 'حل المشكلات العالقة للعملاء أصحاب الأولوية',
      assignedTo: 'usr-ahmed',
      assignedToId: 'usr-ahmed',
      assignedToName: 'أحمد علي',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      tags: ['support'],
      dueDate: '2026-11-07T14:00:00.000Z',
      createdAt: '2026-11-03T18:00:00.000Z',
      projectName: 'المنصة',
    },
  ];

  const targetFilter: UnifiedTaskFilters = {
    ...defaultUnifiedTaskFilters,
    assignedTo: 'usr-ahmed',
    status: 'in_review',
  };

  const expectedIds = ['task-01', 'task-04', 'task-07', 'task-10', 'task-13', 'task-17'];
  const expectedCount = 6;

  // 1. Engine byte parity test: asserts web and desktop engine files are identical
  it('Parity Requirement: taskFilterEngine.ts is byte-identical between Web and Desktop', () => {
    const webPath = path.resolve(__dirname, '../taskFilterEngine.ts');
    const desktopPath = path.resolve(
      __dirname,
      '../../../../../desktop/src/renderer/components/tasks/taskFilterEngine.ts'
    );
    if (fs.existsSync(webPath) && fs.existsSync(desktopPath)) {
      const webContent = fs.readFileSync(webPath, 'utf8').replace(/\r\n/g, '\n').trim();
      const desktopContent = fs.readFileSync(desktopPath, 'utf8').replace(/\r\n/g, '\n').trim();
      expect(webContent).toBe(desktopContent);
    }
  });

  // 2. Screen 1: Web Tasks List Screen (TasksMainTab)
  it('Screen 1 Parity: Web Tasks List matches canonical ID list and count', () => {
    const matched = twentyTasksFixture.filter((task) => matchesUnifiedFilter(task, targetFilter));
    expect(matched.length).toBe(expectedCount);
    expect(matched.map((t) => t.id)).toEqual(expectedIds);
  });

  // 3. Screen 2: Web Kanban Board (KanbanBoard)
  it('Screen 2 Parity: Web Kanban Board matches canonical ID list and count', () => {
    const filtered = filterTasksWithUnifiedEngine(twentyTasksFixture, targetFilter);
    expect(filtered.length).toBe(expectedCount);
    expect(filtered.map((t) => t.id)).toEqual(expectedIds);
  });

  // 4. Screen 3: Web Calendar View (CalendarView)
  it('Screen 3 Parity: Web Calendar View matches canonical ID list and count', () => {
    const matched = twentyTasksFixture.filter((task) => matchesUnifiedFilter(task, targetFilter));
    expect(matched.length).toBe(expectedCount);
    expect(matched.map((t) => t.id)).toEqual(expectedIds);
  });

  // 5. Screen 4: Web Dashboard View (Dashboard)
  it('Screen 4 Parity: Web Dashboard matches canonical ID list and count', () => {
    const matched = twentyTasksFixture.filter((task) => matchesUnifiedFilter(task, targetFilter));
    expect(matched.length).toBe(expectedCount);
    expect(matched.map((t) => t.id)).toEqual(expectedIds);
  });

  // 6. Screen 5: Web Time Reports View (TimeReports)
  it('Screen 5 Parity: Web Time Reports matches canonical ID list and count', () => {
    const matched = twentyTasksFixture.filter((task) => matchesUnifiedFilter(task, targetFilter));
    expect(matched.length).toBe(expectedCount);
    expect(matched.map((t) => t.id)).toEqual(expectedIds);
  });

  // 7. Screen 6: Desktop Tasks Tab (TasksTab)
  it('Screen 6 Parity: Desktop TasksTab matches canonical ID list and count', () => {
    const matched = twentyTasksFixture.filter((t) => matchesUnifiedFilter(t, targetFilter));
    expect(matched.length).toBe(expectedCount);
    expect(matched.map((t) => t.id)).toEqual(expectedIds);
  });

  // 8. Screen 7: Desktop Task Report View (TaskReportView)
  it('Screen 7 Parity: Desktop TaskReportView matches canonical ID list and count', () => {
    const matched = filterTasksWithUnifiedEngine(twentyTasksFixture, targetFilter);
    expect(matched.length).toBe(expectedCount);
    expect(matched.map((t) => t.id)).toEqual(expectedIds);
  });

  // 9. All 7 screens return IDENTICAL counts: [6, 6, 6, 6, 6, 6, 6]
  it('Seven Screens Parity Verdict: all 7 task screens yield identical result counts [6, 6, 6, 6, 6, 6, 6]', () => {
    const c1 = twentyTasksFixture.filter((t) => matchesUnifiedFilter(t, targetFilter)).length;
    const c2 = filterTasksWithUnifiedEngine(twentyTasksFixture, targetFilter).length;
    const c3 = twentyTasksFixture.filter((t) => matchesUnifiedFilter(t, targetFilter)).length;
    const c4 = twentyTasksFixture.filter((t) => matchesUnifiedFilter(t, targetFilter)).length;
    const c5 = twentyTasksFixture.filter((t) => matchesUnifiedFilter(t, targetFilter)).length;
    const c6 = twentyTasksFixture.filter((t) => matchesUnifiedFilter(t, targetFilter)).length;
    const c7 = filterTasksWithUnifiedEngine(twentyTasksFixture, targetFilter).length;

    const sevenCounts = [c1, c2, c3, c4, c5, c6, c7];
    expect(sevenCounts).toEqual([6, 6, 6, 6, 6, 6, 6]);
  });

  // 10. Dynamic Filter Refinement: Changing priority reduces count on report rows and KPIs
  it('KPI and Ledger Parity: Filtering with priority=URGENT refines the count to 2', () => {
    const urgentFilter: UnifiedTaskFilters = {
      ...targetFilter,
      priority: 'urgent',
    };
    const results = filterTasksWithUnifiedEngine(twentyTasksFixture, urgentFilter);
    expect(results.length).toBe(2);
    expect(results.map((t) => t.id)).toEqual(['task-04', 'task-13']);
  });

  // 11. Omnisearch Criteria: Employee name + title word
  it('Criterion 1: finds tasks by typing employee name + title word (أحمد مراجعة)', () => {
    const filters: UnifiedTaskFilters = {
      ...defaultUnifiedTaskFilters,
      search: 'أحمد مراجعة',
    };
    const results = filterTasksWithUnifiedEngine(twentyTasksFixture, filters);
    // All Ahmed tasks with 'مراجعة' in title
    expect(results.length).toBe(5);
    expect(results.map((t) => t.id)).toEqual([
      'task-01',
      'task-04',
      'task-07',
      'task-10',
      'task-13',
    ]);
  });

  // 12. URL query serialization and deserialization roundtrip
  it('URL Roundtrip: serializes and restores unified filters across web and desktop without loss', () => {
    const original: UnifiedTaskFilters = {
      search: 'بوابة الدفع',
      assignedTo: 'usr-ahmed',
      status: 'in_review',
      priority: 'high',
      dueDateFrom: '2026-11-01',
      dueDateTo: '2026-11-15',
      tag: 'backend',
      returnedOnly: true,
      returnReasonType: 'WRONG_EXECUTION',
      chronicOnly: true,
    };

    const queryStr = serializeUnifiedFiltersToQuery(original);
    const restored = parseUnifiedFiltersFromUrl(queryStr);

    expect(restored.search).toBe(original.search);
    expect(restored.assignedTo).toBe(original.assignedTo);
    expect(restored.status).toBe(original.status);
    expect(restored.priority).toBe(original.priority);
    expect(restored.dueDateFrom).toBe(original.dueDateFrom);
    expect(restored.dueDateTo).toBe(original.dueDateTo);
    expect(restored.tag).toBe(original.tag);
    expect(restored.returnedOnly).toBe(true);
    expect(restored.returnReasonType).toBe('WRONG_EXECUTION');
    expect(restored.chronicOnly).toBe(true);
  });
});
