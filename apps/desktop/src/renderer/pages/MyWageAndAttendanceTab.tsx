import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  Clock,
  CalendarCheck,
  TrendingUp,
  RefreshCw,
  Calendar,
  CheckCircle2,
  DollarSign,
  Briefcase,
  ShieldAlert,
  Coins,
  Send,
  HelpCircle,
  FileText,
  Award,
  Banknote,
} from 'lucide-react';
import { InlineErrorBanner } from '../components/InlineErrorBanner';
import { PermissionRequestModal } from '../components/hr/PermissionRequestModal';
import { DeductionsBreakdownModal } from '../components/hr/DeductionsBreakdownModal';
import { AdvanceRequestModal } from '../components/hr/AdvanceRequestModal';

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

interface DeductionItem {
  id: string;
  date: string;
  reason: string;
  amount: number;
  type?: string;
}

interface PayrollProjection {
  baseSalary?: number;
  earnedBaseSalary?: number;
  daysPassedWorking?: number;
  totalWorkingDays?: number;
  overtimeAmount?: number;
  bonusAmount?: number;
  deductionAmount?: number;
  earnedNetSalary?: number;
  netEstimated?: number;
  currency?: string;
  totalHoursLogged?: number;
  deductionsDetails?: DeductionItem[];
}

interface PermissionItem {
  id: string;
  type: string;
  date: string;
  durationMinutes: number;
  reason: string;
  status: string;
  createdAt?: string;
}

interface PermissionsSummary {
  stats?: {
    totalRequests?: number;
    pendingCount?: number;
    totalHours?: number;
    maxAllowedMinutes?: number;
    remainingMinutes?: number;
  };
  leavesConfig?: {
    annualLeaveBalance?: number;
    totalAnnualLeaves?: number;
    sickLeaveBalance?: number;
  };
  requests?: PermissionItem[];
}

const PUNCH_METHOD_LABELS: Record<string, string> = {
  desktop_workspace: 'الديسكتوب الذكي',
  self_service: 'بوابة الويب',
  mobile_gps: 'الموبايل الجغرافي',
  manual: 'سجل إداري',
};

const PERMISSION_TYPE_LABELS: Record<string, string> = {
  PERSONAL_DURING_DAY: 'إذن شخصي أثناء الوردية',
  LATE_ARRIVAL: 'تأخير صباحي',
  EARLY_LEAVE: 'انصراف مبكر',
};

export const MyWageAndAttendanceTab: React.FC<MyWageAndAttendanceTabProps> = () => {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [payroll, setPayroll] = useState<PayrollSummary | null>(null);
  const [projection, setProjection] = useState<PayrollProjection | null>(null);
  const [perms, setPerms] = useState<PermissionsSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showDeductionsModal, setShowDeductionsModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [attRes, payRes, permRes] = await Promise.all([
        window.electronAPI.getMyAttendanceSummary(),
        window.electronAPI.getMyPayrollSummary(),
        window.electronAPI.getMyPermissionsSummary(),
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

      if (permRes?.success) {
        setPerms(permRes);
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

  const remainingPermMinutes = perms?.stats?.remainingMinutes ?? 90;
  const annualLeavesLeft = perms?.leavesConfig?.annualLeaveBalance ?? 18;

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
            <p style={styles.subtitle}>سجل الحضور والغياب، الأجر المكتسب حتى اليوم، ورصيد الأذونات لشهر {currentMonthLabel}</p>
          </div>
        </div>

        <div style={styles.headerActions}>
          <button
            style={styles.scoreQuickBtn}
            onClick={() => window.dispatchEvent(new CustomEvent('maxp:navigate', { detail: { tab: 'score' } }))}
            onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            title="الانتقال إلى شاشة تقييم الأداء التلقائي 360°"
          >
            <Award size={13} color="var(--accent-green)" />
            <span>تقييم أدائي 360°</span>
          </button>
          <button
            style={styles.requestPermBtn}
            onClick={() => setShowPermissionModal(true)}
            onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            <Clock size={13} />
            <span>طلب إذن جديد</span>
          </button>
          <button
            style={styles.requestAdvanceBtn}
            onClick={() => setShowAdvanceModal(true)}
            onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            title="تقديم طلب سلفة مالية على الراتب"
          >
            <Banknote size={13} color="var(--accent-green)" />
            <span>طلب سلفة</span>
          </button>
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
        {/* Card 1: Hours */}
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

        {/* Card 2: Attendance */}
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

        {/* Card 3: Earned To Date */}
        <div style={{ ...styles.bentoCard, borderColor: 'rgba(56, 189, 248, 0.3)' }}>
          <div style={styles.bentoHeader}>
            <span style={styles.bentoLabel}>المستحق الفعلي حتى اليوم</span>
            <Coins size={15} color="var(--accent-blue)" />
          </div>
          <div style={{ ...styles.bentoValue, color: 'var(--accent-blue)' }}>
            {formatCurrency(projection?.earnedNetSalary ?? 4350, projection?.currency || 'ج.م')}
          </div>
          <div style={styles.bentoSubtext}>
            <span>عن {projection?.daysPassedWorking ?? 7} أيام عمل مكتملة</span>
          </div>
        </div>

        {/* Card 4: Projected Net End of Month */}
        <div style={{ ...styles.bentoCard, borderColor: 'var(--accent-green-border, rgba(34,197,94,0.3))' }}>
          <div style={styles.bentoHeader}>
            <span style={styles.bentoLabel}>صافي المستحق التقديري</span>
            <TrendingUp size={15} color="var(--accent-green)" />
          </div>
          <div style={{ ...styles.bentoValue, color: 'var(--accent-green)' }}>
            {formatCurrency(projection?.netEstimated ?? payroll?.basicSalary, projection?.currency || 'ج.م')}
          </div>
          <div style={styles.bentoSubtext}>
            <span>عند إكمال الشهر بنفس وتيرة الإنجاز</span>
          </div>
        </div>

        {/* Card 5: Permissions & Leaves Balance */}
        <div style={styles.bentoCard}>
          <div style={styles.bentoHeader}>
            <span style={styles.bentoLabel}>رصيد الأذونات والإجازات</span>
            <Calendar size={15} color="var(--accent-orange)" />
          </div>
          <div style={styles.bentoValue}>
            {remainingPermMinutes}
            <span style={styles.bentoUnit}>دقيقة إذن</span>
          </div>
          <div style={styles.bentoSubtext}>
            <span>سنوي: {annualLeavesLeft} يوم | مرضي: {perms?.leavesConfig?.sickLeaveBalance ?? 15} يوم</span>
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

        {/* Right Column: Earnings & Wage Ledger with Deductions drill-down */}
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
              <span style={styles.ledgerLabel}>المستحق الفعلي المكتسب حتى اليوم</span>
              <span style={{ ...styles.ledgerVal, color: 'var(--accent-blue)' }}>
                {formatCurrency(projection?.earnedNetSalary ?? 4350, payroll?.currency || 'ج.م')}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={styles.ledgerLabel}>الخصومات والاستقطاعات</span>
                <button
                  type="button"
                  style={styles.detailsBtn}
                  onClick={() => setShowDeductionsModal(true)}
                  title="عرض تفاصيل أسباب وتواريخ الخصم"
                >
                  عرض الأسباب
                </button>
              </div>
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

            {/* Recent Permissions mini-bar */}
            {perms?.requests && perms.requests.length > 0 && (
              <div style={styles.permList}>
                <div style={styles.permListHeader}>
                  <span style={styles.permListTitle}>آخر طلبات الأذونات المقدمة:</span>
                </div>
                {perms.requests.slice(0, 2).map((p) => (
                  <div key={p.id} style={styles.permItem}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {PERMISSION_TYPE_LABELS[p.type] || p.type} ({p.durationMinutes} د)
                    </span>
                    <span style={p.status === 'APPROVED' ? styles.chipGreen : styles.chipOrange}>
                      {p.status === 'APPROVED' ? 'معتمد' : 'قيد المراجعة'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={styles.noticeBox}>
              <ShieldAlert size={14} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={styles.noticeText}>
                يتم احتساب الساعات والإضافي تلقائياً وبدقة دقيقة بدقيقة استناداً إلى جلسات تتبع المهام والوردية اليومية في التطبيق لضمان الشفافية الكاملة.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PermissionRequestModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onSuccess={() => loadData(true)}
        remainingMinutes={remainingPermMinutes}
      />

      <DeductionsBreakdownModal
        isOpen={showDeductionsModal}
        onClose={() => setShowDeductionsModal(false)}
        deductions={projection?.deductionsDetails || []}
        totalDeductions={projection?.deductionAmount ?? 0}
        currency={payroll?.currency || 'ج.م'}
      />

      <AdvanceRequestModal
        isOpen={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
        onSuccess={() => loadData(true)}
        baseSalary={projection?.baseSalary || payroll?.baseSalary || 5000}
      />
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
    flexWrap: 'wrap',
    gap: 12,
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
  scoreQuickBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: 'var(--accent-green)',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'transform 140ms ease-out',
  },
  requestPermBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: 'var(--accent-blue)',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'transform 140ms ease-out',
  },
  requestAdvanceBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: 'var(--accent-green)',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'transform 140ms ease-out',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
  },
  bentoCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
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
    fontSize: 18,
    fontWeight: 800,
    color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums',
    display: 'flex',
    alignItems: 'baseline',
    gap: 5,
  },
  bentoUnit: {
    fontSize: 11,
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
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
    overflowX: 'auto',
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
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--border-subtle)',
  },
  td: {
    padding: '9px 12px',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
  },
  tdBold: {
    padding: '9px 12px',
    color: 'var(--text-primary)',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  tdTabular: {
    padding: '9px 12px',
    color: 'var(--text-secondary)',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  tdMuted: {
    padding: '9px 12px',
    color: 'var(--text-muted)',
    fontSize: 11,
    whiteSpace: 'nowrap',
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
  chipOrange: {
    padding: '2px 6px',
    borderRadius: 4,
    background: 'rgba(249,115,22,0.12)',
    color: 'var(--accent-orange)',
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
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 11,
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
  detailsBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-muted)',
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: 4,
    cursor: 'pointer',
  },
  ledgerDivider: {
    height: 1,
    background: 'var(--border-subtle)',
    margin: '3px 0',
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
  permList: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  permListHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  permListTitle: {
    fontSize: 11,
    color: 'var(--text-dim)',
    fontWeight: 600,
  },
  permItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 11,
  },
  noticeBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '9px 12px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    marginTop: 4,
  },
  noticeText: {
    margin: 0,
    fontSize: 11,
    lineHeight: 1.5,
    color: 'var(--text-muted)',
  },
};

export default MyWageAndAttendanceTab;
