import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  agentReportsService,
  AgentReportType,
  AgentReportItem,
  AgentReportDetail,
} from '../../services/agentReportsService';
import { ReportTypesColumn } from './ReportTypesColumn';
import { ReportsListColumn } from './ReportsListColumn';
import { ReportViewerColumn } from './ReportViewerColumn';
import { CreateTypeModal } from './CreateTypeModal';
import { UploadReportModal } from './UploadReportModal';

export const AgentReportsPage: React.FC = () => {
  const [types, setTypes] = useState<AgentReportType[]>([]);
  const [selectedType, setSelectedType] = useState<AgentReportType | null>(null);
  const [reports, setReports] = useState<AgentReportItem[]>([]);
  const [activeReport, setActiveReport] = useState<AgentReportDetail | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingViewer, setLoadingViewer] = useState(false);

  // Modals
  const [isCreateTypeOpen, setIsCreateTypeOpen] = useState(false);
  const [isUploadReportOpen, setIsUploadReportOpen] = useState(false);

  // Mobile navigation active tab
  const [mobileTab, setMobileTab] = useState<'types' | 'reports' | 'viewer'>('reports');

  // Track viewport width for desktop vs mobile layout (>= 1024px)
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkWidth = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Load Report Types & auto-select first type with reports + newest report
  const loadTypes = useCallback(async () => {
    setLoadingTypes(true);
    try {
      const data = await agentReportsService.getTypes();
      setTypes(data);

      setSelectedType((curr) => {
        if (curr) return curr;
        if (data.length === 0) return null;
        const typeWithReports = data.find((t) => (t.reportsCount ?? 0) > 0);
        return typeWithReports || data[0];
      });
    } catch (err: unknown) {
      console.error('Failed to load report types:', err);
      toast.error('فشل في تحميل أنواع التقارير');
    } finally {
      setLoadingTypes(false);
    }
  }, []);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  // Load Reports whenever selectedType or searchQuery changes
  const loadReports = useCallback(
    async (typeId: string, q = '') => {
      setLoadingReports(true);
      try {
        const { items } = await agentReportsService.getReports({
          typeId,
          q: q.trim() || undefined,
        });
        setReports(items);

        // Auto-select first report if none selected or if switching types
        if (items.length > 0) {
          const firstReport = items[0];
          setSelectedReportId(firstReport.id);
          // Fetch full report with HTML
          loadReportDetail(firstReport.id);
        } else {
          setSelectedReportId(null);
          setActiveReport(null);
        }
      } catch (err: unknown) {
        console.error('Failed to load reports:', err);
        toast.error('فشل في تحميل قائمة التقارير');
      } finally {
        setLoadingReports(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedType) {
      loadReports(selectedType.id, searchQuery);
    } else {
      setReports([]);
      setSelectedReportId(null);
      setActiveReport(null);
    }
  }, [selectedType, searchQuery, loadReports]);

  // Load full report detail for HTML viewer
  const loadReportDetail = async (reportId: string) => {
    setLoadingViewer(true);
    try {
      const detail = await agentReportsService.getReportById(reportId);
      setActiveReport(detail);
      setSelectedReportId(reportId);
    } catch (err: unknown) {
      console.error('Failed to load report detail:', err);
      toast.error('فشل في تحميل محتوى التقرير');
    } finally {
      setLoadingViewer(false);
    }
  };

  const handleSelectType = (type: AgentReportType) => {
    setSelectedType(type);
    setMobileTab('reports');
  };

  const handleSelectReport = (report: AgentReportItem) => {
    setSelectedReportId(report.id);
    loadReportDetail(report.id);
    setMobileTab('viewer');
  };

  // Actions
  const handleCopyLink = (report: AgentReportItem | AgentReportDetail) => {
    const rawUrl = agentReportsService.getReportHtmlUrl(report.id);
    const fullUrl = `${window.location.origin}${rawUrl}`;
    navigator.clipboard
      .writeText(fullUrl)
      .then(() => toast.success('تم نسخ رابط التقرير'))
      .catch(() => toast.error('تعذر نسخ الرابط'));
  };

  const handleDownload = (report: AgentReportItem | AgentReportDetail) => {
    const htmlToDownload = (report as AgentReportDetail).html || '';
    if (htmlToDownload) {
      const blob = new Blob([htmlToDownload], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.slug}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      window.open(agentReportsService.getReportHtmlUrl(report.id), '_blank');
    }
  };

  const handleOpenNewTab = (report: AgentReportDetail) => {
    window.open(agentReportsService.getReportHtmlUrl(report.id), '_blank');
  };

  const handleDeleteReport = async (report: AgentReportItem) => {
    if (!window.confirm(`هل أنت متأكد من حذف التقرير «${report.title}»؟`)) {
      return;
    }

    try {
      await agentReportsService.deleteReport(report.id);
      toast.success('تم حذف التقرير بنجاح');

      const nextReports = reports.filter((r) => r.id !== report.id);
      setReports(nextReports);

      // Decrement report count on type
      if (selectedType) {
        setTypes((prev) =>
          prev.map((t) => (t.id === selectedType.id ? { ...t, reportsCount: Math.max(t.reportsCount - 1, 0) } : t)),
        );
      }

      if (selectedReportId === report.id) {
        if (nextReports.length > 0) {
          handleSelectReport(nextReports[0]);
        } else {
          setSelectedReportId(null);
          setActiveReport(null);
        }
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'فشل في حذف التقرير';
      toast.error(errorMsg);
    }
  };

  const handleDeleteType = async (type: AgentReportType) => {
    if (type.reportsCount > 0) {
      toast.error('لا يمكن حذف نوع التقرير لوجود تقارير مرتبطة به');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من حذف نوع التقرير «${type.name}»؟`)) {
      return;
    }

    try {
      await agentReportsService.deleteType(type.id);
      toast.success('تم حذف نوع التقرير بنجاح');
      const nextTypes = types.filter((t) => t.id !== type.id);
      setTypes(nextTypes);

      if (selectedType?.id === type.id) {
        if (nextTypes.length > 0) {
          setSelectedType(nextTypes[0]);
        } else {
          setSelectedType(null);
          setReports([]);
          setActiveReport(null);
        }
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'فشل في حذف نوع التقرير';
      toast.error(errorMsg);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-100" dir="rtl">
      <style>{`
        @media (min-width: 1024px) {
          .ar-mobile-nav {
            display: none !important;
          }
          .ar-col-types {
            display: flex !important;
            width: 224px !important;
            min-width: 224px !important;
            max-width: 224px !important;
            flex-shrink: 0 !important;
          }
          .ar-col-reports {
            display: flex !important;
            width: 256px !important;
            min-width: 256px !important;
            max-width: 256px !important;
            flex-shrink: 0 !important;
          }
          .ar-col-viewer {
            display: flex !important;
            flex: 1 1 0% !important;
            min-width: 480px !important;
            overflow: hidden !important;
          }
        }
        @media (max-width: 1023px) {
          .ar-mobile-nav {
            display: flex !important;
          }
          .ar-col-types, .ar-col-reports, .ar-col-viewer {
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;
          }
          .ar-col-hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Mobile Tab Switcher (< lg / < 1024px) */}
      <div
        className="ar-mobile-nav flex items-center border-b border-slate-200 bg-white px-2 py-1.5 shrink-0"
        style={isDesktop ? { display: 'none' } : { display: 'flex' }}
      >
        <button
          type="button"
          onClick={() => setMobileTab('types')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg text-center transition-colors ${
            mobileTab === 'types' ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-600'
          }`}
        >
          الأنواع ({types.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('reports')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg text-center transition-colors ${
            mobileTab === 'reports' ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-600'
          }`}
        >
          التقارير ({reports.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('viewer')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg text-center transition-colors ${
            mobileTab === 'viewer' ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-600'
          }`}
        >
          عرض التقرير
        </button>
      </div>

      {/* Cockpit Surface - 3 Columns Layout on Desktop */}
      <div className="flex-1 flex flex-row min-h-0 w-full overflow-hidden">
        {/* Column 1: Report Types */}
        <div
          className={`ar-col-types h-full flex flex-col overflow-hidden ${
            !isDesktop && mobileTab !== 'types' ? 'ar-col-hidden' : ''
          }`}
          style={
            isDesktop
              ? { width: 224, minWidth: 224, maxWidth: 224, flexShrink: 0 }
              : !isDesktop && mobileTab !== 'types'
              ? { display: 'none' }
              : { width: '100%', flexShrink: 0 }
          }
        >
          <ReportTypesColumn
            types={types}
            selectedTypeId={selectedType?.id || null}
            onSelectType={handleSelectType}
            onOpenCreateModal={() => setIsCreateTypeOpen(true)}
            onDeleteType={handleDeleteType}
            loading={loadingTypes}
          />
        </div>

        {/* Column 2: Reports List */}
        <div
          className={`ar-col-reports h-full flex flex-col overflow-hidden ${
            !isDesktop && mobileTab !== 'reports' ? 'ar-col-hidden' : ''
          }`}
          style={
            isDesktop
              ? { width: 256, minWidth: 256, maxWidth: 256, flexShrink: 0 }
              : !isDesktop && mobileTab !== 'reports'
              ? { display: 'none' }
              : { width: '100%', flexShrink: 0 }
          }
        >
          <ReportsListColumn
            selectedType={selectedType}
            reports={reports}
            selectedReportId={selectedReportId}
            onSelectReport={handleSelectReport}
            onOpenUploadModal={() => setIsUploadReportOpen(true)}
            onCopyLink={handleCopyLink}
            onDownload={handleDownload}
            onDeleteReport={handleDeleteReport}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            loading={loadingReports}
          />
        </div>

        {/* Column 3: HTML Viewer */}
        <div
          className={`ar-col-viewer h-full flex flex-col overflow-hidden ${
            !isDesktop && mobileTab !== 'viewer' ? 'ar-col-hidden' : ''
          }`}
          style={
            isDesktop
              ? { flex: 1, minWidth: 480, overflow: 'hidden' }
              : !isDesktop && mobileTab !== 'viewer'
              ? { display: 'none' }
              : { width: '100%', flexShrink: 0 }
          }
        >
          <ReportViewerColumn
            report={activeReport}
            loading={loadingViewer}
            onCopyLink={handleCopyLink}
            onDownload={handleDownload}
            onOpenNewTab={handleOpenNewTab}
          />
        </div>
      </div>

      {/* Modals */}
      <CreateTypeModal
        isOpen={isCreateTypeOpen}
        onClose={() => setIsCreateTypeOpen(false)}
        onCreated={(newType) => {
          setTypes((prev) => [...prev, newType]);
          setSelectedType(newType);
        }}
      />

      <UploadReportModal
        isOpen={isUploadReportOpen}
        onClose={() => setIsUploadReportOpen(false)}
        types={types}
        selectedTypeId={selectedType?.id}
        onCreated={(newReport) => {
          setReports((prev) => [newReport, ...prev]);
          setSelectedReportId(newReport.id);
          setActiveReport(newReport);
          // Increment count on type
          setTypes((prev) =>
            prev.map((t) => (t.id === newReport.typeId ? { ...t, reportsCount: t.reportsCount + 1 } : t)),
          );
          setMobileTab('viewer');
        }}
      />
    </div>
  );
};

export default AgentReportsPage;
