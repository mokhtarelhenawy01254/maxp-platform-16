import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileText, TrendingUp, Eye, RefreshCw, Download } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import CompetitorStatusBar, { type CompetitorStatus } from './CompetitorStatusBar';
import { updateCompetitorStatus } from './useCompetitorStatus';
import i18n from '../../i18n';

interface Report {
  id: string;
  type: string;
  title: string;
  summary: string;
  insights: any;
  data: any;
  periodStart: string | null;
  periodEnd: string | null;
  generatedAt: string;
  competitor: { id: string; name: string; status: CompetitorStatus };
}

export const Reports: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'weekly' | 'comprehensive'>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/competitors/reports/all');
      if (res.data?.success) {
        const list = res.data.data || [];
        setReports(list);
        if (list.length > 0 && !selectedReport) {
          setSelectedReport(list[0]);
        }
      }
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  };

  const filteredReports = filter === 'all' ? reports : reports.filter(r => r.type === filter);

  const reportTypeLabel = (type?: string) => {
    if (!type) return 'GENERAL';
    switch (type.toLowerCase()) {
      case 'weekly': return t('competitors.weeklyReport') || 'تقرير أسبوعي';
      case 'comprehensive': return t('competitors.comprehensiveReport') || 'تقرير شامل';
      default: return String(type).toUpperCase();
    }
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground space-y-4 p-3 sm:p-5" dir={i18n.dir()}>
      {/* Top Command Bar */}
      <div className="bg-card border border-border/70 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/competitors')}
            className="p-2 rounded-lg border border-border/70 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={t('common.back')}
          >
            {i18n.dir() === 'rtl' ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-foreground">{t('competitors.reports')}</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                DOSSIER ARCHIVE
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              أرشيف التقارير الدورية وتحليلات السوق وتغيرات الأسعار المسجلة للمنافسين
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {/* Filter Pills */}
          <div className="flex items-center bg-muted/30 border border-border/70 rounded-lg p-0.5">
            {(['all', 'weekly', 'comprehensive'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  filter === f
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'all' ? t('competitors.allReports') : f === 'weekly' ? t('competitors.weekly') : t('competitors.comprehensive')}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchReports}
            className="h-8 w-8 rounded-lg border border-border/70 bg-card hover:bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={t('common.refresh')}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Single-Surface Dossier Chassis */}
      {isLoading ? (
        <div className="py-20 text-center font-mono text-xs text-muted-foreground">
          <RefreshCw size={24} className="animate-spin mx-auto text-primary mb-2" />
          جاري استرجاع تقارير المنافسين...
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border/70 rounded-xl bg-card space-y-2">
          <FileText size={32} className="mx-auto text-muted-foreground/40 mb-1" />
          <h3 className="text-xs font-bold text-foreground">{t('competitors.noReports')}</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            سيتم إدراج تقارير الذكاء التنافسي آلياً عند تشغيل دورات الفحص المجدولة
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Master List (4 Cols) */}
          <div className="lg:col-span-4 space-y-2">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
              الملفات المرصودة ({filteredReports.length})
            </div>
            <div className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-0.5">
              {filteredReports.map(report => {
                const isSelected = selectedReport?.id === report.id;
                return (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20'
                        : 'border-border/70 bg-card hover:border-primary/40 hover:bg-muted/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/50 uppercase">
                        {reportTypeLabel(report.type)}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {new Date(report.generatedAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <h3 className="font-semibold text-xs text-foreground line-clamp-1">
                      {report.title}
                    </h3>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 text-xs">
                      <span className="text-[11px] text-muted-foreground truncate font-medium">
                        {report.competitor?.name || t('competitors.notAvailable')}
                      </span>
                      {report.competitor?.status && (
                        <CompetitorStatusBar
                          currentStatus={report.competitor.status}
                          competitorId={report.competitor.id}
                          onChange={(newStatus) => updateCompetitorStatus(report.competitor.id, newStatus)}
                          size="sm"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Detail Pane (8 Cols) */}
          <div className="lg:col-span-8">
            {selectedReport ? (
              <div className="bg-card border border-border/70 rounded-xl p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-border/70">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-bold text-foreground">{selectedReport.title}</h2>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {String(selectedReport.type || 'GENERAL').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground font-mono">
                      <span>{selectedReport.competitor?.name}</span>
                      <span>•</span>
                      <span>
                        {new Date(selectedReport.generatedAt).toLocaleString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/30 text-xs font-medium text-foreground transition-colors shrink-0 cursor-pointer active:scale-[0.98]"
                    title={t('common.export')}
                  >
                    <Download size={13} />
                    <span>تصدير التقرير</span>
                  </button>
                </div>

                {/* Executive Summary */}
                {selectedReport.summary && (
                  <div className="rounded-lg bg-muted/20 border border-border/60 p-3.5 space-y-1">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      {t('competitors.summary')}
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">
                      {selectedReport.summary}
                    </p>
                  </div>
                )}

                {/* Telemetry Metric Insights */}
                {selectedReport.insights && typeof selectedReport.insights === 'object' && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <TrendingUp size={13} className="text-primary" />
                      <span>{t('competitors.insights')}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {Object.entries(selectedReport.insights).map(([key, value]) => (
                        <div key={key} className="bg-muted/15 border border-border/60 rounded-lg p-3">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono truncate">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className="text-lg font-bold font-mono tabular-nums text-foreground mt-1">
                            {String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payload Inspection */}
                {selectedReport.data && typeof selectedReport.data === 'object' && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="text-xs font-bold text-foreground">
                      {t('competitors.details')}
                    </div>
                    <pre className="bg-muted/30 border border-border/60 rounded-lg p-3 text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-56">
                      {JSON.stringify(selectedReport.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex items-center justify-center border border-dashed border-border/70 rounded-xl bg-card text-center p-6">
                <div>
                  <Eye size={32} className="mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">{t('competitors.selectReportToView')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
