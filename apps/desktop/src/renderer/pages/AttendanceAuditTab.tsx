import React, { useState, useEffect } from 'react';
import {
  Clock,
  Smartphone,
  Monitor,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowRight,
} from 'lucide-react';

interface AttendanceAuditTabProps {
  formatTime: (sec: number) => string;
}

export const AttendanceAuditTab: React.FC<AttendanceAuditTabProps> = ({ formatTime }) => {
  const [auditData, setAuditData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAudit();
    const interval = setInterval(loadAudit, 20_000);
    return () => clearInterval(interval);
  }, []);

  const loadAudit = async () => {
    try {
      const data = await window.electronAPI.getAttendanceAudit();
      setAuditData(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const formatClock = (iso?: string | null) => {
    if (!iso) return 'لم يسجل بعد';
    try {
      return new Date(iso).toLocaleTimeString('ar-EG-u-nu-latn', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'غير صالح';
    }
  };

  const lateSeconds = auditData?.lateStartSeconds ?? 0;
  const lateMinutes = Math.floor(lateSeconds / 60);

  const isMatched = lateMinutes <= 5;
  const hasDelay = lateMinutes > 5;

  return (
    <div style={styles.container}>
      {/* Top Banner: Verification Status */}
      <div
        style={{
          ...styles.banner,
          borderColor: hasDelay ? 'rgba(234, 179, 8, 0.25)' : 'var(--accent-green-border)',
          background: hasDelay ? 'rgba(234, 179, 8, 0.05)' : 'var(--accent-green-bg)',
        }}
      >
        <div style={styles.bannerIcon}>
          {hasDelay ? (
            <AlertTriangle size={18} color="var(--accent-yellow)" />
          ) : (
            <CheckCircle2 size={18} color="var(--accent-green)" />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={styles.bannerTitle}>
            {hasDelay
              ? `فارق توقيت مسجل (${lateMinutes} دقيقة) بين بصمة الهاتف والنشاط الفعلي`
              : 'مطابقة تامة بين بصمة الحضور وأول تفاعل على الحاسوب'}
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      <div style={styles.grid}>
        {/* Mobile Clock In */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Smartphone size={15} color="var(--accent-blue)" />
            <span style={styles.cardTitle}>بصمة الهاتف الجغرافية</span>
          </div>
          <div style={styles.cardValue}>{formatClock(auditData?.clockInTime)}</div>
          <div style={styles.cardDesc}>توقيت التسجيل المعتمد</div>
        </div>

        {/* First PC Activity */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Monitor size={15} color="var(--accent-green)" />
            <span style={styles.cardTitle}>أول نشاط على الجهاز</span>
          </div>
          <div style={styles.cardValue}>{formatClock(auditData?.firstActivityTime)}</div>
          <div style={styles.cardDesc}>أول حركة ماوس أو نقرة مفاتيح</div>
        </div>

        {/* Gap Discrepancy */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Clock size={15} color={hasDelay ? 'var(--accent-yellow)' : 'var(--accent-green)'} />
            <span style={styles.cardTitle}>الفارق الزمني</span>
          </div>
          <div
            style={{
              ...styles.cardValue,
              color: hasDelay ? 'var(--accent-yellow)' : 'var(--accent-green)',
            }}
          >
            {lateMinutes > 0 ? `${lateMinutes} دقيقة` : 'متطابق بالكامل'}
          </div>
          <div style={styles.cardDesc}>بين البصمة والعمل الفعلي</div>
        </div>

        {/* Last Activity */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Monitor size={15} color="var(--accent-purple)" />
            <span style={styles.cardTitle}>آخر تفاعل مسجل</span>
          </div>
          <div style={styles.cardValue}>{formatClock(auditData?.lastActivityTime)}</div>
          <div style={styles.cardDesc}>آخر إشارة نشاط مؤكدة</div>
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
  },
  bannerDesc: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  grid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gridTemplateRows: 'repeat(2, 1fr)',
    gap: 10,
    minHeight: 220,
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
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 12,
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums',
  },
  cardDesc: {
    fontSize: 11,
    color: 'var(--text-dim)',
    marginTop: 4,
  },
  policyBox: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    padding: '14px',
  },
  policyHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  policyText: {
    fontSize: 12,
    color: 'var(--text-muted)',
    lineHeight: 1.6,
  },
};

export default AttendanceAuditTab;
