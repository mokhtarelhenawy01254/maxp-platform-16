import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Smartphone,
  Monitor,
  AlertTriangle,
  CheckCircle2,
  Hourglass,
  RefreshCw,
  LogIn,
} from 'lucide-react';

interface AttendanceAuditTabProps {}

interface AuditData {
  date: string;
  clockInTime: string | null;
  clockInMethod?: string | null;
  firstActivityTime: string | null;
  clockOutTime: string | null;
  lastActivityTime: string | null;
  lateStartSeconds: number;
  totalActiveSeconds: number;
  totalIdleSeconds: number;
}

const PUNCH_LABELS: Record<string, string> = {
  self_service: 'بصمة جغرافية من الويب',
  desktop_workspace: 'بصمة تلقائية من هذا الجهاز',
  manual: 'تسجيل يدوي من الإدارة',
  mobile_gps: 'بصمة الموبايل الجغرافية',
};

export const AttendanceAuditTab: React.FC<AttendanceAuditTabProps> = () => {
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceType, setDeviceType] = useState<'OFFICE' | 'PERSONAL'>('PERSONAL');
  const [clockingIn, setClockingIn] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadAudit = useCallback(async () => {
    try {
      const data = await window.electronAPI.getAttendanceAudit();
      setAuditData(data);
    } catch {
      // keep previous data on transient failures — banner only lies when we have nothing at all
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAudit();
    const interval = setInterval(loadAudit, 20_000);
    return () => clearInterval(interval);
  }, [loadAudit]);

  useEffect(() => {
    window.electronAPI.getDeviceInfo?.().then((info: any) => {
      if (info?.deviceType) setDeviceType(info.deviceType);
    }).catch(() => {});
  }, []);

  const handleClockIn = async () => {
    setClockingIn(true);
    setActionError(null);
    try {
      const res = await window.electronAPI.clockIn();
      if (!res?.success) {
        setActionError(res?.error || 'تعذر تسجيل الحضور، حاول تاني.');
      } else {
        await loadAudit();
      }
    } catch {
      setActionError('تعذر تسجيل الحضور، حاول تاني.');
    } finally {
      setClockingIn(false);
    }
  };

  const formatClock = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleTimeString('ar-EG-u-nu-latn', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  const formatDuration = (sec: number) => {
    if (!sec || sec < 1) return '0د';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}س ${m}د`;
    if (m > 0) return `${m}د`;
    return `${sec}ث`;
  };

  const clockInTime = auditData?.clockInTime ?? null;
  const firstActivityTime = auditData?.firstActivityTime ?? null;
  const lateMinutes = Math.floor((auditData?.lateStartSeconds ?? 0) / 60);
  const hasPunch = !!clockInTime;
  const waitingForActivity = hasPunch && !firstActivityTime;
  const hasDelay = hasPunch && !!firstActivityTime && lateMinutes > 5;
  const isMatched = hasPunch && !!firstActivityTime && lateMinutes <= 5;

  const banner = (() => {
    if (loading && !auditData) {
      return {
        tone: 'neutral' as const,
        icon: <Hourglass size={18} color="var(--text-muted)" />,
        title: 'بيتم جلب بيانات المطابقة…',
      };
    }
    if (!hasPunch) {
      return {
        tone: 'neutral' as const,
        icon: <Clock size={18} color="var(--text-muted)" />,
        title: 'لسه مفيش بصمة حضور مسجلة النهارده',
      };
    }
    if (waitingForActivity) {
      return {
        tone: 'info' as const,
        icon: <Hourglass size={18} color="var(--accent-blue)" />,
        title: 'البصمة اتسجلت — مستنيين أول نشاط على الجهاز للمطابقة',
      };
    }
    if (hasDelay) {
      return {
        tone: 'warn' as const,
        icon: <AlertTriangle size={18} color="var(--accent-yellow)" />,
        title: `فارق ${lateMinutes} دقيقة بين بصمة الحضور وأول نشاط فعلي على الجهاز`,
      };
    }
    return {
      tone: 'ok' as const,
      icon: <CheckCircle2 size={18} color="var(--accent-green)" />,
      title: 'مطابقة تامة بين بصمة الحضور وأول تفاعل على الحاسوب',
    };
  })();

  const bannerTone = {
    ok: {
      border: 'var(--accent-green-border)',
      background: 'var(--accent-green-bg)',
    },
    warn: {
      border: 'rgba(234, 179, 8, 0.25)',
      background: 'rgba(234, 179, 8, 0.05)',
    },
    info: {
      border: 'var(--border-default)',
      background: 'var(--bg-surface)',
    },
    neutral: {
      border: 'var(--border-subtle)',
      background: 'var(--bg-surface)',
    },
  }[banner.tone];

  const punchLabel = PUNCH_LABELS[auditData?.clockInMethod || ''] || 'بصمة الحضور';

  return (
    <div style={styles.container}>
      {/* Status banner + actions */}
      <div style={{ ...styles.banner, borderColor: bannerTone.border, background: bannerTone.background }}>
        <div style={styles.bannerIcon}>{banner.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.bannerTitle}>{banner.title}</div>
          {!hasPunch && deviceType === 'PERSONAL' && (
            <div style={styles.bannerHint}>
              بصمة الحضور بتتسجل من صفحة الحضور على الويب أو تطبيق الموبايل الجغرافي.
            </div>
          )}
          {actionError && <div style={styles.actionError}>{actionError}</div>}
        </div>
        {!hasPunch && deviceType === 'OFFICE' && (
          <button
            style={styles.clockInButton}
            onClick={handleClockIn}
            disabled={clockingIn}
            onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            <LogIn size={14} />
            {clockingIn ? 'جاري التسجيل…' : 'تسجيل حضور الآن'}
          </button>
        )}
        <button
          style={styles.refreshButton}
          onClick={loadAudit}
          aria-label="تحديث بيانات المطابقة"
          title="تحديث"
        >
          <RefreshCw size={14} color="var(--text-muted)" />
        </button>
      </div>

      {/* The comparison itself: punch ↔ first activity on one surface */}
      {hasPunch ? (
        <div style={styles.compare}>
          <div style={styles.anchor}>
            <Smartphone size={15} color="var(--accent-blue)" />
            <span style={styles.anchorLabel}>{punchLabel}</span>
            <span style={styles.anchorValue}>{formatClock(clockInTime)}</span>
          </div>

          <div style={styles.connector}>
            <div style={styles.connectorLine} />
            <span
              style={{
                ...styles.gapChip,
                color: hasDelay
                  ? 'var(--accent-yellow)'
                  : isMatched
                    ? 'var(--accent-green)'
                    : 'var(--text-muted)',
              }}
            >
              {waitingForActivity
                ? '…'
                : lateMinutes > 0
                  ? `فارق ${lateMinutes} د`
                  : 'متطابق'}
            </span>
            <div style={styles.connectorLine} />
          </div>

          <div style={styles.anchor}>
            <Monitor size={15} color="var(--accent-green)" />
            <span style={styles.anchorLabel}>أول نشاط على الجهاز</span>
            <span style={styles.anchorValue}>{formatClock(firstActivityTime)}</span>
          </div>
        </div>
      ) : (
        !loading && (
          <div style={styles.emptyHint}>
            أول ما تتسجل البصمة هيظهر هنا مقارنة وقتها بأول نشاط فعلي على الجهاز.
          </div>
        )
      )}

      {/* Day telemetry: the «activity» side of the audit */}
      <div style={styles.statsRow}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>آخر تفاعل</span>
          <span style={styles.statValue}>{formatClock(auditData?.lastActivityTime)}</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.stat}>
          <span style={styles.statLabel}>الخروج</span>
          <span style={styles.statValue}>{formatClock(auditData?.clockOutTime)}</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.stat}>
          <span style={styles.statLabel}>نشط اليوم</span>
          <span style={styles.statValue}>{formatDuration(auditData?.totalActiveSeconds ?? 0)}</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.stat}>
          <span style={styles.statLabel}>خامل</span>
          <span style={styles.statValue}>{formatDuration(auditData?.totalIdleSeconds ?? 0)}</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflowY: 'auto',
  },
  banner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    border: '1px solid',
    borderRadius: 8,
    padding: '12px 14px',
  },
  bannerIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    textWrap: 'balance',
  },
  bannerHint: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 3,
  },
  actionError: {
    fontSize: 11,
    color: 'var(--accent-red, #ef4444)',
    marginTop: 3,
  },
  clockInButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--accent-green)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '7px 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'transform 160ms ease-out',
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: 6,
    cursor: 'pointer',
    transition: 'transform 160ms ease-out',
  },
  compare: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '16px 14px',
  },
  anchor: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    minWidth: 0,
  },
  anchorLabel: {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  anchorValue: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.1,
  },
  connector: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 40,
  },
  connectorLine: {
    flex: 1,
    height: 1,
    background: 'var(--border-default)',
  },
  gapChip: {
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  },
  emptyHint: {
    fontSize: 12,
    color: 'var(--text-dim)',
    padding: '8px 14px',
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    borderTop: '1px solid var(--border-subtle)',
    padding: '12px 14px 0',
    marginTop: 'auto',
  },
  stat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: 'var(--text-dim)',
    fontWeight: 500,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    fontVariantNumeric: 'tabular-nums',
  },
  statDivider: {
    width: 1,
    height: 24,
    background: 'var(--border-subtle)',
    margin: '0 8px',
  },
};

export default AttendanceAuditTab;
