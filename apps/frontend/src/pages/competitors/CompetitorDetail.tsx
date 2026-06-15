import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, RefreshCw, BarChart2, TrendingUp, Scale, History, Settings, Instagram, Share2, Crosshair, Lightbulb, Plus, Pencil, X, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import CompetitorFeatures from './CompetitorFeatures';

interface CompetitorProduct {
  id: string;
  name: string;
  price: number | null;
  comparePrice: number | null;
  currency: string;
  image: string | null;
  url: string | null;
  sku: string | null;
  isAvailable: boolean;
  category: string | null;
  lastSeen: string;
}

interface CompetitorAd {
  id: string;
  platform: string;
  copy: string | null;
  headline: string | null;
  cta: string | null;
  creativeUrl: string | null;
  status: string;
  lastSeen: string;
}

interface CompetitorReport {
  id: string;
  type: string;
  title: string;
  summary: string;
  generatedAt: string;
}

interface DevTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  targetDate: string | null;
  createdAt: string;
}

interface DevRecommendation {
  id: string;
  tasks: DevTask[];
}

const CompetitorDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>('overview');
  const [competitor, setCompetitor] = useState<any>(null);
  const [products, setProducts] = useState<CompetitorProduct[]>([]);
  const [ads, setAds] = useState<CompetitorAd[]>([]);
  const [reports, setReports] = useState<CompetitorReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [devRec, setDevRec] = useState<DevRecommendation | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<DevTask | null>(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'not_started', targetDate: '' });
  const [taskError, setTaskError] = useState('');

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/competitors/${id}`);
      if (res.data.success) {
        setCompetitor(res.data.data);
        setProducts(res.data.data.products || []);
        setAds(res.data.data.ads || []);
        setReports(res.data.data.reports || []);
      }
    } catch {
      console.error('Failed to fetch competitor');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDevRecommendations = async () => {
    if (!id) return;
    try {
      const res = await apiClient.get(`/competitors/${id}/dev-recommendations`);
      if (res.data.success) {
        setDevRec(res.data.data);
      }
    } catch {
      console.error('Failed to fetch dev recommendations');
    }
  };

  useEffect(() => { fetchData(); }, [id]);
  useEffect(() => { if (id) fetchDevRecommendations(); }, [id]);

  const handleAddTask = () => {
    const text = newTaskText.trim();
    if (!text || !id) return;
    apiClient.post(`/competitors/${id}/dev-tasks`, { title: text, status: 'not_started' }).then(res => {
      if (res.data.success) {
        setNewTaskText('');
        fetchDevRecommendations();
      }
    }).catch(() => {});
  };

  const handleToggleTask = (task: DevTask) => {
    if (!id) return;
    apiClient.put(`/competitors/${id}/dev-tasks/${task.id}/toggle`).then(res => {
      if (res.data.success) {
        setDevRec(prev => prev ? {
          ...prev,
          tasks: prev.tasks.map(t => t.id === task.id ? { ...t, status: res.data.data.status } : t),
        } : prev);
      }
    }).catch(() => {});
  };

  const openAddTask = () => {
    setEditingTask(null);
    setTaskForm({ title: '', description: '', status: 'not_started', targetDate: '' });
    setTaskError('');
    setShowTaskModal(true);
  };

  const openEditTask = (task: DevTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      targetDate: '',
    });
    setTaskError('');
    setShowTaskModal(true);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      setTaskError(t('competitors.devRecommendations.titleRequired'));
      return;
    }
    try {
      if (editingTask) {
        await apiClient.put(`/competitors/${id}/dev-tasks/${editingTask.id}`, taskForm);
      } else {
        await apiClient.post(`/competitors/${id}/dev-tasks`, taskForm);
      }
      setShowTaskModal(false);
      fetchDevRecommendations();
    } catch {
      setTaskError(editingTask ? 'Failed to update task' : 'Failed to create task');
    }
  };

  const generateReport = async (type: string) => {
    if (!id) return;
    try {
      await apiClient.post(`/competitors/${id}/reports/generate`, { type });
      fetchData();
    } catch {
      console.error('Failed to generate report');
    }
  };

  const getTaskStats = () => {
    if (!devRec?.tasks?.length) return { total: 0, notStarted: 0, inProgress: 0, completed: 0 };
    const tasks = devRec.tasks;
    return {
      total: tasks.length,
      notStarted: tasks.filter(t => t.status === 'not_started').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
    };
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">{t('common.loading')}</div>;
  }

  if (!competitor) {
    return <div className="p-6 text-center text-gray-500">{t('common.no_data')}</div>;
  }

  const tabs = [
    { key: 'overview', label: t('competitors.overview') },
    { key: 'products', label: t('competitors.productsTab') },
    { key: 'social', label: t('competitors.social.overview'), icon: <Instagram size={14} /> },
    { key: 'ads', label: t('competitors.ads.overview'), icon: <Share2 size={14} /> },
    { key: 'features', label: t('competitors.features.title'), icon: <Lightbulb size={14} /> },
    { key: 'platforms', label: t('competitors.platforms.techStack'), icon: <TrendingUp size={14} /> },
    { key: 'reports', label: t('competitors.reportsTab') },
  ] as const;

  const taskStats = getTaskStats();

  return (
    <div className="p-6" dir="auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/competitors')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">{competitor.name}</h1>
        {competitor.url && (
          <a href={competitor.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1 text-sm">
            <ExternalLink size={14} />
            {competitor.url.replace(/^https?:\/\//, '').slice(0, 40)}
          </a>
        )}
        <button onClick={() => { fetchData(); fetchDevRecommendations(); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ml-auto">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {competitor._count && (
          <div className="flex gap-6 text-sm text-gray-500">
            <span className="bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
              {competitor._count.products} {t('competitors.products')}
            </span>
            <span className="bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full">
              {competitor._count.ads} {t('competitors.ads')}
            </span>
            <span className="bg-purple-50 dark:bg-purple-900/30 px-3 py-1 rounded-full">
              {competitor._count.reports} {t('competitors.reports')}
            </span>
          </div>
        )}
        <div className="flex gap-2 mr-auto">
          <button onClick={() => navigate(`/competitors/${id}/price-compare`)} className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800" title={t('competitors.comparison')}>
            <Scale size={14} /> {t('competitors.comparison')}
          </button>
          <button onClick={() => navigate('/competitors/gap-analysis')} className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800" title={t('competitors.gapAnalysis')}>
            <BarChart2 size={14} /> {t('competitors.gapAnalysis')}
          </button>
          <button onClick={() => navigate(`/competitors/${id}/products/${competitor.products?.[0]?.id}/price-history`)} className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800" title={t('competitors.priceHistory')} disabled={!competitor.products?.length}>
            <History size={14} /> {t('competitors.priceHistory')}
          </button>
          <button onClick={() => navigate('/competitors/settings')} className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800" title={t('competitors.settings')}>
            <Settings size={14} />
          </button>
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
          <button onClick={() => navigate(`/competitors/${id}/social`)} className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-pink-600 border-pink-200" title={t('competitors.social.overview')}>
            <Instagram size={14} /> {t('competitors.social.overview')}
          </button>
          <button onClick={() => navigate(`/competitors/${id}/ads`)} className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-blue-600 border-blue-200" title={t('competitors.ads.overview')}>
            <Share2 size={14} /> {t('competitors.ads.overview')}
          </button>
          <button onClick={() => navigate(`/competitors/${id}/platforms`)} className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-green-600 border-green-200" title={t('competitors.platforms.techStack')}>
            <TrendingUp size={14} /> {t('competitors.platforms.techStack')}
          </button>
          <button onClick={() => navigate(`/competitors/${id}/battlecard`)} className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-purple-600 border-purple-200" title={t('competitors.battlecard.title')}>
            <BarChart2 size={14} /> {t('competitors.battlecard.title')}
          </button>
          <button onClick={() => navigate('/competitors/auto-discover')} className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-yellow-600 border-yellow-200" title={t('competitors.autoDiscover.title')}>
            <Crosshair size={14} /> {t('competitors.autoDiscover.title')}
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b mb-6">
        {tabs.map(tabItem => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === tabItem.key
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          {competitor.description && (
            <div className="border rounded-lg p-4 dark:border-gray-700">
              <h3 className="font-semibold mb-2">{t('competitors.description')}</h3>
              <p className="text-gray-600 dark:text-gray-400">{competitor.description}</p>
            </div>
          )}
          {competitor.notes && (
            <div className="border rounded-lg p-4 dark:border-gray-700">
              <h3 className="font-semibold mb-2">{t('competitors.notes')}</h3>
              <p className="text-gray-600 dark:text-gray-400">{competitor.notes}</p>
            </div>
          )}
          {competitor.strengths && (
            <div className="border rounded-lg p-4 dark:border-gray-700">
              <h3 className="font-semibold mb-2">{t('competitors.strengths')}</h3>
              <div className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {competitor.strengths.split('\n').map((line: string, i: number) => (
                  <p key={i} className={line.startsWith('-') || line.startsWith('•') ? 'mr-2' : ''}>{line}</p>
                ))}
              </div>
            </div>
          )}
          {competitor.weaknesses && (
            <div className="border rounded-lg p-4 dark:border-gray-700">
              <h3 className="font-semibold mb-2">{t('competitors.weaknesses')}</h3>
              <div className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {competitor.weaknesses.split('\n').map((line: string, i: number) => (
                  <p key={i} className={line.startsWith('-') || line.startsWith('•') ? 'mr-2' : ''}>{line}</p>
                ))}
              </div>
            </div>
          )}

          {/* Dev Recommendations — Professional To-Do List */}
          <div className="border rounded-lg p-4 dark:border-gray-700 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-blue-600 dark:text-blue-400">{t('competitors.devRecommendations.title')}</h3>
              <button onClick={openAddTask} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus size={14} /> {t('competitors.devRecommendations.addTask')}
              </button>
            </div>

            {/* Stats Bar */}
            <div className="flex flex-wrap gap-2 mb-4 text-xs">
              <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-full font-medium">
                {t('competitors.devRecommendations.stats.total')} <span className="text-blue-600 dark:text-blue-400">{taskStats.total}</span>
              </span>
              <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-full font-medium">
                {t('competitors.devRecommendations.stats.completed')} <span className="text-green-600 dark:text-green-400">{taskStats.completed}</span>
              </span>
              <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-full font-medium">
                {t('competitors.devRecommendations.stats.notStarted')} <span className="text-amber-600 dark:text-amber-400">{taskStats.notStarted}</span>
              </span>
            </div>

            {/* Quick Add Input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newTaskText}
                onChange={e => setNewTaskText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTask(); } }}
                className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                placeholder={t('competitors.devRecommendations.notesPlaceholder')}
              />
              <button
                onClick={handleAddTask}
                disabled={!newTaskText.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Tasks List */}
            {(!devRec?.tasks || devRec.tasks.length === 0) ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-2 opacity-30">📋</div>
                <p className="text-sm text-gray-500">{t('competitors.devRecommendations.noTasks')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('competitors.devRecommendations.notesPlaceholder')}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {devRec.tasks.map(task => (
                  <div
                    key={task.id}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ease-in-out border border-transparent hover:border-gray-200 dark:hover:border-gray-700 ${
                      task.status === 'completed'
                        ? 'bg-green-50/50 dark:bg-green-900/10'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                    }`}
                  >
                    <button
                      onClick={() => handleToggleTask(task)}
                      className="shrink-0 focus:outline-none transform transition-transform duration-200 active:scale-90"
                      title={task.status === 'completed' ? t('competitors.devRecommendations.statuses.not_started') : t('competitors.devRecommendations.statuses.completed')}
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 size={20} className="text-green-500 transition-all duration-300 ease-in-out hover:text-green-600" />
                      ) : (
                        <Circle size={20} className="text-gray-300 dark:text-gray-600 transition-all duration-300 ease-in-out hover:text-blue-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-sm block transition-all duration-300 ease-in-out ${
                          task.status === 'completed'
                            ? 'line-through text-gray-400 dark:text-gray-500'
                            : 'text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {task.title}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex gap-0.5">
                      <button
                        onClick={() => openEditTask(task)}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                        title={t('competitors.devRecommendations.editTask')}
                      >
                        <Pencil size={14} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Price Comparison */}
          <div className="border rounded-lg p-4 dark:border-gray-700">
            <h3 className="font-semibold mb-2">{t('competitors.priceComparison')}</h3>
            {products.length > 0 ? (
              <div className="space-y-2">
                {products.slice(0, 10).map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1 border-b last:border-0 dark:border-gray-700">
                    <span className="text-sm">{p.name}</span>
                    <span className="text-sm font-medium">
                      {p.price ? `${Number(p.price).toFixed(2)} ${p.currency}` : '-'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">{t('competitors.noProducts')}</p>
            )}
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div>
          {products.length === 0 ? (
            <p className="text-gray-500">{t('competitors.noProducts')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.map(p => (
                <div key={p.id} className="border rounded-lg p-3 dark:border-gray-700">
                  <div className="flex gap-3">
                    {p.image && <img src={p.image} alt={p.name} className="w-16 h-16 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{p.name}</h4>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {p.price ? `${Number(p.price).toFixed(2)} ${p.currency}` : '-'}
                      </p>
                      {p.sku && <p className="text-xs text-gray-500">{p.sku}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${p.isAvailable ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
                          {p.isAvailable ? t('competitors.available') : t('competitors.unavailable')}
                        </span>
                        {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-blue-500"><ExternalLink size={12} /></a>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'ads' && (
        <div>
          {ads.length === 0 ? (
            <p className="text-gray-500">{t('competitors.noAds')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ads.map(a => (
                <div key={a.id} className="border rounded-lg p-3 dark:border-gray-700">
                  {a.creativeUrl && <img src={a.creativeUrl} alt="Ad" className="w-full h-40 object-cover rounded mb-2" />}
                  {a.headline && <h4 className="font-semibold text-sm">{a.headline}</h4>}
                  {a.copy && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">{a.copy}</p>}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{a.platform}</span>
                    <span>{a.status}</span>
                    {a.destinationUrl && <a href={a.destinationUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 flex items-center gap-1"><ExternalLink size={12} /></a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'social' && (
        <div className="text-center py-12 text-gray-500">
          <p>{t('competitors.social.noSocialProfiles')}</p>
          <button onClick={() => navigate(`/competitors/${id}/social`)} className="mt-2 text-blue-500 hover:underline text-sm">
            {t('competitors.social.overview')}
          </button>
        </div>
      )}

      {tab === 'features' && (
        <div>
          <p className="text-xs text-gray-500 mb-3">{t('competitors.features.derivedFrom')}</p>
          <CompetitorFeatures competitorId={id || ''} />
        </div>
      )}

      {tab === 'platforms' && (
        <div className="text-center py-12 text-gray-500">
          <p>{t('competitors.platforms.noPlatformData')}</p>
          <button onClick={() => navigate(`/competitors/${id}/platforms`)} className="mt-2 text-blue-500 hover:underline text-sm">
            {t('competitors.platforms.techStack')}
          </button>
        </div>
      )}

      {tab === 'reports' && (
        <div>
          <div className="flex gap-2 mb-4">
            <button onClick={() => generateReport('weekly')} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              {t('competitors.generateReport')} ({t('competitors.weeklyReport')})
            </button>
            <button onClick={() => generateReport('comprehensive')} className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
              {t('competitors.generateReport')} ({t('competitors.comprehensiveReport')})
            </button>
          </div>
          {reports.length === 0 ? (
            <p className="text-gray-500">{t('competitors.noReports')}</p>
          ) : (
            <div className="space-y-3">
              {reports.map(r => (
                <div key={r.id} className="border rounded-lg p-4 dark:border-gray-700">
                  <h4 className="font-semibold">{r.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{r.summary}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                      {r.type === 'weekly' ? t('competitors.weeklyReport') : t('competitors.comprehensiveReport')}
                    </span>
                    <span>{new Date(r.generatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTaskModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingTask ? t('competitors.devRecommendations.editTask') : t('competitors.devRecommendations.addTask')}</h2>
              <button onClick={() => setShowTaskModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('competitors.devRecommendations.taskTitle')} *</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  placeholder={t('competitors.devRecommendations.taskTitlePlaceholder')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('competitors.devRecommendations.taskDescription')}</label>
                <textarea
                  value={taskForm.description}
                  onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                  rows={2}
                  placeholder={t('competitors.devRecommendations.taskDescriptionPlaceholder')}
                />
              </div>
              {taskError && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertTriangle size={16} />
                  {taskError}
                </div>
              )}
              <div className="flex gap-2 justify-end pt-2 border-t">
                <button type="button" onClick={() => setShowTaskModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  {t('common.cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {editingTask ? t('common.save') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorDetail;
