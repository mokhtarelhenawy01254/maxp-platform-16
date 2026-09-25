import React from 'react';
import { ShieldAlert, AlertTriangle, Clock, RefreshCw, Cpu, Building2, Search, Filter } from 'lucide-react';

export interface AiIncident {
  id: string;
  companyId: string;
  companyName: string;
  companySpecialty?: string | null;
  conversationId?: string | null;
  errorType: string;
  errorMessage?: string | null;
  createdAt: string;
  category: 'AUTH_FAIL' | 'UPSTREAM_TIMEOUT' | 'SCHEMA_MISMATCH' | 'POLICY_BLOCKED' | 'SYSTEM_ERROR';
  toolName: string;
  arguments: Record<string, any>;
  userMessage?: string | null;
  agentId: string;
  model: string;
  latencyMs: number;
  stack?: string | null;
  resolved: boolean;
  isolated?: boolean;
}

interface IncidentStreamPaneProps {
  incidents: AiIncident[];
  selectedId: string | null;
  onSelect: (incident: AiIncident) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  loading: boolean;
  onRefresh: () => void;
}

const CATEGORY_STYLES: Record<string, { label: string; badge: string }> = {
  AUTH_FAIL: {
    label: 'AUTH_FAIL',
    badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-900/60',
  },
  UPSTREAM_TIMEOUT: {
    label: 'TIMEOUT',
    badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/60',
  },
  SCHEMA_MISMATCH: {
    label: 'SCHEMA',
    badge: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-900/60',
  },
  POLICY_BLOCKED: {
    label: 'POLICY',
    badge: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-900/60',
  },
  SYSTEM_ERROR: {
    label: 'SYSTEM',
    badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300/80 dark:border-slate-700/80',
  },
};

export const IncidentStreamPane: React.FC<IncidentStreamPaneProps> = ({
  incidents,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  loading,
  onRefresh,
}) => {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-e border-slate-200/80 dark:border-slate-800 min-w-0">
      {/* Search & Category Filter Bar */}
      <div className="p-3 border-b border-slate-200/70 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="البحث باسم الأداة، الشركة، أو رسالة الخطأ..."
              className="w-full ps-8 pe-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-50"
            title="تحديث البيانات"
            aria-label="تحديث البيانات"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filter Categories Horizontal Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 text-[11px]">
          {['ALL', 'AUTH_FAIL', 'UPSTREAM_TIMEOUT', 'SCHEMA_MISMATCH', 'POLICY_BLOCKED'].map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat)}
                className={`px-2.5 py-1 rounded-md font-mono transition-all flex-shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-2xs'
                    : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                }`}
              >
                {cat === 'ALL' ? 'الكل' : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* High-Density Incident Timeline Stream */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
        {incidents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2">
            <ShieldAlert className="h-6 w-6 mx-auto text-emerald-500 opacity-70" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              لا توجد استثناءات أو أعطال مسجلة في هذه النافذة
            </p>
            <p className="text-[11px]">
              جميع أدوات الوكلاء واستدعاءات الربط الخارجي تعمل بحالة مستقرة.
            </p>
          </div>
        ) : (
          incidents.map((inc) => {
            const isSelected = selectedId === inc.id;
            const style = CATEGORY_STYLES[inc.category] || CATEGORY_STYLES.SYSTEM_ERROR!;
            const timeFormatted = new Date(inc.createdAt).toLocaleTimeString('ar-EG', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={inc.id}
                onClick={() => onSelect(inc)}
                className={`p-3 text-right cursor-pointer transition-colors border-r-2 ${
                  isSelected
                    ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-r-indigo-600'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-850/60 border-r-transparent'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-mono text-[9px] px-1.5 py-0.5 rounded border font-semibold ${style.badge}`}
                    >
                      {style.label}
                    </span>
                    {inc.isolated && (
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border font-semibold bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200">
                        معزولة (ISOLATED)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono tabular-nums">
                    <span>{inc.latencyMs ? `${inc.latencyMs}ms` : '—'}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeFormatted}
                    </span>
                  </div>
                </div>

                {/* Tool signature headline */}
                <div className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate dir-ltr text-left">
                  {inc.toolName}()
                </div>

                {/* Tenant & Agent Context */}
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <Building2 className="h-3 w-3 text-slate-400 flex-shrink-0" />
                    <span className="truncate max-w-[140px]">{inc.companyName}</span>
                  </span>
                  <span>·</span>
                  <span className="truncate font-mono text-[10px] text-slate-400">
                    {inc.agentId}
                  </span>
                </div>

                {/* Error message snippet */}
                {inc.errorMessage && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 truncate mt-1">
                    {inc.errorMessage}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
