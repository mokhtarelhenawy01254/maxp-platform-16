import React from 'react';
import {
  Search,
  Upload,
  Calendar,
  HardDrive,
  Copy,
  Download,
  Trash2,
  FileText,
  Clock,
} from 'lucide-react';
import { AgentReportItem, AgentReportType } from '../../services/agentReportsService';

interface ReportsListColumnProps {
  selectedType: AgentReportType | null;
  reports: AgentReportItem[];
  selectedReportId: string | null;
  onSelectReport: (report: AgentReportItem) => void;
  onOpenUploadModal: () => void;
  onCopyLink: (report: AgentReportItem) => void;
  onDownload: (report: AgentReportItem) => void;
  onDeleteReport: (report: AgentReportItem) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  loading: boolean;
}

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

export const ReportsListColumn: React.FC<ReportsListColumnProps> = ({
  selectedType,
  reports,
  selectedReportId,
  onSelectReport,
  onOpenUploadModal,
  onCopyLink,
  onDownload,
  onDeleteReport,
  searchQuery,
  onSearchChange,
  loading,
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-50/60 border-l border-slate-200 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-white">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold text-slate-800 truncate">
            {selectedType?.name || 'التقارير'}
          </h2>
          <p className="text-[10px] text-slate-400 truncate">
            {reports.length} تقرير متاح
          </p>
        </div>
        <button
          onClick={onOpenUploadModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/95 rounded-lg active:scale-[0.98] transition-all shadow-xs"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>رفع تقرير</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-200/70 bg-white">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="بحث بالعنوان، الفترة، أو الملخص…"
            className="w-full pr-8 pl-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-slate-50/40"
          />
        </div>
      </div>

      {/* Reports List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && reports.length === 0 ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-white rounded-xl border border-slate-100 animate-pulse p-3" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-600 mb-1">
              {searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'مفيش تقارير في النوع ده'}
            </p>
            <p className="text-[11px] text-slate-400 mb-3">
              {searchQuery ? 'جرب البحث بكلمات أخرى' : 'يمكنك رفع أول تقرير HTML لهذا النوع الآن'}
            </p>
            {!searchQuery && (
              <button
                onClick={onOpenUploadModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 rounded-lg transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>رفع أول تقرير</span>
              </button>
            )}
          </div>
        ) : (
          reports.map((report) => {
            const isSelected = report.id === selectedReportId;

            return (
              <div
                key={report.id}
                onClick={() => onSelectReport(report)}
                className={`group p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-primary ring-1 ring-primary/20 shadow-xs'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3
                    className={`text-xs font-semibold line-clamp-1 ${
                      isSelected ? 'text-primary' : 'text-slate-800'
                    }`}
                  >
                    {report.title}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyLink(report);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                      title="نسخ رابط التقرير"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(report);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                      title="تحميل ملف HTML"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteReport(report);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="حذف التقرير"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {report.summary && (
                  <p className="text-[11px] text-slate-500 line-clamp-2 mb-2 leading-relaxed">
                    {report.summary}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                  {report.periodLabel && (
                    <span className="flex items-center gap-1 tabular-nums font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {report.periodLabel}
                    </span>
                  )}
                  <span className="flex items-center gap-1 tabular-nums">
                    <HardDrive className="w-3 h-3 text-slate-400" />
                    {formatBytes(report.sizeBytes)}
                  </span>
                  <span className="flex items-center gap-1 tabular-nums mr-auto">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {formatDate(report.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
