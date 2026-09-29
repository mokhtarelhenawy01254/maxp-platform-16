import React, { useState, useEffect } from 'react';
import { InlineErrorBanner } from '../components/InlineErrorBanner';
import {
  AppWindow,
  Globe,
  Search,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  HelpCircle,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Clock,
} from 'lucide-react';

interface AppItem {
  appName: string;
  durationSeconds: number;
  category: string;
}

interface WebItem {
  domain: string;
  durationSeconds: number;
  category: string;
}

interface AppsTimelineTabProps {
  formatTime: (sec: number) => string;
}

export const AppsTimelineTab: React.FC<AppsTimelineTabProps> = ({ formatTime }) => {
  const getTodayLocal = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseLocalDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  };

  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayLocal();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeSubTab, setActiveSubTab] = useState<'apps' | 'sites'>('apps');
  const [searchTerm, setSearchTerm] = useState('');
  const [apps, setApps] = useState<AppItem[]>([]);
  const [sites, setSites] = useState<WebItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [appList, siteList] = await Promise.all([
        window.electronAPI.getAppsSummary(selectedDate),
        window.electronAPI.getWebsitesSummary(selectedDate),
      ]);
      setApps(appList || []);
      setSites(siteList || []);
      setError(null);
    } catch {
      setError('تعذر تحميل سجل البرامج والمواقع.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15_000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const totalAppSeconds = apps.reduce((acc, a) => acc + a.durationSeconds, 0);
  const totalSiteSeconds = sites.reduce((acc, s) => acc + s.durationSeconds, 0);

  const filteredApps = apps.filter((a) =>
    a.appName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSites = sites.filter((s) =>
    s.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryMeta = (cat?: string) => {
    switch (cat) {
      case 'productive':
        return { label: 'مرتبط بالعمل', color: 'var(--accent-green)', bg: 'var(--accent-green-bg)' };
      case 'unproductive':
        return { label: 'تصفح عام / استخدام متنوع', color: 'var(--text-muted)', bg: 'var(--border-subtle)' };
      case 'neutral':
        return { label: 'أدوات مساعدة', color: 'var(--accent-blue)', bg: 'rgba(56, 189, 248, 0.1)' };
      default:
        return { label: 'غير مصنف', color: 'var(--text-dim)', bg: 'rgba(113, 113, 122, 0.1)' };
    }
  };

  return (
    <div style={styles.container}>
      {error && <InlineErrorBanner message={error} onRetry={() => { setLoading(true); loadData(); }} />}
      {/* Date Navigation Bar */}
      <div style={styles.dateNavBar}>
        <div style={styles.dateNavControls}>
          <button
            onClick={() => {
              const d = parseLocalDate(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(formatLocalDate(d));
            }}
            style={styles.dateNavBtn}
            title="اليوم السابق"
            onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            <ChevronRight size={14} />
            <span>اليوم السابق</span>
          </button>

          <button
            onClick={() => setSelectedDate(todayStr)}
            style={{
              ...styles.dateNavPill,
              background: selectedDate === todayStr ? 'var(--accent-green-bg)' : 'transparent',
              borderColor: selectedDate === todayStr ? 'var(--accent-green-border)' : 'var(--border-default)',
              color: selectedDate === todayStr ? 'var(--accent-green)' : 'var(--text-secondary)',
            }}
          >
            <Calendar size={13} />
            <span>اليوم</span>
          </button>

          <button
            onClick={() => {
              if (selectedDate >= todayStr) return;
              const d = parseLocalDate(selectedDate);
              d.setDate(d.getDate() + 1);
              const next = formatLocalDate(d);
              setSelectedDate(next > todayStr ? todayStr : next);
            }}
            disabled={selectedDate === todayStr}
            style={{
              ...styles.dateNavBtn,
              opacity: selectedDate === todayStr ? 0.35 : 1,
              cursor: selectedDate === todayStr ? 'not-allowed' : 'pointer',
            }}
            title="اليوم التالي"
            onMouseDown={(e) => { if (selectedDate !== todayStr) (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { if (selectedDate !== todayStr) (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            <span>اليوم التالي</span>
            <ChevronLeft size={14} />
          </button>
        </div>

        <div style={styles.dateDisplayBadge}>
          <Clock size={13} color="var(--accent-blue)" />
          <span>
            {parseLocalDate(selectedDate).toLocaleDateString('ar-EG-u-nu-latn', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          {selectedDate !== todayStr && (
            <span style={styles.archivedTag}>
              مؤرشف
            </span>
          )}
        </div>
      </div>

      {/* Top Bar: Subtabs & Search */}
      <div style={styles.topBar}>
        <div style={styles.subtabs}>
          <button
            onClick={() => setActiveSubTab('apps')}
            style={{
              ...styles.subtabBtn,
              background: activeSubTab === 'apps' ? '#27272a' : 'transparent',
              color: activeSubTab === 'apps' ? '#ffffff' : 'var(--text-muted)',
            }}
          >
            <AppWindow size={15} />
            <span>البرامج ({apps.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('sites')}
            style={{
              ...styles.subtabBtn,
              background: activeSubTab === 'sites' ? '#27272a' : 'transparent',
              color: activeSubTab === 'sites' ? '#ffffff' : 'var(--text-muted)',
            }}
          >
            <Globe size={15} />
            <span>المواقع ({sites.length})</span>
          </button>
        </div>

        <div style={styles.searchBox}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث في السجل…"
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* List Content */}
      <div style={styles.list}>
        {activeSubTab === 'apps' ? (
          filteredApps.length === 0 ? (
            <div style={styles.emptyState}>
              {loading ? 'جاري التحميل…' : 'لا يوجد سجل برامج مسجل لهذا اليوم بعد.'}
            </div>
          ) : (
            filteredApps.map((app, idx) => {
              const meta = getCategoryMeta(app.category);
              const ratio = totalAppSeconds > 0
                ? Math.round((app.durationSeconds / totalAppSeconds) * 100)
                : 0;

              return (
                <div key={`${app.appName}-${idx}`} style={styles.row}>
                  <div style={styles.itemMain}>
                    <div style={styles.nameRow}>
                      <span style={styles.itemName}>{app.appName}</span>
                      <span
                        style={{
                          ...styles.catBadge,
                          color: meta.color,
                          background: meta.bg,
                          borderColor: `${meta.color}33`,
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div style={styles.track}>
                      <div
                        style={{
                          ...styles.bar,
                          width: `${Math.max(2, ratio)}%`,
                          background: meta.color,
                        }}
                      />
                    </div>
                  </div>

                  <div style={styles.timeBox}>
                    <span style={styles.timeVal}>{formatTime(app.durationSeconds)}</span>
                    <span style={styles.ratioVal}>{ratio}%</span>
                  </div>
                </div>
              );
            })
          )
        ) : filteredSites.length === 0 ? (
          <div style={styles.emptyState}>
            {loading ? 'جاري التحميل…' : 'لا يوجد سجل مواقع ويب مسجل لهذا اليوم بعد.'}
          </div>
        ) : (
          filteredSites.map((site, idx) => {
            const meta = getCategoryMeta(site.category);
            const ratio = totalSiteSeconds > 0
              ? Math.round((site.durationSeconds / totalSiteSeconds) * 100)
              : 0;

            return (
              <div key={`${site.domain}-${idx}`} style={styles.row}>
                <div style={styles.itemMain}>
                  <div style={styles.nameRow}>
                    <span style={styles.itemName}>{site.domain}</span>
                    <span
                      style={{
                        ...styles.catBadge,
                        color: meta.color,
                        background: meta.bg,
                        borderColor: `${meta.color}33`,
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div style={styles.track}>
                    <div
                      style={{
                        ...styles.bar,
                        width: `${Math.max(2, ratio)}%`,
                        background: meta.color,
                      }}
                    />
                  </div>
                </div>

                <div style={styles.timeBox}>
                  <span style={styles.timeVal}>{formatTime(site.durationSeconds)}</span>
                  <span style={styles.ratioVal}>{ratio}%</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  dateNavBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 10,
    padding: '8px 12px',
    boxShadow: 'var(--shadow-card)',
  },
  dateNavControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  dateNavBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 7,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  dateNavPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    border: '1px solid',
    padding: '4px 12px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  dateDisplayBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
    background: 'var(--bg-sidebar)',
    padding: '4px 12px',
    borderRadius: 8,
    border: '1px solid var(--border-subtle)',
    fontVariantNumeric: 'tabular-nums',
  },
  archivedTag: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: 'var(--accent-blue)',
    background: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: 12,
    padding: '2px 7px',
    fontWeight: 700,
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    padding: '8px 10px',
  },
  subtabs: {
    display: 'flex',
    gap: 6,
  },
  subtabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--bg-sidebar)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    padding: '4px 10px',
    width: 200,
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: 12,
    width: '100%',
    fontFamily: 'inherit',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 'calc(100vh - 210px)',
    overflowY: 'auto',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    padding: '10px 14px',
  },
  itemMain: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  itemName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  catBadge: {
    fontSize: 10,
    fontWeight: 600,
    border: '1px solid',
    borderRadius: 4,
    padding: '1px 6px',
    whiteSpace: 'nowrap',
  },
  track: {
    height: 4,
    borderRadius: 2,
    background: 'var(--bg-hover)',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 2,
  },
  timeBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    minWidth: 80,
  },
  timeVal: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums',
  },
  ratioVal: {
    fontSize: 10,
    color: 'var(--text-dim)',
    fontVariantNumeric: 'tabular-nums',
    marginTop: 2,
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 10px',
    color: 'var(--text-dimmer)',
    fontSize: 12,
  },
};

export default AppsTimelineTab;
