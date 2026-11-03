import React, { useState, useEffect, useCallback, useTransition } from 'react';
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

  // Load Report Types & auto-select first type + newest report
  const loadTypes = useCallback(async () => {
    setLoadingTypes(true);
    try {
      const data = await agentReportsService.getTypes();
      setTypes(data);

      if (data.length > 0 && !selectedType) {
        setSelectedType(data[0]);
      }
    } catch (err: unknown) {
      console.error('Failed to load report types:', err);
      toast.error('فشل في تحميل أنواع التقارير');
    } finally {
      setLoadingTypes(false);
    }
  }, [selectedType]);

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
      {/* Mobile Tab Switcher (< lg) */}
      <div className="lg:hidden flex items-center border-b border-slate-200 bg-white px-2 py-1.5 shrink-0">
        <button
          onClick={() => setMobileTab('types')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg text-center transition-colors ${
            mobileTab === 'types' ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-600'
          }`}
        >
          الأنواع ({types.length})
        </button>
        <button
          onClick={() => setMobileTab('reports')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg text-center transition-colors ${
            mobileTab === 'reports' ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-600'
          }`}
        >
          التقارير ({reports.length})
        </button>
        <button
          onClick={() => setMobileTab('viewer')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg text-center transition-colors ${
            mobileTab === 'viewer' ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-600'
          }`}
        >
          عرض التقرير
        </button>
      </div>

      {/* Cockpit Surface - 3 Columns Layout on Desktop */}
      <div className="flex-1 flex min-h-0 w-full overflow-hidden">
        {/* Column 1: Report Types */}
        <div
          className={`w-full lg:w-64 xl:w-72 shrink-0 h-full ${
            mobileTab === 'types' ? 'block' : 'hidden lg:block'
          }`}
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
          className={`w-full lg:w-80 xl:w-96 shrink-0 h-full ${
            mobileTab === 'reports' ? 'block' : 'hidden lg:block'
          }`}
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
          className={`flex-1 min-w-0 h-full ${
            mobileTab === 'viewer' ? 'block' : 'hidden lg:block'
          }`}
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
