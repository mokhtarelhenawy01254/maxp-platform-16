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
          borderColor: hasDelay ? 'rgba(234, 179, 8, 0.3)' : 'rgba(34, 197, 94, 0.3)',
          background: hasDelay ? 'rgba(234, 179, 8, 0.06)' : 'rgba(34, 197, 94, 0.06)',
        }}
      >
        <div style={styles.bannerIcon}>
          {hasDelay ? (
            <AlertTriangle size={20} color="#eab308" />
          ) : (
            <CheckCircle2 size={20} color="#22c55e" />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={styles.bannerTitle}>
            {hasDelay
              ? `يوجد فارق زمني بين الحضور وبدء النشاط (${lateMinutes} دقيقة)`
              : 'مطابقة الحضور والنشاط الفعلي ممتازة ومطابقة للسياسة'}
          </div>
          <div style={styles.bannerDesc}>
            {hasDelay
              ? 'تم تسجيل بصمة الحضور عبر الهاتف مسبقاً، بينما بدأ أول تفاعل على جهاز الكمبيوتر بعد ذلك.'
              : 'بدأ التفاعل والعمل على الجهاز فور تسجيل الحضور.'}
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      <div style={styles.grid}>
        {/* Mobile Clock In */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Smartphone size={16} color="#38bdf8" />
            <span style={styles.cardTitle}>تسجيل الحضور (تطبيق الهاتف)</span>
          </div>
          <div style={styles.cardValue}>{formatClock(auditData?.clockInTime)}</div>
          <div style={styles.cardDesc}>وقت البصمة الجغرافية المعتمد</div>
        </div>

        {/* First PC Activity */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Monitor size={16} color="#22c55e" />
            <span style={styles.cardTitle}>أول نشاط على الكمبيوتر</span>
          </div>
          <div style={styles.cardValue}>{formatClock(auditData?.firstActivityTime)}</div>
          <div style={styles.cardDesc}>أول حركة للماوس أو ضغطة مفتاح</div>
        </div>

        {/* Gap Discrepancy */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Clock size={16} color={hasDelay ? '#eab308' : '#22c55e'} />
            <span style={styles.cardTitle}>فارق بدء النشاط</span>
          </div>
          <div
            style={{
              ...styles.cardValue,
              color: hasDelay ? '#eab308' : '#22c55e',
            }}
          >
            {lateMinutes > 0 ? `${lateMinutes} دقيقة` : 'متطابق تماماً'}
          </div>
          <div style={styles.cardDesc}>الفارق بين البصمة والحركة الفعلية</div>
        </div>

        {/* Last Activity */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Monitor size={16} color="#a855f7" />
            <span style={styles.cardTitle}>آخر تفاعل مسجل</span>
          </div>
          <div style={styles.cardValue}>{formatClock(auditData?.lastActivityTime)}</div>
          <div style={styles.cardDesc}>آخر إشارة تفاعل مسجلة بالجهاز</div>
        </div>
      </div>

      {/* Audit Policy Notice */}
      <div style={styles.policyBox}>
        <div style={styles.policyHeader}>
          <Info size={15} color="#38bdf8" />
          <span style={styles.policyTitle}>ما هي آلية مطابقة الحضور الذكية؟</span>
        </div>
        <p style={styles.policyText}>
          تقوم منظومة MaxP تلقائياً بمطابقة وقت تسجيل الحضور الجغرافي (عبر تطبيق الموبايل) مع أول نشاط فيزيائي مسجل على حاسوب الموظف. يساعد هذا التدقيق الإدارات على تقييم الانضباط الفعلي، وحساب ساعات العمل المنتجة بدقة وشفافية كاملة دون الحاجة لتقارير ورقية.
        </p>
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
