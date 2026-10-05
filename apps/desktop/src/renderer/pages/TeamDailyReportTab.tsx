import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Download,
  Copy,
  Check,
  Search,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

interface MemberDay {
  employeeId: string;
  name: string;
  department: string;
  jobTitle: string;
  completedCount: number;
  openCount: number;
  overdueCount: number;
  tasksPerHour: number;
  activeSeconds: number;
  clockSeconds: number;
  idleSeconds: number;
  breakSeconds: number;
  breakCount: number;
  sleepSeconds: number;
  untrackedSeconds: number;
  productivityScore: number;
  activityRatio?: number;
  clockInTime?: string | null;
  clockOutTime?: string | null;
  lateStartMinutes: number;
  hasMissingClockOut: boolean;
  topApp: string;
}

type SortKey = 'completed' | 'active' | 'productivity' | 'break' | 'name';
type PeriodMode = 'day' | 'range';
type RangePreset = 'this_week' | '7days' | 'this_month' | '30days' | 'custom';

const todayStr = () => new Date().toISOString().slice(0, 10);

const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const getDaysAgoStr = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const getThisWeekStartStr = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = (day + 1) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
};

const getThisMonthStartStr = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const formatDuration = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')} س`;
  if (m > 0) return `${m} د`;
  return s > 0 ? 'أقل من دقيقة' : '—';
};

const formatClock = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

const formatDayLabel = (dateStr: string): string => {
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString('ar-EG-u-nu-latn', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return dateStr;
  }
};

const formatShortDate = (dateStr: string): string => {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ar-EG-u-nu-latn', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
};

export const TeamDailyReportTab: React.FC = () => {
  const { mode } = useTheme();
  const [periodMode, setPeriodMode] = useState<PeriodMode>('day');
  const [singleDate, setSingleDate] = useState<string>(todayStr());
  const [rangePreset, setRangePreset] = useState<RangePreset>('this_week');
  const [customRangeStart, setCustomRangeStart] = useState<string>(getDaysAgoStr(7));
  const [customRangeEnd, setCustomRangeEnd] = useState<string>(todayStr());

  const [members, setMembers] = useState<MemberDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('completed');
  const [sortAsc, setSortAsc] = useState(false);
  const [copied, setCopied] = useState(false);

  const activePeriod = useMemo(() => {
    const today = todayStr();
    if (periodMode === 'day') {
      const isToday = singleDate === today;
      const isYesterday = singleDate === getYesterdayStr();
      let label = formatDayLabel(singleDate);
      if (isToday) label = `اليوم (${formatDayLabel(today)})`;
      else if (isYesterday) label = `أمس (${formatDayLabel(singleDate)})`;
      return {
        startDate: singleDate,
        endDate: singleDate,
        isRange: false,
        isToday,
        label,
      };
    } else {
      let start = today;
      let end = today;
      let label = '';
      switch (rangePreset) {
        case 'this_week':
          start = getThisWeekStartStr();
          end = today;
          label = `هذا الأسبوع (${formatShortDate(start)} ← ${formatShortDate(end)})`;
          break;
        case '7days':
          start = getDaysAgoStr(7);
          end = today;
          label = `آخر 7 أيام (${formatShortDate(start)} ← ${formatShortDate(end)})`;
          break;
        case 'this_month':
          start = getThisMonthStartStr();
          end = today;
          label = `هذا الشهر (${formatShortDate(start)} ← ${formatShortDate(end)})`;
          break;
        case '30days':
          start = getDaysAgoStr(30);
          end = today;
          label = `آخر 30 يوم (${formatShortDate(start)} ← ${formatShortDate(end)})`;
          break;
        case 'custom':
        default:
          start = customRangeStart || getDaysAgoStr(7);
          end = customRangeEnd || today;
          label = `فترة مخصصة (${formatShortDate(start)} ← ${formatShortDate(end)})`;
          break;
      }
      return {
        startDate: start,
        endDate: end,
        isRange: true,
        isToday: false,
        label,
      };
    }
  }, [periodMode, singleDate, rangePreset, customRangeStart, customRangeEnd]);

  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      setError(null);
      const res = await window.electronAPI.getTeamOverview(
        activePeriod.startDate,
        activePeriod.isRange ? activePeriod.endDate : undefined
      );
      if (res?.success && Array.isArray(res.data)) {
        const mapped: MemberDay[] = res.data.map((item: any) => {
          const emp = item.employee || {};
          const name =
            emp.firstName || emp.lastName
              ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
              : item.employeeName || 'عضو الفريق';
          return {
            employeeId: String(item.employeeId || emp.id || name),
            name,
            department: emp.department?.name || '—',
            jobTitle: emp.position?.title || '',
            completedCount: Number(item.completedTasksCount || 0),
            openCount: Number(item.openTasksCount || 0),
            overdueCount: Number(item.overdueTasksCount || 0),
            tasksPerHour: Number(item.tasksPerHour || 0),
            activeSeconds: Number(item.totalActiveSeconds || 0),
            clockSeconds: Number(item.totalClockSeconds || item.elapsedAttendanceSeconds || 0),
            idleSeconds: Number(item.totalIdleSeconds || 0),
            breakSeconds: Number(item.totalBreakSeconds || (item.totalBreakMinutes ? item.totalBreakMinutes * 60 : 0)),
            breakCount: Number(item.totalBreaksCount || 0),
            sleepSeconds: Number(item.totalSleepSeconds || 0),
            untrackedSeconds: Number(item.untrackedSeconds || 0),
            productivityScore: Math.round(Number(item.productivityScore || 0)),
            activityRatio: typeof item.activityRatio === 'number' ? item.activityRatio : undefined,
            clockInTime: item.clockInTime || null,
            clockOutTime: item.clockOutTime || null,
            lateStartMinutes: Math.round(Number(item.lateStartSeconds || 0) / 60),
            hasMissingClockOut: Boolean(item.hasMissingClockOut),
            topApp: item.topApp || '—',
          };
        });
        setMembers(mapped);
      } else {
        setMembers([]);
        if (res?.error) setError(String(res.error));
      }
    } catch (err: any) {
      console.warn('[TeamDailyReportTab] load error:', err);
      setError('تعذر تحميل تقرير الفريق — تحقق من الاتصال بالسيرفر.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [activePeriod.startDate, activePeriod.endDate, activePeriod.isRange]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Historical days or ranges are frozen — poll only while viewing today
  useEffect(() => {
    if (!activePeriod.isToday) return;
    const poll = setInterval(() => loadData(false), 60_000);
    return () => clearInterval(poll);
  }, [activePeriod.isToday, loadData]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rows = members.filter(
      (m) =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q) ||
        m.topApp.toLowerCase().includes(q)
    );
    const dir = sortAsc ? 1 : -1;
    return rows.sort((a, b) => {
      switch (sortKey) {
        case 'completed': return (a.completedCount - b.completedCount) * dir || a.name.localeCompare(b.name, 'ar');
        case 'active': return (a.activeSeconds - b.activeSeconds) * dir;
        case 'break': return (a.breakSeconds - b.breakSeconds) * dir;
        case 'productivity': return (a.productivityScore - b.productivityScore) * dir;
        default: return a.name.localeCompare(b.name, 'ar') * (sortAsc ? 1 : -1);
      }
    });
  }, [members, searchQuery, sortKey, sortAsc]);

  const totals = useMemo(() => {
    const clockH = members.reduce((s, m) => s + m.clockSeconds, 0) / 3600;
    const activeH = members.reduce((s, m) => s + m.activeSeconds, 0) / 3600;
    const completed = members.reduce((s, m) => s + m.completedCount, 0);
    const overdue = members.reduce((s, m) => s + m.overdueCount, 0);
    const breakMin = Math.round(members.reduce((s, m) => s + m.breakSeconds, 0) / 60);
    const scored = members.filter((m) => m.productivityScore > 0);
    const avgProd = scored.length
      ? Math.round(scored.reduce((s, m) => s + m.productivityScore, 0) / scored.length)
      : 0;
    const late = members.filter((m) => m.lateStartMinutes > 5).length;
    return { clockH, activeH, completed, overdue, breakMin, avgProd, late };
  }, [members]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name');
    }
  };

  const handleCopyStandup = () => {
    const periodTitle = activePeriod.isRange
      ? `ملخص إنتاجية الفريق — ${activePeriod.label}`
      : `يومية الفريق — ${activePeriod.label}`;
    const fmtH = (sec: number) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return h > 0 ? `${h}س ${m}د` : `${m}د`;
    };
    let text = `*${periodTitle}*\n`;
    text += `المنجز: ${totals.completed} مهمة • موثق: ${totals.clockH.toFixed(1)} ساعة • متوسط الإنتاجية: ${totals.avgProd}%\n\n`;
    filteredMembers.forEach((m) => {
      text += `• *${m.name}* — منجز: ${m.completedCount} | عمل فعلي: ${fmtH(m.activeSeconds)}`;
      text += ` | بريك: ${fmtH(m.breakSeconds)} (${m.breakCount}) | سكون: ${fmtH(m.sleepSeconds)}`;
      text += ` | إنتاجية: ${m.productivityScore}%\n`;
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportCsv = () => {
    const headers = [
      'الموظف', 'القسم', activePeriod.isRange ? 'المنجز في الفترة' : 'منجز اليوم', 'قيد العمل', 'متأخرة',
      'حضور (ساعة)', 'عمل فعلي (ساعة)', 'بريك (دقيقة)', 'عدد البريكات', 'سكون (دقيقة)',
      'دخول', 'خروج', 'أول نشاط بعد البصمة (دقيقة)', 'الإنتاجية %', 'أكثر تطبيق',
    ];
    const rows = filteredMembers.map((m) => [
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.department}"`,
      m.completedCount,
      m.openCount,
      m.overdueCount,
      (m.clockSeconds / 3600).toFixed(2),
      (m.activeSeconds / 3600).toFixed(2),
      Math.round(m.breakSeconds / 60),
      m.breakCount,
      Math.round(m.sleepSeconds / 60),
      formatClock(m.clockInTime),
      formatClock(m.clockOutTime),
      m.lateStartMinutes > 0 ? m.lateStartMinutes : 0,
      m.productivityScore,
      `"${m.topApp.replace(/"/g, '""')}"`,
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activePeriod.isRange
      ? `MaxP_Team_Summary_${activePeriod.startDate}_to_${activePeriod.endDate}.csv`
      : `MaxP_Team_Daily_${activePeriod.startDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : '';

  const renderPresence = (m: MemberDay) => {
    if (activePeriod.isRange) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={styles.num}>
            {formatDuration(m.clockSeconds)}
          </span>
          <span style={styles.memberMeta}>إجمالي التوثيق</span>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={styles.num}>
          {formatClock(m.clockInTime)} ← {formatClock(m.clockOutTime)}
        </span>
        {m.lateStartMinutes > 5 && (
          <span
            title={`أول نشاط فعلي على الجهاز بدأ بعد ${m.lateStartMinutes} دقيقة من بصمة الحضور — مؤشر مراقبة (وقت تسخين) ولا يُحسب خصماً على الراتب`}
            style={{ ...styles.miniBadge, color: '#f59e0b', borderColor: 'rgba(245,158,11,0.35)' }}
          >
            {m.lateStartMinutes} د بدون نشاط بعد البصمة
          </span>
        )}
        {m.hasMissingClockOut && (
          <span style={{ ...styles.miniBadge, color: 'var(--text-muted)', borderColor: 'var(--border-default)' }}>
            بدون بصمة خروج
          </span>
        )}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Unified Header: Title + Period Selector */}
      <div style={styles.headerStrip}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={styles.headerIconBox}>
            <CalendarDays size={16} color="var(--accent-blue)" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={styles.headerTitle}>
              {activePeriod.isRange ? 'ملخص إنتاجية الفريق' : 'يومية الفريق'}
            </div>
            <div style={styles.headerSubtitle}>
              {activePeriod.label}
              {activePeriod.isToday ? ' — مباشر' : ''}
            </div>
          </div>
        </div>

        {/* Mode Switcher & Date Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {/* Mode Segment: Day vs Range */}
          <div style={styles.segmentWrap}>
            <button
              onClick={() => setPeriodMode('day')}
              style={{
                ...styles.segmentBtn,
                background: periodMode === 'day' ? 'var(--bg-elevated)' : 'transparent',
                color: periodMode === 'day' ? 'var(--accent-blue)' : 'var(--text-muted)',
                fontWeight: periodMode === 'day' ? 700 : 500,
              }}
            >
              يوم محدد
            </button>
            <button
              onClick={() => setPeriodMode('range')}
              style={{
                ...styles.segmentBtn,
                background: periodMode === 'range' ? 'var(--bg-elevated)' : 'transparent',
                color: periodMode === 'range' ? 'var(--accent-blue)' : 'var(--text-muted)',
                fontWeight: periodMode === 'range' ? 700 : 500,
              }}
            >
              فترة زمنية
            </button>
          </div>

          {periodMode === 'day' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setSingleDate((d) => addDays(d, -1))}
                style={styles.iconBtn}
                title="اليوم السابق"
                aria-label="اليوم السابق"
              >
                <ChevronRight size={14} />
              </button>
              <input
                type="date"
                value={singleDate}
                max={todayStr()}
                onChange={(e) => e.target.value && setSingleDate(e.target.value)}
                style={{ ...styles.dateInput, colorScheme: mode } as React.CSSProperties}
                aria-label="اختيار التاريخ"
              />
              <button
                onClick={() => setSingleDate((d) => (d < todayStr() ? addDays(d, 1) : d))}
                disabled={activePeriod.isToday}
                style={{
                  ...styles.iconBtn,
                  opacity: activePeriod.isToday ? 0.4 : 1,
                  cursor: activePeriod.isToday ? 'default' : 'pointer',
                }}
                title="اليوم التالي"
                aria-label="اليوم التالي"
              >
                <ChevronLeft size={14} />
              </button>
              {!activePeriod.isToday && (
                <button onClick={() => setSingleDate(todayStr())} style={styles.todayBtn}>
                  اليوم
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <select
                value={rangePreset}
                onChange={(e) => setRangePreset(e.target.value as RangePreset)}
                style={styles.selectInput}
                aria-label="اختيار الفترة الزمنية"
              >
                <option value="this_week">هذا الأسبوع</option>
                <option value="7days">آخر 7 أيام</option>
                <option value="this_month">هذا الشهر</option>
                <option value="30days">آخر 30 يوم</option>
                <option value="custom">فترة مخصصة…</option>
              </select>

              {rangePreset === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={styles.rangeSep}>من</span>
                  <input
                    type="date"
                    value={customRangeStart}
                    max={customRangeEnd || todayStr()}
                    onChange={(e) => e.target.value && setCustomRangeStart(e.target.value)}
                    style={{ ...styles.dateInput, colorScheme: mode } as React.CSSProperties}
                    aria-label="تاريخ البداية"
                  />
                  <span style={styles.rangeSep}>إلى</span>
                  <input
                    type="date"
                    value={customRangeEnd}
                    max={todayStr()}
                    onChange={(e) => e.target.value && setCustomRangeEnd(e.target.value)}
                    style={{ ...styles.dateInput, colorScheme: mode } as React.CSSProperties}
                    aria-label="تاريخ النهاية"
                  />
                </div>
              )}
            </div>
          )}

          <button onClick={() => loadData(true)} style={styles.refreshBtn} title="تحديث" aria-label="تحديث">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div style={styles.kpiRibbon}>
        <div style={styles.kpiPill}>
          <span>{activePeriod.isRange ? 'موثق الفترة:' : 'موثق اليوم:'}</span>
          <strong style={styles.num}>{totals.clockH.toFixed(1)} ساعة</strong>
        </div>
        <div style={styles.kpiPill}>
          <span>عمل فعلي:</span>
          <strong style={{ ...styles.num, color: 'var(--accent-green)' }}>{totals.activeH.toFixed(1)} ساعة</strong>
        </div>
        <div style={{ ...styles.kpiPill, borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)' }}>
          <CheckCircle2 size={13} color="var(--accent-green)" />
          <span style={{ color: 'var(--accent-green)' }}>منجز:</span>
          <strong style={{ ...styles.num, color: 'var(--accent-green)' }}>{totals.completed}</strong>
        </div>
        {totals.overdue > 0 && (
          <div style={{ ...styles.kpiPill, borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)' }}>
            <AlertTriangle size={13} color="#f87171" />
            <span style={{ color: '#f87171' }}>متأخرة:</span>
            <strong style={{ ...styles.num, color: '#f87171' }}>{totals.overdue}</strong>
          </div>
        )}
        <div style={styles.kpiPill}>
          <span>متوسط الإنتاجية:</span>
          <strong style={styles.num}>{totals.avgProd}%</strong>
        </div>
        <div style={styles.kpiPill}>
          <span>بريكات الفريق:</span>
          <strong style={styles.num}>{totals.breakMin} د</strong>
        </div>
        {totals.late > 0 && !activePeriod.isRange && (
          <div
            style={styles.kpiPill}
            title="عدد من بدأ أول نشاط فعلي على جهازه بعد أكثر من 5 دقائق من بصمة الحضور"
          >
            <span>بدون نشاط بعد البصمة:</span>
            <strong style={styles.num}>{totals.late}</strong>
          </div>
        )}
      </div>

      {/* Control Bar: Search + Actions */}
      <div style={styles.controlBar}>
        <div style={styles.searchBox}>
          <Search size={13} color="var(--text-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالموظف أو القسم…"
            style={styles.searchInput}
          />
        </div>
        <div style={{ marginRight: 'auto', display: 'flex', gap: 6 }}>
          <button
            onClick={handleCopyStandup}
            style={{ ...styles.actionBtn, background: copied ? 'var(--accent-green)' : 'var(--accent-blue)' }}
            title="نسخ يومية الفريق المنسقة للمشاركة"
          >
            {copied ? <Check size={12} color="var(--text-inverse)" /> : <Copy size={12} color="var(--text-inverse)" />}
            <span style={{ color: 'var(--text-inverse)' }}>{copied ? 'تم النسخ!' : 'نسخ اليومية'}</span>
          </button>
          <button onClick={handleExportCsv} style={styles.actionBtnGhost} title="تصدير تقرير الفريق CSV">
            <Download size={12} color="var(--text-muted)" />
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Daily Ledger Table */}
      <div style={styles.tableWrap}>
        {loading && members.length === 0 ? (
          <div style={styles.emptyState}>جاري جلب بيانات الفريق…</div>
        ) : filteredMembers.length === 0 ? (
          <div style={styles.emptyState}>
            {members.length === 0
              ? 'لا توجد بيانات موثقة لهذه الفترة — تأكد من اتصال أجهزة الفريق بتطبيق الديسك توب.'
              : 'لا يوجد موظفون يطابقون البحث الحالي.'}
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => toggleSort('name')}>
                  الموظف{sortIndicator('name')}
                </th>
                <th style={{ ...styles.th, cursor: 'pointer', textAlign: 'center' }} onClick={() => toggleSort('completed')}>
                  {activePeriod.isRange ? 'إنجاز الفترة' : 'إنجاز اليوم'}{sortIndicator('completed')}
                </th>
                <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => toggleSort('active')}>
                  عمل فعلي{sortIndicator('active')}
                </th>
                <th style={styles.th}>الحضور</th>
                <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => toggleSort('break')}>
                  بريك{sortIndicator('break')}
                </th>
                <th style={styles.th}>سكون</th>
                <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => toggleSort('productivity')}>
                  إنتاجية{sortIndicator('productivity')}
                </th>
                <th style={styles.th}>أكثر تطبيق</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => (
                <tr key={m.employeeId} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={styles.memberName} title={m.name}>{m.name}</span>
                      <span style={styles.memberMeta}>{m.department}{m.jobTitle ? ` • ${m.jobTitle}` : ''}</span>
                    </div>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <strong style={{ ...styles.num, fontSize: 13.5, color: m.completedCount > 0 ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                        {m.completedCount}
                      </strong>
                      <span style={styles.taskChip} title="قيد العمل">قيد العمل {m.openCount}</span>
                      {m.overdueCount > 0 && (
                        <span style={{ ...styles.taskChip, color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }} title="متأخرة">
                          متأخرة {m.overdueCount}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={styles.num}
                      title={`حضور: ${formatDuration(m.clockSeconds)}${m.untrackedSeconds > 300 ? ` • غير موثق: ${formatDuration(m.untrackedSeconds)}` : ''}`}
                    >
                      {formatDuration(m.activeSeconds)}
                    </span>
                  </td>
                  <td style={styles.td}>{renderPresence(m)}</td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ ...styles.num, color: m.breakSeconds > 3600 ? '#f59e0b' : 'var(--text-primary)' }}>
                        {m.breakSeconds > 0 ? formatDuration(m.breakSeconds) : '—'}
                      </span>
                      {m.breakCount > 0 && <span style={styles.memberMeta}>{m.breakCount} مرات</span>}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.num, color: 'var(--text-muted)' }} title="جهاز مفتوح بدون حركة (خارج البريك الرسمي)">
                      {m.sleepSeconds > 60 ? formatDuration(m.sleepSeconds) : '—'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <strong
                      style={{
                        ...styles.num,
                        fontSize: 13,
                        color:
                          m.productivityScore >= 70
                            ? 'var(--accent-green)'
                            : m.productivityScore >= 40
                            ? '#f59e0b'
                            : 'var(--text-secondary)',
                      }}
                    >
                      {m.productivityScore}%
                    </strong>
                  </td>
                  <td style={{ ...styles.td, color: 'var(--text-muted)', fontSize: 11 }}>
                    <span style={{ display: 'inline-block', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.topApp}>
                      {m.topApp}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '10px 14px',
    overflow: 'hidden',
  },
  headerStrip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottom: '1px solid var(--border-default)',
    flexShrink: 0,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 13.5,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  iconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 140ms ease-out',
  },
  dateInput: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 11.5,
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    fontVariantNumeric: 'tabular-nums',
    outline: 'none',
  },
  todayBtn: {
    background: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--accent-blue)',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  segmentWrap: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 7,
    padding: 2,
    gap: 2,
  },
  segmentBtn: {
    border: 'none',
    borderRadius: 5,
    padding: '3px 9px',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  selectInput: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 11.5,
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    outline: 'none',
    cursor: 'pointer',
  },
  rangeSep: {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  kpiRibbon: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  kpiPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    padding: '4px 10px',
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  num: {
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  controlBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    padding: '4px 10px',
    width: 220,
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 11,
    color: 'var(--text-primary)',
    width: '100%',
    fontFamily: 'inherit',
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    border: 'none',
    borderRadius: 6,
    padding: '5px 11px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'transform 120ms ease, background 150ms ease',
  },
  actionBtnGhost: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  errorBox: {
    backgroundColor: 'var(--accent-yellow-bg)',
    border: '1px solid var(--accent-yellow-border)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 11.5,
    color: 'var(--text-primary)',
    flexShrink: 0,
  },
  tableWrap: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    border: '1px solid var(--border-default)',
    borderRadius: 10,
    background: 'var(--bg-surface)',
  },
  emptyState: {
    border: '1px dashed var(--border-default)',
    borderRadius: 10,
    margin: 12,
    padding: 30,
    fontSize: 12,
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
  },
  th: {
    position: 'sticky',
    top: 0,
    background: 'var(--bg-elevated)',
    borderBottom: '1px solid var(--border-default)',
    padding: '8px 12px',
    fontSize: 10.5,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textAlign: 'right',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    zIndex: 1,
  },
  tr: {
    borderBottom: '1px solid var(--border-subtle)',
  },
  td: {
    padding: '9px 12px',
    color: 'var(--text-primary)',
    verticalAlign: 'middle',
  },
  memberName: {
    fontWeight: 700,
    fontSize: 12,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 180,
  },
  memberMeta: {
    fontSize: 9.5,
    color: 'var(--text-muted)',
    marginTop: 1,
  },
  taskChip: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 9.5,
    fontWeight: 600,
    color: 'var(--text-muted)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    padding: '1px 7px',
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  },
  miniBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 9.5,
    fontWeight: 700,
    border: '1px solid',
    borderRadius: 8,
    padding: '1px 7px',
    width: 'fit-content',
    fontVariantNumeric: 'tabular-nums',
  },
};

export default TeamDailyReportTab;
