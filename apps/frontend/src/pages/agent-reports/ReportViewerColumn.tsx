import React from 'react';
import {
  Download,
  ExternalLink,
  Copy,
  Calendar,
  HardDrive,
  FileText,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { AgentReportDetail } from '../../services/agentReportsService';

interface ReportViewerColumnProps {
  report: AgentReportDetail | null;
  loading: boolean;
  onCopyLink: (report: AgentReportDetail) => void;
  onDownload: (report: AgentReportDetail) => void;
  onOpenNewTab: (report: AgentReportDetail) => void;
}

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const ReportViewerColumn: React.FC<ReportViewerColumnProps> = ({
  report,
  loading,
  onCopyLink,
  onDownload,
  onOpenNewTab,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white items-center justify-center p-8 select-none">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium">جاري تحميل محتوى التقرير…</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col h-full bg-slate-50/40 items-center justify-center p-8 text-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-400 mb-3">
          <FileText className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">لم يتم اختيار أي تقرير</h3>
        <p className="text-xs text-slate-400 max-w-sm">
          اختر تقريراً من القائمة الوسطى لاستعراض محتواه بالكامل في عارض HTML المعزول.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-800 truncate" title={report.title}>
                {report.title}
              </h1>
              {report.periodLabel && (
                <span className="shrink-0 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full tabular-nums border border-slate-200/60">
                  {report.periodLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
              <span className="tabular-nums">{formatBytes(report.sizeBytes)}</span>
              <span>•</span>
              <span className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]">
                {report.slug}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onCopyLink(report)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/80 shadow-2xs"
            title="نسخ رابط HTML خام"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">نسخ الرابط</span>
          </button>
          <button
            onClick={() => onDownload(report)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/80 shadow-2xs"
            title="تحميل كملف HTML"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تحميل</span>
          </button>
          <button
            onClick={() => onOpenNewTab(report)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors border border-primary/20 shadow-2xs"
            title="فتح في نافذة مستقلة"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">فتح في تاب</span>
          </button>
        </div>
      </div>

      {/* HTML Viewer (Sandboxed Iframe) */}
      <div className="flex-1 w-full h-full min-h-0 bg-slate-100 relative">
        <iframe
          srcDoc={report.html}
          sandbox=""
          className="w-full h-full border-0 bg-white"
          title={report.title}
        />
      </div>
    </div>
  );
};
