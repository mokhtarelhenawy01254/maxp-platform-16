import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Zap, Clock, Activity, Cpu, Layers } from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { IncidentStreamPane, AiIncident } from './IncidentStreamPane';
import { IncidentTraceInspector } from './IncidentTraceInspector';

export default function SuperAdminAiIncidentsPage() {
  const [incidents, setIncidents] = useState<AiIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<AiIncident | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeHorizon, setTimeHorizon] = useState('24h');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [telemetry, setTelemetry] = useState<{
    totalIncidents: number;
    p95LatencyMs: number;
    degradedToolsCount: number;
    topDegradedTools: Array<{ toolName: string; failureCount: number }>;
  }>({
    totalIncidents: 0,
    p95LatencyMs: 0,
    degradedToolsCount: 0,
    topDegradedTools: [],
  });

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      try {
        res = await apiClient.get<any>('/ai/chat/incidents', {
          params: {
            timeHorizon,
            category: activeCategory !== 'ALL' ? activeCategory : undefined,
            search: searchQuery.trim() || undefined,
          },
        });
      } catch (err: any) {
        if (err?.response?.status === 404 || err?.response?.status === 403) {
          res = await apiClient.get<any>('/super-admin/ai/incidents', {
            params: {
              timeHorizon,
              category: activeCategory !== 'ALL' ? activeCategory : undefined,
              search: searchQuery.trim() || undefined,
            },
          });
        } else {
          throw err;
        }
      }

      if (res?.data?.success) {
        const list: AiIncident[] = res.data.data?.incidents || [];
        setIncidents(list);
        setTelemetry(
          res.data.data?.telemetry || {
            totalIncidents: list.length,
            p95LatencyMs: 450,
            degradedToolsCount: 0,
            topDegradedTools: [],
          }
        );

        // Keep current selection or select first
        setSelectedIncident((prev) => {
          if (!prev && list.length > 0) return list[0]!;
          if (prev) {
            const found = list.find((i) => i.id === prev.id);
            return found || list[0] || null;
          }
          return null;
        });
      }
    } catch (err) {
      console.error('[AI-INCIDENTS-PAGE] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [timeHorizon, activeCategory, searchQuery]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Keyboard navigation (J/K and ArrowUp/ArrowDown like Linear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
        return;
      }
      if (incidents.length === 0) return;

      const currentIndex = selectedIncident
        ? incidents.findIndex((i) => i.id === selectedIncident.id)
        : -1;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const nextIndex = currentIndex < incidents.length - 1 ? currentIndex + 1 : 0;
        setSelectedIncident(incidents[nextIndex] || null);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : incidents.length - 1;
        setSelectedIncident(incidents[prevIndex] || null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [incidents, selectedIncident]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans" dir="rtl">
      {/* 2026 SaaS Telemetry Bar (Single Surface Command Header) */}
      <header className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 shadow-2xs">
            <ShieldAlert className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                مركز تتبع أعطال أدوات الوكلاء
              </h1>
              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                Telemetry 2026
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              رصد حي للأعطال واستثناءات الاستدعاء ومفاتيح الربط للشركات على المنصة
            </p>
          </div>
        </div>

        {/* Telemetry Metrics & Time Horizon */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <Activity className="h-3.5 w-3.5 text-rose-500" />
            <span className="text-slate-500 font-sans">الأعطال:</span>
            <span className="font-bold tabular-nums text-slate-900 dark:text-white">
              {telemetry.totalIncidents}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-slate-500 font-sans">P95:</span>
            <span className="font-bold tabular-nums text-slate-900 dark:text-white">
              {telemetry.p95LatencyMs}ms
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <Layers className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-slate-500 font-sans">أدوات متأثرة:</span>
            <span className="font-bold tabular-nums text-slate-900 dark:text-white">
              {telemetry.degradedToolsCount}
            </span>
          </div>

          {/* Time Horizon Selector */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-2xs">
            {['1h', '24h', '7d', '30d'].map((hz) => (
              <button
                key={hz}
                type="button"
                onClick={() => setTimeHorizon(hz)}
                className={`px-2.5 py-1 text-[11px] rounded-md font-mono transition-all cursor-pointer ${
                  timeHorizon === hz
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {hz}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Split-Pane Surface (60:40 Master-Detail Chassis) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden bg-white dark:bg-slate-900">
        {/* Left Master Stream Pane (7 cols ~ 58%) */}
        <div className="md:col-span-6 lg:col-span-7 h-full overflow-hidden min-h-0">
          <IncidentStreamPane
            incidents={incidents}
            selectedId={selectedIncident?.id || null}
            onSelect={(inc) => setSelectedIncident(inc)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            loading={loading}
            onRefresh={fetchIncidents}
          />
        </div>

        {/* Right Detail Trace Inspector (5 cols ~ 42%) */}
        <div className="md:col-span-6 lg:col-span-5 h-full overflow-hidden min-h-0">
          <IncidentTraceInspector
            incident={selectedIncident}
            onRefresh={fetchIncidents}
          />
        </div>
      </div>
    </div>
  );
}
