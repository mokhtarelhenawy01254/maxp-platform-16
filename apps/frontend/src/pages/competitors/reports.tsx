import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileText, Calendar, BarChart3, TrendingUp, Eye, RefreshCw, Download, Filter, FileSpreadsheet } from 'lucide-react';
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

const Reports: React.FC = () => {
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
      if (res.data.success) {
        const list = res.data.data || [];
        setReports(list);
        if (list.length > 0 && !selectedReport) {
          setSelectedReport(list[0]);
        }
      }
    } catch {
      console.error('Failed to fetch reports');
    }
    setIsLoading(false);
  };

  const filteredReports = filter === 'all' ? reports : reports.filter(r => r.type === filter);

  const reportTypeLabel = (type: string) => {
    switch (type) {
      case 'weekly': return t('competitors.weeklyReport');
      case 'comprehensive': return t('competitors.comprehensiveReport');
      default: return type.toUpperCase();
    }
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground" dir={i18n.dir()}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header Command Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/competitors')}
              className="p-2 rounded-lg border border-border/60 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
              title={t('common.back')}
            >
              {i18n.dir() === 'rtl' ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{t('competitors.reports')}</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  REPORTS DISPATCH
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Archived competitor intelligence digests, market shifts, and executive summaries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Pills */}
            <div className="flex items-center bg-card border border-border/70 rounded-lg p-0.5">
              {(['all', 'weekly', 'comprehensive'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    filter === f
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  {f === 'all' ? t('competitors.allReports') : f === 'weekly' ? t('competitors.weekly') : t('competitors.comprehensive')}
                </button>
              ))}
            </div>

            <button
              onClick={fetchReports}
              className="h-8 w-8 rounded-lg border border-border/60 hover:bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title={t('common.refresh')}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Body Content */}
        {isLoading ? (
          <div className="py-20 text-center">
            <RefreshCw size={28} className="animate-spin mx-auto text-primary mb-3" />
            <p className="text-xs text-muted-foreground">{t('common.loading')}...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-border/70 rounded-xl bg-card/40">
            <FileText size={36} className="mx-auto text-muted-foreground/60 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">{t('competitors.noReports')}</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Automated intelligence digests will be listed here as scheduled cron scrapers execute.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Master List (4 Cols) */}
            <div className="lg:col-span-4 space-y-2.5">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Generated Dossiers ({filteredReports.length})
              </div>
              <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {filteredReports.map(report => {
                  const isSelected = selectedReport?.id === report.id;
                  return (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-xs'
                          : 'border-border/70 bg-card hover:border-primary/40 hover:bg-muted/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/50 uppercase">
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
                        <span className="text-[11px] text-muted-foreground truncate">
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
                <div className="bg-card border border-border/70 rounded-xl p-5 space-y-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-border/70">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-foreground">{selectedReport.title}</h2>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {selectedReport.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground font-mono">
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
                        {selectedReport.competitor?.status && (
                          <>
                            <span>•</span>
                            <CompetitorStatusBar
                              currentStatus={selectedReport.competitor.status}
                              competitorId={selectedReport.competitor.id}
                              onChange={(newStatus) => updateCompetitorStatus(selectedReport.competitor.id, newStatus)}
                              size="sm"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 hover:bg-muted/30 text-xs font-medium text-foreground transition-colors shrink-0"
                      title={t('common.export')}
                    >
                      <Download size={13} />
                      <span>{t('common.export')}</span>
                    </button>
                  </div>

                  {/* Executive Summary */}
                  {selectedReport.summary && (
                    <div className="rounded-lg bg-muted/20 border border-border/50 p-4 space-y-1.5">
                      <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
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
                      <div className="text-xs font-bold text-foreground flex items-center gap-2">
                        <TrendingUp size={14} className="text-primary" />
                        <span>{t('competitors.insights')}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {Object.entries(selectedReport.insights).map(([key, value]) => (
                          <div key={key} className="bg-muted/15 border border-border/50 rounded-lg p-3">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                            <div className="text-xl font-bold font-mono tabular-nums text-foreground mt-1">
                              {String(value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Underlying Payload Inspection */}
                  {selectedReport.data && typeof selectedReport.data === 'object' && (
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <div className="text-xs font-bold text-foreground">
                        {t('competitors.details')}
                      </div>
                      <pre className="bg-muted/30 border border-border/50 rounded-lg p-3.5 text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-60">
                        {JSON.stringify(selectedReport.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full min-h-[300px] flex items-center justify-center border border-dashed border-border/70 rounded-xl bg-card/40 text-center p-6">
                  <div>
                    <Eye size={36} className="mx-auto text-muted-foreground/60 mb-2" />
                    <p className="text-xs text-muted-foreground">{t('competitors.selectReportToView')}</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default Reports;
