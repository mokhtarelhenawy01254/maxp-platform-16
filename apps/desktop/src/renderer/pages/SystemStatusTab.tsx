import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Server,
  Database,
  RefreshCw,
  CheckCircle2,
  HardDrive,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const SystemStatusTab: React.FC = () => {
  const [sysInfo, setSysInfo] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = async () => {
    try {
      const data = await window.electronAPI.getSystemInfo();
      setSysInfo(data);
    } catch {}
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await window.electronAPI.syncNow();
      if (res.success) {
        setSyncFeedback('تمت المزامنة السحابية بنجاح.');
        await loadInfo();
      } else {
        setSyncFeedback('تعذرت المزامنة: ' + (res.error || 'خطأ غير معروف'));
      }
    } catch (err: any) {
      setSyncFeedback('فشل الاتصال بالسيرفر');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const totalPending =
    (sysInfo?.pendingActivities || 0) +
    (sysInfo?.pendingApps || 0) +
    (sysInfo?.pendingWebsites || 0);

  return (
    <div style={styles.container}>
      {/* Cloud Status Card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server size={18} color="var(--accent-green)" />
            <span style={styles.cardTitle}>اتصال السحابة المركزية</span>
          </div>
          <div style={styles.onlineChip}>
            <span style={styles.greenDot} />
            <span>متصل</span>
          </div>
        </div>

        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>عنوان السيرفر (Endpoint)</span>
          <span style={styles.infoValue}>{sysInfo?.serverUrl || 'https://maxp.online'}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>فترة النبضات الدورية (Heartbeat)</span>
          <span style={styles.infoValue}>كل {sysInfo?.heartbeatIntervalSec || 120} ثانية</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>التشغيل التلقائي مع ويندوز</span>
          <span style={{ ...styles.infoValue, color: 'var(--accent-green)' }}>مفعل تلقائياً (جاهز دائماً)</span>
        </div>
      </div>

      {/* Local Queue Buffer */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={18} color="var(--accent-blue)" />
            <span style={styles.cardTitle}>الذاكرة التخزينية المؤقتة المحلية</span>
          </div>
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            style={styles.syncBtn}
            onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'جاري المزامنة…' : 'مزامنة فورية الآن'}</span>
          </button>
        </div>

        {syncFeedback && (
          <div style={styles.feedbackAlert}>{syncFeedback}</div>
        )}

        <div style={styles.grid3}>
          <div style={styles.subCard}>
            <div style={styles.subCardVal}>{sysInfo?.pendingActivities ?? 0}</div>
            <div style={styles.subCardLabel}>فترات نشاط بانتظار الرفع</div>
          </div>
          <div style={styles.subCard}>
            <div style={styles.subCardVal}>{sysInfo?.pendingApps ?? 0}</div>
            <div style={styles.subCardLabel}>سجلات برامج محلية</div>
          </div>
          <div style={styles.subCard}>
            <div style={styles.subCardVal}>{sysInfo?.pendingWebsites ?? 0}</div>
            <div style={styles.subCardLabel}>سجلات مواقع محلية</div>
          </div>
        </div>
      </div>

      {/* Hardware Telemetry */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={18} color="var(--accent-purple)" />
            <span style={styles.cardTitle}>معلومات الجهاز ونظام التشغيل</span>
          </div>
        </div>

        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>اسم الجهاز (Hostname)</span>
          <span style={styles.infoValue}>{sysInfo?.deviceName || 'جاري التعرف…'}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>نظام التشغيل والمعمارية</span>
          <span style={styles.infoValue}>{sysInfo?.osVersion || 'Windows'}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>إصدار بيئة العمل (Workspace)</span>
          <span style={styles.infoValue}>v{sysInfo?.appVersion || '1.0.0'}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>التحديثات الصامتة التلقائية</span>
          <span style={{ ...styles.infoValue, color: 'var(--accent-blue)' }}>مفعلة (تنزيل صامت في الخلفية)</span>
        </div>
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
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    padding: '14px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  onlineChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
    borderRadius: 12,
    padding: '2px 8px',
    fontSize: 11,
    color: 'var(--accent-green)',
    fontWeight: 600,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--accent-green)',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },
  infoLabel: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums',
  },
  syncBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--bg-hover)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-strong)',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  feedbackAlert: {
    fontSize: 11,
    color: 'var(--accent-green)',
    background: 'var(--accent-green-bg)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    borderRadius: 6,
    padding: '6px 10px',
    marginBottom: 10,
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    marginTop: 8,
  },
  subCard: {
    background: 'var(--bg-sidebar)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: '10px',
    textAlign: 'center',
  },
  subCardVal: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--accent-blue)',
    fontVariantNumeric: 'tabular-nums',
  },
  subCardLabel: {
    fontSize: 10,
    color: 'var(--text-dim)',
    marginTop: 2,
  },
};

export default SystemStatusTab;
