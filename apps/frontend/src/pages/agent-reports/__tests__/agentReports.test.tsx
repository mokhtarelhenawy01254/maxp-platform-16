import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AgentReportsPage from '../AgentReportsPage';
import { agentReportsService, AgentReportType, AgentReportItem, AgentReportDetail } from '../../../services/agentReportsService';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, defaultValue?: string) => defaultValue || k,
    i18n: { language: 'ar' },
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../services/agentReportsService', () => ({
  agentReportsService: {
    getTypes: jest.fn(),
    createType: jest.fn(),
    updateType: jest.fn(),
    deleteType: jest.fn(),
    getReports: jest.fn(),
    getReportById: jest.fn(),
    createReport: jest.fn(),
    deleteReport: jest.fn(),
    getReportHtmlUrl: (id: string) => `/api/v1/agent-reports/reports/${id}/html`,
  },
}));

describe('Agent Reports Frontend (Ticket AR-1 & AR-FIX-1)', () => {
  const mockTypes: AgentReportType[] = [
    {
      id: 'type-ai',
      slug: 'ai-update',
      name: 'إبديت الذكاء الاصطناعي',
      description: 'تقارير ونماذج الذكاء الاصطناعي',
      icon: 'sparkles',
      sortOrder: 1,
      isActive: true,
      reportsCount: 2,
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'type-github',
      slug: 'github-daily',
      name: 'الإبديت اليومي للجت هاب',
      description: 'تقارير نشاط المستودعات',
      icon: 'git-commit',
      sortOrder: 2,
      isActive: true,
      reportsCount: 1,
      createdAt: '2026-11-02T00:00:00Z',
      updatedAt: '2026-11-02T00:00:00Z',
    },
  ];

  const mockAiReports: AgentReportItem[] = [
    {
      id: 'rep-ai-2',
      companyId: 'company-1',
      typeId: 'type-ai',
      title: 'تقرير الذكاء الاصطناعي الأسبوعي 44',
      slug: 'ai-update-2026-11-03-ab12cd',
      periodLabel: '2026-11-03',
      summary: 'ملخص مؤشرات أداء النماذج ومعدل دقة الاستجابات الذكية.',
      sizeBytes: 15400,
      status: 'PUBLISHED',
      createdAt: '2026-11-03T10:00:00Z',
      updatedAt: '2026-11-03T10:00:00Z',
      type: { id: 'type-ai', slug: 'ai-update', name: 'إبديت الذكاء الاصطناعي', icon: 'sparkles' },
    },
    {
      id: 'rep-ai-1',
      companyId: 'company-1',
      typeId: 'type-ai',
      title: 'تقرير الذكاء الاصطناعي الأسبوعي 43',
      slug: 'ai-update-2026-10-27-ef34gh',
      periodLabel: '2026-10-27',
      summary: 'ملخص أسبوعي سابق.',
      sizeBytes: 12000,
      status: 'PUBLISHED',
      createdAt: '2026-10-27T10:00:00Z',
      updatedAt: '2026-10-27T10:00:00Z',
      type: { id: 'type-ai', slug: 'ai-update', name: 'إبديت الذكاء الاصطناعي', icon: 'sparkles' },
    },
  ];

  const mockGithubReports: AgentReportItem[] = [
    {
      id: 'rep-gh-1',
      companyId: 'company-1',
      typeId: 'type-github',
      title: 'ملخص الكوميتات اليومي 2026-11-03',
      slug: 'github-daily-2026-11-03-998877',
      periodLabel: '2026-11-03',
      summary: 'تم دمج 12 Pull Request وتحديث 4 حزم.',
      sizeBytes: 8500,
      status: 'PUBLISHED',
      createdAt: '2026-11-03T08:00:00Z',
      updatedAt: '2026-11-03T08:00:00Z',
      type: { id: 'type-github', slug: 'github-daily', name: 'الإبديت اليومي للجت هاب', icon: 'git-commit' },
    },
  ];

  const richHtmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>تقرير أداء النماذج الذكية</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #fafafa; margin: 0; padding: 24px; color: #1e293b; }
    .card { background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 700; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: right; padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>تقرير نماذج الذكاء الاصطناعي الأسبوعي</h1>
    <p>هذا التقرير مستقل ومكتفٍ بذاته يعرض تفاصيل دقيقة حول جودة المخرجات، استهلاك التوكنات، وسرعة الاستجابة.</p>
    <table>
      <thead>
        <tr><th>النموذج</th><th>عدد العمليات</th><th>معدل الدقة</th><th>متوسط التأخير</th></tr>
      </thead>
      <tbody>
        <tr><td>Gemini 2.5 Flash</td><td>4,250</td><td>99.2%</td><td>320ms</td></tr>
        <tr><td>Gemini 2.5 Pro</td><td>1,120</td><td>99.8%</td><td>780ms</td></tr>
        <tr><td>DeepSeek Reasoner</td><td>850</td><td>98.9%</td><td>950ms</td></tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;

  const mockAiReportDetail: AgentReportDetail = {
    ...mockAiReports[0],
    html: richHtmlContent,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (agentReportsService.getTypes as any).mockResolvedValue(mockTypes);
    (agentReportsService.getReports as any).mockImplementation(({ typeId }: { typeId: string }) => {
      if (typeId === 'type-github') {
        return Promise.resolve({ items: mockGithubReports, total: 1 });
      }
      return Promise.resolve({ items: mockAiReports, total: 2 });
    });
    (agentReportsService.getReportById as any).mockResolvedValue(mockAiReportDetail);
  });

  it('Gate 6: Opens page, shows 3 columns, auto-selects first type & newest report, and renders sandboxed iframe with content > 1000 length', async () => {
    render(
      <MemoryRouter>
        <AgentReportsPage />
      </MemoryRouter>,
    );

    // 1. Column 1 (Types): Expect both types to be rendered
    await waitFor(() => {
      expect(screen.getAllByText('إبديت الذكاء الاصطناعي').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('الإبديت اليومي للجت هاب')).toBeInTheDocument();
    });

    // 2. Column 2 (Reports): Expect newest report of first type auto-selected and displayed
    await waitFor(() => {
      expect(screen.getAllByText('تقرير الذكاء الاصطناعي الأسبوعي 44').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('تقرير الذكاء الاصطناعي الأسبوعي 43')).toBeInTheDocument();
    });

    // 3. Column 3 (HTML Viewer): Expect top toolbar to display report title & period
    await waitFor(() => {
      const titles = screen.getAllByText('تقرير الذكاء الاصطناعي الأسبوعي 44');
      expect(titles.length).toBeGreaterThanOrEqual(2); // One in list, one in viewer header
    });

    // 4. Verify iframe properties:
    // - Must have sandbox=""
    // - Must have srcDoc with length > 1000
    const iframe = document.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('sandbox')).toBe('');
    const srcDoc = iframe?.getAttribute('srcdoc') || '';
    expect(srcDoc.length).toBeGreaterThan(1000);
    expect(srcDoc).toContain('تقرير نماذج الذكاء الاصطناعي الأسبوعي');
  });

  it('Gate 7: Switching type in first column updates second column with that types reports', async () => {
    render(
      <MemoryRouter>
        <AgentReportsPage />
      </MemoryRouter>,
    );

    // Initial state: first type is active
    await waitFor(() => {
      expect(screen.getAllByText('تقرير الذكاء الاصطناعي الأسبوعي 44').length).toBeGreaterThanOrEqual(1);
    });

    // Switch type to 'الإبديت اليومي للجت هاب'
    const githubTypeButton = screen.getByText('الإبديت اليومي للجت هاب');
    fireEvent.click(githubTypeButton);

    // Column 2 should update to show github reports
    await waitFor(() => {
      expect(screen.getByText('ملخص الكوميتات اليومي 2026-11-03')).toBeInTheDocument();
    });

    // Ensure AI previous reports are no longer in Column 2
    expect(screen.queryByText('تقرير الذكاء الاصطناعي الأسبوعي 43')).not.toBeInTheDocument();
  });

  it('AR-FIX-1: Enforces guaranteed column widths (224px col1, 256px col2, flex-1 col3) and hides top tabs on desktop (>= 1024px)', async () => {
    // Set window width to 1280px (desktop)
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1280 });

    const { container } = render(
      <MemoryRouter>
        <AgentReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('إبديت الذكاء الاصطناعي').length).toBeGreaterThanOrEqual(1);
    });

    // Mobile tabs must be display: none on desktop
    const mobileNav = container.querySelector('.ar-mobile-nav') as HTMLElement;
    expect(mobileNav).not.toBeNull();
    expect(mobileNav.style.display).toBe('none');

    // Column 1 must have width: 224px (within 200–250px)
    const col1 = container.querySelector('.ar-col-types') as HTMLElement;
    expect(col1).not.toBeNull();
    expect(col1.style.width).toBe('224px');
    expect(col1.style.flexShrink).toBe('0');

    // Column 2 must have width: 256px (within 240–290px)
    const col2 = container.querySelector('.ar-col-reports') as HTMLElement;
    expect(col2).not.toBeNull();
    expect(col2.style.width).toBe('256px');
    expect(col2.style.flexShrink).toBe('0');

    // Column 3 must have flex: 1 and minWidth: 480px
    const col3 = container.querySelector('.ar-col-viewer') as HTMLElement;
    expect(col3).not.toBeNull();
    expect(col3.style.flex).toBe('1');
    expect(col3.style.minWidth).toBe('480px');
  });

  it('AR-FIX-1: Automatically selects first type WITH reports (reportsCount > 0) when the first type in list is empty', async () => {
    const typesWithFirstEmpty: AgentReportType[] = [
      {
        id: 'type-empty-first',
        slug: 'empty-type',
        name: 'نوع فارغ',
        description: 'نوع ليس به أي تقارير',
        icon: 'folder',
        sortOrder: 1,
        isActive: true,
        reportsCount: 0,
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
      {
        id: 'type-has-reports',
        slug: 'active-type',
        name: 'نوع به تقارير',
        description: 'نوع نشط به تقارير',
        icon: 'sparkles',
        sortOrder: 2,
        isActive: true,
        reportsCount: 1,
        createdAt: '2026-11-02T00:00:00Z',
        updatedAt: '2026-11-02T00:00:00Z',
      },
    ];

    (agentReportsService.getTypes as any).mockResolvedValue(typesWithFirstEmpty);
    (agentReportsService.getReports as any).mockImplementation(({ typeId }: { typeId: string }) => {
      if (typeId === 'type-has-reports') {
        return Promise.resolve({ items: mockAiReports, total: 2 });
      }
      return Promise.resolve({ items: [], total: 0 });
    });

    render(
      <MemoryRouter>
        <AgentReportsPage />
      </MemoryRouter>,
    );

    // Expect 'نوع به تقارير' to be auto-selected and its reports loaded
    await waitFor(() => {
      expect(screen.getAllByText('تقرير الذكاء الاصطناعي الأسبوعي 44').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('AR-FIX-1: Displays empty state in columns 2 and 3 when all report types have 0 reports', async () => {
    const allEmptyTypes: AgentReportType[] = [
      {
        id: 'type-empty-1',
        slug: 'empty-1',
        name: 'نوع فارغ 1',
        description: 'نوع 1',
        icon: 'folder',
        sortOrder: 1,
        isActive: true,
        reportsCount: 0,
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
    ];

    (agentReportsService.getTypes as any).mockResolvedValue(allEmptyTypes);
    (agentReportsService.getReports as any).mockResolvedValue({ items: [], total: 0 });

    render(
      <MemoryRouter>
        <AgentReportsPage />
      </MemoryRouter>,
    );

    // Column 2 should show empty reports message
    await waitFor(() => {
      expect(screen.getByText('مفيش تقارير في النوع ده')).toBeInTheDocument();
    });

    // Column 3 should show no report selected message
    expect(screen.getByText('لم يتم اختيار أي تقرير')).toBeInTheDocument();
  });

  it('AR-FIX-1: Mobile viewport (< 1024px) shows mobile navigation and switching tabs toggles columns', async () => {
    // Set viewport width to 420px (mobile)
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 420 });

    const { container } = render(
      <MemoryRouter>
        <AgentReportsPage />
      </MemoryRouter>,
    );

    // Trigger window resize listener
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(screen.getAllByText('إبديت الذكاء الاصطناعي').length).toBeGreaterThanOrEqual(1);
    });

    const mobileNav = container.querySelector('.ar-mobile-nav') as HTMLElement;
    expect(mobileNav).not.toBeNull();
    expect(mobileNav.style.display).toBe('flex');

    const col1 = container.querySelector('.ar-col-types') as HTMLElement;
    const col2 = container.querySelector('.ar-col-reports') as HTMLElement;
    const col3 = container.querySelector('.ar-col-viewer') as HTMLElement;

    const navButtons = mobileNav.querySelectorAll('button');
    expect(navButtons.length).toBe(3);
    const typesTabButton = navButtons[0];
    const reportsTabButton = navButtons[1];
    const viewerTabButton = navButtons[2];

    // Switch to types tab
    fireEvent.click(typesTabButton);

    expect(col1.style.display).not.toBe('none');
    expect(col2.style.display).toBe('none');
    expect(col3.style.display).toBe('none');

    // Switch to reports tab
    fireEvent.click(reportsTabButton);

    expect(col1.style.display).toBe('none');
    expect(col2.style.display).not.toBe('none');
    expect(col3.style.display).toBe('none');

    // Switch to viewer tab
    fireEvent.click(viewerTabButton);

    expect(col1.style.display).toBe('none');
    expect(col2.style.display).toBe('none');
    expect(col3.style.display).not.toBe('none');

    // Reset innerWidth to 1280
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1280 });
  });
});
