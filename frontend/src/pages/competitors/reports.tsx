import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, BarChart3, TrendingUp, Eye, RefreshCw, Download } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

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
  competitor: { id: string; name: string };
}

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'weekly' | 'comprehensive'>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/competitors/reports/all');
      if (res.data.success) setReports(res.data.data || []);
    } catch { console.error('Failed to fetch reports'); }
    setIsLoading(false);
  };

  const filteredReports = filter === 'all' ? reports : reports.filter(r => r.type === filter);

  const reportTypeLabel = (type: string) => {
    switch (type) {
      case 'weekly': return t('competitors.weeklyReport');
      case 'comprehensive': return t('competitors.comprehensiveReport');
      default: return type;
    }
  };

  const TypeIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'weekly': return <Calendar size={16} className="text-blue-500" />;
      case 'comprehensive': return <BarChart3 size={16} className="text-purple-500" />;
      default: return <FileText size={16} />;
    }
  };

  return (
    <div className="p-6" dir="auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/competitors')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">{t('competitors.reports')}</h1>
        </div>
        <button onClick={fetchReports} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'weekly', 'comprehensive'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f === 'all' ? t('competitors.allReports') : f === 'weekly' ? t('competitors.weekly') : t('competitors.comprehensive')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>{t('competitors.noReports')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            {filteredReports.map(report => (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedReport?.id === report.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:border-gray-300 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TypeIcon type={report.type} />
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                    {reportTypeLabel(report.type)}
                  </span>
                </div>
                <h3 className="font-semibold text-sm line-clamp-2">{report.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{report.competitor?.name || 'N/A'}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(report.generatedAt).toLocaleDateString('ar-EG', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit'
                  })}
                </p>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selectedReport ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{selectedReport.title}</h2>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <TypeIcon type={selectedReport.type} />
                      <span>{reportTypeLabel(selectedReport.type)}</span>
                      <span>•</span>
                      <span>{selectedReport.competitor?.name}</span>
                      <span>•</span>
                      <span>{new Date(selectedReport.generatedAt).toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                  <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Download size={18} />
                  </button>
                </div>

                <div className="prose dark:prose-invert max-w-none">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">{t('competitors.summary')}</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">{selectedReport.summary}</p>
                  </div>

                  {selectedReport.insights && typeof selectedReport.insights === 'object' && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp size={16} />
                        {t('competitors.insights')}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(selectedReport.insights).map(([key, value]) => (
                          <div key={key} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold">{String(value)}</div>
                            <div className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedReport.data && typeof selectedReport.data === 'object' && (
                    <div>
                      <h4 className="font-semibold mb-3">{t('competitors.details')}</h4>
                      <pre className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-xs overflow-auto">
                        {JSON.stringify(selectedReport.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Eye size={48} className="mx-auto mb-4 opacity-50" />
                  <p>{t('competitors.selectReportToView')}</p>
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
