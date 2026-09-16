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
      return new Date(iso).toLocaleTimeString('ar-EG', {
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
          borderColor: hasDelay ? 'rgba(234, 179, 8, 0.25)' : 'rgba(34, 197, 94, 0.25)',
          background: hasDelay ? 'rgba(234, 179, 8, 0.05)' : 'rgba(34, 197, 94, 0.05)',
        }}
      >
        <div style={styles.bannerIcon}>
          {hasDelay ? (
            <AlertTriangle size={18} color="#eab308" />
          ) : (
            <CheckCircle2 size={18} color="#22c55e" />
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
            <Smartphone size={15} color="#38bdf8" />
            <span style={styles.cardTitle}>بصمة الهاتف الجغرافية</span>
          </div>
          <div style={styles.cardValue}>{formatClock(auditData?.clockInTime)}</div>
          <div style={styles.cardDesc}>توقيت التسجيل المعتمد</div>
        </div>

        {/* First PC Activity */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Monitor size={15} color="#22c55e" />
            <span style={styles.cardTitle}>أول نشاط على الجهاز</span>
          </div>
          <div style={styles.cardValue}>{formatClock(auditData?.firstActivityTime)}</div>
          <div style={styles.cardDesc}>أول حركة ماوس أو نقرة مفاتيح</div>
        </div>

        {/* Gap Discrepancy */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Clock size={15} color={hasDelay ? '#eab308' : '#22c55e'} />
            <span style={styles.cardTitle}>الفارق الزمني</span>
          </div>
          <div
            style={{
              ...styles.cardValue,
              color: hasDelay ? '#eab308' : '#22c55e',
            }}
          >
            {lateMinutes > 0 ? `${lateMinutes} دقيقة` : 'متطابق بالكامل'}
          </div>
          <div style={styles.cardDesc}>بين البصمة والعمل الفعلي</div>
        </div>

        {/* Last Activity */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Monitor size={15} color="#a855f7" />
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
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
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
    color: '#fafafa',
  },
  bannerDesc: {
    fontSize: 11,
    color: '#a1a1aa',
    marginTop: 2,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
  },
  card: {
    background: '#121216',
    border: '1px solid rgba(255, 255, 255, 0.08)',
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
    color: '#a1a1aa',
    fontWeight: 500,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 700,
    color: '#fafafa',
    fontVariantNumeric: 'tabular-nums',
  },
  cardDesc: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 4,
  },
  policyBox: {
    background: '#121216',
    border: '1px solid rgba(255, 255, 255, 0.06)',
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
    color: '#e4e4e7',
  },
  policyText: {
    fontSize: 12,
    color: '#a1a1aa',
    lineHeight: 1.6,
  },
};

export default AttendanceAuditTab;
