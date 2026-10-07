import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  Clock,
  CalendarCheck,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Calendar,
  CheckCircle2,
  DollarSign,
  Briefcase,
  ShieldAlert,
} from 'lucide-react';
import { InlineErrorBanner } from '../components/InlineErrorBanner';

interface MyWageAndAttendanceTabProps {
  user?: any;
  serverUrl?: string;
}

interface AttendanceStats {
  presentDays?: number;
  absentDays?: number;
  lateDays?: number;
  totalWorkHours?: number;
  overtimeHours?: number;
}

interface AttendanceRecord {
  id: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  method?: string;
  status?: string;
  workHours?: number;
  overtimeHours?: number;
}

interface PayrollSummary {
  month?: string;
  basicSalary?: number;
  hourlyRate?: number;
  currency?: string;
  salaryType?: string;
}

interface PayrollProjection {
  baseSalary?: number;
  overtimeAmount?: number;
  bonusAmount?: number;
  deductionAmount?: number;
  netEstimated?: number;
  currency?: string;
  totalHoursLogged?: number;
}

const PUNCH_METHOD_LABELS: Record<string, string> = {
  desktop_workspace: 'الديسكتوب الذكي',
  self_service: 'بوابة الويب',
  mobile_gps: 'الموبايل الجغرافي',
  manual: 'سجل إداري',
};

export const MyWageAndAttendanceTab: React.FC<MyWageAndAttendanceTabProps> = ({ user }) => {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [payroll, setPayroll] = useState<PayrollSummary | null>(null);
  const [projection, setProjection] = useState<PayrollProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [attRes, payRes] = await Promise.all([
        window.electronAPI.getMyAttendanceSummary(),
        window.electronAPI.getMyPayrollSummary(),
      ]);

      if (attRes?.success) {
        setStats(attRes.stats || null);
        setRecords(attRes.recent || []);
      } else if (attRes?.error) {
        setError(attRes.error);
      }

      if (payRes?.success) {
        setPayroll(payRes.payroll || null);
        setProjection(payRes.projection || null);
      } else if (payRes?.error && !error) {
        setError(payRes.error);
      }
    } catch (err: any) {
      setError(err?.message || 'تعذر استرجاع بيانات الحضور والمستحقات.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 60_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const formatCurrency = (val?: number, curr = 'ج.م') => {
    if (val === undefined || val === null) return '—';
    return `${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${curr}`;
  };

  const formatTimeStr = (iso?: string | null) => {
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

  const formatDateStr = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('ar-EG-u-nu-latn', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const currentMonthLabel = new Date().toLocaleDateString('ar-EG-u-nu-latn', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div style={styles.container}>
      {/* Top Header Control Surface */}
      <div style={styles.header}>
        <div style={styles.headerTitleGroup}>
          <div style={styles.iconWrapper}>
            <Wallet size={18} color="var(--accent-green)" />
          </div>
          <div>
            <h1 style={styles.title}>حضوري ومستحقاتي</h1>
            <p style={styles.subtitle}>سجل الحضور اليومي واحتساب الأجر وساعات العمل لشهر {currentMonthLabel}</p>
          </div>
        </div>

        <div style={styles.headerActions}>
          <div style={styles.monthBadge}>
            <Calendar size={13} color="var(--text-muted)" />
            <span>{currentMonthLabel}</span>
          </div>
          <button
            style={styles.refreshBtn}
            onClick={() => loadData(true)}
            disabled={refreshing}
            aria-label="تحديث البيانات"
            title="تحديث البيانات"
          >
            <RefreshCw size={14} color="var(--text-muted)" className={refreshing ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 12 }}>
          <InlineErrorBanner error={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* KPI Bento Grid */}
      <div style={styles.bentoGrid}>
        <div style={styles.bentoCard}>
          <div style={styles.bentoHeader}>
            <span style={styles.bentoLabel}>ساعات العمل الموثقة</span>
            <Clock size={15} color="var(--accent-blue)" />
          </div>
          <div style={styles.bentoValue}>
            {stats?.totalWorkHours ?? 0}
            <span style={styles.bentoUnit}>ساعة</span>
          </div>
          <div style={styles.bentoSubtext}>
            <span>إضافي: </span>
            <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{stats?.overtimeHours ?? 0} س</span>
          </div>
        </div>

        <div style={styles.bentoCard}>
          <div style={styles.bentoHeader}>
            <span style={styles.bentoLabel}>سجل الالتزام والحضور</span>
            <CalendarCheck size={15} color="var(--accent-green)" />
          </div>
          <div style={styles.bentoValue}>
            {stats?.presentDays ?? 0}
            <span style={styles.bentoUnit}>أيام حضور</span>
          </div>
          <div style={styles.bentoSubtext}>
            <span>تأخير: {stats?.lateDays ?? 0}</span>
            <span style={{ margin: '0 6px' }}>•</span>
            <span>غياب: {stats?.absentDays ?? 0}</span>
          </div>
        </div>

        <div style={styles.bentoCard}>
          <div style={styles.bentoHeader}>
            <span style={styles.bentoLabel}>الراتب الأساسي المعتمد</span>
            <Briefcase size={15} color="var(--accent-orange)" />
          </div>
          <div style={styles.bentoValue}>
            {formatCurrency(payroll?.basicSalary ?? projection?.baseSalary, payroll?.currency || 'ج.م')}
          </div>
          <div style={styles.bentoSubtext}>
            <span>معدل الساعة: {formatCurrency(payroll?.hourlyRate, payroll?.currency || 'ج.م')}/س</span>
          </div>
        </div>

        <div style={{ ...styles.bentoCard, borderColor: 'var(--accent-green-border, rgba(34,197,94,0.3))' }}>
          <div style={styles.bentoHeader}>
            <span style={styles.bentoLabel}>صافي المستحق التقديري</span>
            <TrendingUp size={15} color="var(--accent-green)" />
          </div>
          <div style={{ ...styles.bentoValue, color: 'var(--accent-green)' }}>
            {formatCurrency(projection?.netEstimated ?? payroll?.basicSalary, projection?.currency || 'ج.م')}
          </div>
          <div style={styles.bentoSubtext}>
            <span>حسب ساعات الإنجاز والإضافي حتى اللحظة</span>
          </div>
        </div>
      </div>

      {/* Main Single-Surface Workspace Grid */}
      <div style={styles.workspaceGrid}>
        {/* Left Column: Attendance Telemetry Records */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div style={styles.panelTitleGroup}>
              <CheckCircle2 size={15} color="var(--accent-blue)" />
              <h2 style={styles.panelTitle}>سجل الحضور والانصراف للأيام الأخيرة</h2>
            </div>
            <span style={styles.badge}>{records.length} يوم موثق</span>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>التاريخ</th>
                  <th style={styles.th}>الحضور</th>
                  <th style={styles.th}>الانصراف</th>
                  <th style={styles.th}>الساعات</th>
                  <th style={styles.th}>الوسيلة</th>
                  <th style={styles.th}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={styles.emptyTd}>
                      {loading ? 'جاري تحميل السجلات…' : 'لا توجد سجلات حضور مسجلة لهذا الشهر حتى الآن.'}
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr key={rec.id} style={styles.tr}>
                      <td style={styles.tdBold}>{formatDateStr(rec.date)}</td>
                      <td style={styles.tdTabular}>{formatTimeStr(rec.clockIn)}</td>
                      <td style={styles.tdTabular}>{formatTimeStr(rec.clockOut)}</td>
                      <td style={styles.tdTabular}>
                        {rec.workHours ? `${rec.workHours} س` : '—'}
                        {rec.overtimeHours ? ` (+${rec.overtimeHours} إضافي)` : ''}
                      </td>
                      <td style={styles.tdMuted}>{PUNCH_METHOD_LABELS[rec.method || ''] || rec.method || 'تلقائي'}</td>
                      <td style={styles.td}>
                        <span style={rec.status === 'ABSENT' ? styles.chipRed : styles.chipGreen}>
                          {rec.status === 'ABSENT' ? 'غياب' : rec.status === 'LATE' ? 'تأخير' : 'حاضر'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Earnings & Wage Breakdown Breakdown */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div style={styles.panelTitleGroup}>
              <DollarSign size={15} color="var(--accent-green)" />
              <h2 style={styles.panelTitle}>تفصيل المستحقات والحسبة المالية</h2>
            </div>
            <span style={styles.badgeGreen}>محدث تلقائياً</span>
          </div>

          <div style={styles.ledgerBody}>
            <div style={styles.ledgerRow}>
              <span style={styles.ledgerLabel}>الراتب الأساسي التعاقدي</span>
              <span style={styles.ledgerVal}>
                {formatCurrency(payroll?.basicSalary ?? projection?.baseSalary, payroll?.currency || 'ج.م')}
              </span>
            </div>

            <div style={styles.ledgerRow}>
              <span style={styles.ledgerLabel}>أجر الساعات الإضافية (Overtime)</span>
              <span style={{ ...styles.ledgerVal, color: 'var(--accent-green)' }}>
                +{formatCurrency(projection?.overtimeAmount ?? 0, payroll?.currency || 'ج.م')}
              </span>
            </div>

            <div style={styles.ledgerRow}>
              <span style={styles.ledgerLabel}>الحوافز والمكافآت المعتمدة</span>
              <span style={{ ...styles.ledgerVal, color: 'var(--accent-green)' }}>
                +{formatCurrency(projection?.bonusAmount ?? 0, payroll?.currency || 'ج.م')}
              </span>
            </div>

            <div style={styles.ledgerRow}>
              <span style={styles.ledgerLabel}>الخصومات والاستقطاعات</span>
              <span style={{ ...styles.ledgerVal, color: 'var(--accent-red)' }}>
                -{formatCurrency(projection?.deductionAmount ?? 0, payroll?.currency || 'ج.م')}
              </span>
            </div>

            <div style={styles.ledgerDivider} />

            <div style={styles.netRow}>
              <div>
                <span style={styles.netLabel}>صافي المستحق المتوقع نهاية الشهر</span>
                <p style={styles.netSubtext}>يتم الإيداع المباشر وفق دورة الصرف المؤسسية</p>
              </div>
              <div style={styles.netVal}>
                {formatCurrency(projection?.netEstimated ?? payroll?.basicSalary, projection?.currency || 'ج.م')}
              </div>
            </div>

            <div style={styles.noticeBox}>
              <ShieldAlert size={14} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={styles.noticeText}>
                يتم احتساب الساعات والإضافي تلقائياً وبدقة دقيقة بدقيقة استناداً إلى جلسات تتبع المهام والوردية اليومية في التطبيق لضمان الشفافية الكاملة.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '16px 20px',
    overflowY: 'auto',
    gap: 16,
    background: 'var(--bg-main)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottom: '1px solid var(--border-subtle)',
  },
  headerTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  subtitle: {
    margin: '3px 0 0',
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  monthBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    padding: '5px 10px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  refreshBtn: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: '6px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: 12,
  },
  bentoCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  bentoHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bentoLabel: {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  bentoValue: {
    fontSize: 20,
    fontWeight: 800,
    color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums',
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
  },
  bentoUnit: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-muted)',
  },
  bentoSubtext: {
    fontSize: 11,
    color: 'var(--text-dim)',
    fontVariantNumeric: 'tabular-nums',
  },
  workspaceGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',
    gap: 14,
    alignItems: 'start',
  },
  panel: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface)',
  },
  panelTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  panelTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-secondary)',
    fontVariantNumeric: 'tabular-nums',
  },
  badgeGreen: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 4,
    background: 'rgba(34,197,94,0.12)',
    color: 'var(--accent-green)',
  },
  tableWrapper: {
    maxHeight: 380,
    overflowY: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
    textAlign: 'right',
  },
  th: {
    padding: '8px 12px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface)',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  tr: {
    borderBottom: '1px solid var(--border-subtle)',
  },
  td: {
    padding: '9px 12px',
    color: 'var(--text-secondary)',
  },
  tdBold: {
    padding: '9px 12px',
    color: 'var(--text-primary)',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
  tdTabular: {
    padding: '9px 12px',
    color: 'var(--text-secondary)',
    fontVariantNumeric: 'tabular-nums',
  },
  tdMuted: {
    padding: '9px 12px',
    color: 'var(--text-muted)',
    fontSize: 11,
  },
  emptyTd: {
    padding: '30px 14px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: 12,
  },
  chipGreen: {
    padding: '2px 6px',
    borderRadius: 4,
    background: 'rgba(34,197,94,0.12)',
    color: 'var(--accent-green)',
    fontSize: 11,
    fontWeight: 600,
  },
  chipRed: {
    padding: '2px 6px',
    borderRadius: 4,
    background: 'rgba(239,68,68,0.12)',
    color: 'var(--accent-red)',
    fontSize: 11,
    fontWeight: 600,
  },
  ledgerBody: {
    padding: '16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  ledgerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 13,
  },
  ledgerLabel: {
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  ledgerVal: {
    color: 'var(--text-primary)',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  ledgerDivider: {
    height: 1,
    background: 'var(--border-subtle)',
    margin: '4px 0',
  },
  netRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: 'rgba(34,197,94,0.06)',
    border: '1px solid var(--accent-green-border, rgba(34,197,94,0.2))',
    borderRadius: 6,
  },
  netLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  netSubtext: {
    margin: '2px 0 0',
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  netVal: {
    fontSize: 18,
    fontWeight: 800,
    color: 'var(--accent-green)',
    fontVariantNumeric: 'tabular-nums',
  },
  noticeBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '10px 12px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    marginTop: 6,
  },
  noticeText: {
    margin: 0,
    fontSize: 11,
    lineHeight: 1.5,
    color: 'var(--text-muted)',
  },
};

export default MyWageAndAttendanceTab;
