import React, { useState, useEffect } from 'react';
import {
  AppWindow,
  Globe,
  Search,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  HelpCircle,
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
  const [activeSubTab, setActiveSubTab] = useState<'apps' | 'sites'>('apps');
  const [searchTerm, setSearchTerm] = useState('');
  const [apps, setApps] = useState<AppItem[]>([]);
  const [sites, setSites] = useState<WebItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15_000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [appList, siteList] = await Promise.all([
        window.electronAPI.getAppsSummary(),
        window.electronAPI.getWebsitesSummary(),
      ]);
      setApps(appList || []);
      setSites(siteList || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

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
        return { label: 'إنتاجي', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' };
      case 'unproductive':
        return { label: 'غير إنتاجي', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
      case 'neutral':
        return { label: 'محايد', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)' };
      default:
        return { label: 'غير مصنف', color: '#71717a', bg: 'rgba(113, 113, 122, 0.1)' };
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Bar: Subtabs & Search */}
      <div style={styles.topBar}>
        <div style={styles.subtabs}>
          <button
            onClick={() => setActiveSubTab('apps')}
            style={{
              ...styles.subtabBtn,
              background: activeSubTab === 'apps' ? '#27272a' : 'transparent',
              color: activeSubTab === 'apps' ? '#fafafa' : '#a1a1aa',
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
              color: activeSubTab === 'sites' ? '#fafafa' : '#a1a1aa',
            }}
          >
            <Globe size={15} />
            <span>المواقع ({sites.length})</span>
          </button>
        </div>

        <div style={styles.searchBox}>
          <Search size={14} color="#71717a" />
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
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    background: '#121216',
    border: '1px solid rgba(255, 255, 255, 0.08)',
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
    background: '#0d0d10',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    padding: '4px 10px',
    width: 200,
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fafafa',
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
    background: '#121216',
    border: '1px solid rgba(255, 255, 255, 0.06)',
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
    color: '#fafafa',
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
    background: '#27272a',
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
    color: '#fafafa',
    fontVariantNumeric: 'tabular-nums',
  },
  ratioVal: {
    fontSize: 10,
    color: '#71717a',
    fontVariantNumeric: 'tabular-nums',
    marginTop: 2,
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 10px',
    color: '#52525b',
    fontSize: 12,
  },
};

export default AppsTimelineTab;
