import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  MousePointer,
  Keyboard,
  Clock,
  Coffee,
  AppWindow,
  ExternalLink,
  Activity,
  CheckCircle2,
  CheckSquare,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Archive,
  History,
  Play,
  LogOut,
  Moon,
} from 'lucide-react';

interface CockpitTabProps {
  trackerState: any;
  dailySummary: any;
  formatTime: (sec: number) => string;
  onToggleBreak?: () => void;
  onEndShift?: () => Promise<void>;
  onStartShift?: () => Promise<void>;
  user?: any;
  isAdmin?: boolean;
}

type CockpitPeriodMode = 'day' | 'range';
type CockpitRangePreset = 'this_week' | '7days' | 'this_month' | '30days' | 'custom';

export const CockpitTab: React.FC<CockpitTabProps> = ({
  trackerState,
  dailySummary,
  formatTime,
  onToggleBreak,
  onEndShift,
  onStartShift,
  user,
  isAdmin = false,
}) => {
  const getTodayLocal = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getDaysAgoStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getThisWeekStartStr = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day + 1) % 7;
    d.setDate(d.getDate() - diff);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getThisMonthStartStr = () => {
    const d = new Date();
    d.setDate(1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatShortDate = (dateStr: string): string => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d, 12, 0, 0);
      if (isNaN(dt.getTime())) return dateStr;
      return dt.toLocaleDateString('ar-EG-u-nu-latn', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
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

  const todayStr = trackerState?.currentDate || getTodayLocal();
  const [periodMode, setPeriodMode] = useState<CockpitPeriodMode>('day');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [rangePreset, setRangePreset] = useState<CockpitRangePreset>('this_week');
  const [customRangeStart, setCustomRangeStart] = useState<string>(getDaysAgoStr(7));
  const [customRangeEnd, setCustomRangeEnd] = useState<string>(todayStr);

  const [historicalSummary, setHistoricalSummary] = useState<any>(null);
  const [loadingDate, setLoadingDate] = useState(false);

  const activeRange = useMemo(() => {
    let start = todayStr;
    let end = todayStr;
    let label = '';
    switch (rangePreset) {
      case 'this_week':
        start = getThisWeekStartStr();
        end = todayStr;
        label = `هذا الأسبوع (${formatShortDate(start)} ← ${formatShortDate(end)})`;
        break;
      case '7days':
        start = getDaysAgoStr(7);
        end = todayStr;
        label = `آخر 7 أيام (${formatShortDate(start)} ← ${formatShortDate(end)})`;
        break;
      case 'this_month':
        start = getThisMonthStartStr();
        end = todayStr;
        label = `هذا الشهر (${formatShortDate(start)} ← ${formatShortDate(end)})`;
        break;
      case '30days':
        start = getDaysAgoStr(30);
        end = todayStr;
        label = `آخر 30 يوم (${formatShortDate(start)} ← ${formatShortDate(end)})`;
        break;
      case 'custom':
      default:
        start = customRangeStart || getDaysAgoStr(7);
        end = customRangeEnd || todayStr;
        label = `فترة مخصصة (${formatShortDate(start)} ← ${formatShortDate(end)})`;
        break;
    }
    return { start, end, label };
  }, [rangePreset, customRangeStart, customRangeEnd, todayStr]);

  const isRange = periodMode === 'range';
  const isToday = !isRange && selectedDate === todayStr;

  const displayDateLabel = useMemo(() => {
    if (isRange) return activeRange.label;
    try {
      return parseLocalDate(selectedDate).toLocaleDateString('ar-EG-u-nu-latn', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [isRange, activeRange.label, selectedDate]);

  // Sync selectedDate when today changes due to rollover
  useEffect(() => {
    if (selectedDate === todayStr || !selectedDate) {
      setSelectedDate(todayStr);
    }
  }, [todayStr]);

  // Load historical summary when another date or range is selected
  useEffect(() => {
    if (isToday) {
      setHistoricalSummary(null);
      return;
    }
    let cancelled = false;
    setLoadingDate(true);
    const startDate = isRange ? activeRange.start : selectedDate;
    const endDate = isRange ? activeRange.end : undefined;

    window.electronAPI
      .getDailySummary(startDate, endDate)
      .then((data: any) => {
        if (!cancelled) {
          setHistoricalSummary(data);
          setLoadingDate(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingDate(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isToday, isRange, selectedDate, activeRange.start, activeRange.end]);

  const [taskStats, setTaskStats] = useState<{ total: number; completed: number }>({
    total: 0,
    completed: 0,
  });

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await window.electronAPI.getTasks('my-tasks');
        if (res?.success && Array.isArray(res.tasks)) {
          const total = res.tasks.length;
          const completed = res.tasks.filter(
            (t: any) => String(t.status || '').toUpperCase() === 'COMPLETED'
          ).length;
          setTaskStats({ total, completed });
        }
      } catch {}
    };
    fetchTasks();
    const interval = setInterval(fetchTasks, 20_000);
    return () => clearInterval(interval);
  }, []);

  const effectiveSummary = isToday ? dailySummary : (historicalSummary || {});
  const baseActive = effectiveSummary?.total_active_seconds ?? 0;
  const baseIdle = effectiveSummary?.total_idle_seconds ?? 0;
  const baseBreak = effectiveSummary?.total_break_seconds ?? (isToday ? (trackerState?.breakSeconds ?? 0) : 0);
  const breakCount = isToday ? (trackerState?.breakCount ?? effectiveSummary?.total_break_count ?? 0) : (effectiveSummary?.total_break_count ?? 0);

  // 1-second live ticker interval for immediate responsive feedback
  const [liveActiveOffset, setLiveActiveOffset] = useState(0);
  const [liveIdleOffset, setLiveIdleOffset] = useState(0);
  const [liveBreakOffset, setLiveBreakOffset] = useState(0);

  useEffect(() => {
    setLiveActiveOffset(0);
    setLiveIdleOffset(0);
    setLiveBreakOffset(0);
  }, [baseActive, baseIdle, baseBreak, selectedDate, isRange, activeRange.start, activeRange.end]);

  const currentApp = trackerState?.currentApp || 'سطح المكتب / مستكشف ويندوز';
  const currentUrl = trackerState?.currentUrl;
  const isPaused = trackerState?.isPaused ?? false;
  const isTracking = trackerState?.isTracking ?? false;
  const shiftEnded = isToday ? (trackerState?.shiftEnded ?? false) : Boolean(effectiveSummary?.shift_ended_at);
  const shiftEndedAt = isToday ? trackerState?.shiftEndedAt : effectiveSummary?.shift_ended_at;

  useEffect(() => {
    if (!isToday || !isTracking || shiftEnded) return;

    const interval = setInterval(() => {
      if (isPaused) {
        setLiveIdleOffset((prev) => prev + 1);
        setLiveBreakOffset((prev) => prev + 1);
      } else {
        setLiveActiveOffset((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isToday, isTracking, isPaused, shiftEnded]);

  const activeSeconds = baseActive + (isToday ? liveActiveOffset : 0);
  const idleSeconds = baseIdle + (isToday ? liveIdleOffset : 0);
  const breakSeconds = baseBreak + (isToday ? liveBreakOffset : 0);
  const sleepSeconds = Math.max(0, idleSeconds - breakSeconds);
  const totalTracked = activeSeconds + idleSeconds;
  const activeRatio = totalTracked > 0 ? Math.round((activeSeconds / totalTracked) * 100) : (isToday ? 100 : 0);

  const mouseEvents = effectiveSummary?.total_mouse_events ?? 0;
  const keyboardEvents = effectiveSummary?.total_keyboard_events ?? 0;

  const handlePrevDay = () => {
    const d = parseLocalDate(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatLocalDate(d));
  };

  const handleNextDay = () => {
    if (selectedDate >= todayStr) return;
    const d = parseLocalDate(selectedDate);
    d.setDate(d.getDate() + 1);
    const next = formatLocalDate(d);
    setSelectedDate(next > todayStr ? todayStr : next);
  };

  const handleGoToday = () => {
    setSelectedDate(todayStr);
  };

  const formatClockTime = (iso?: string | null) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  return (
    <div style={styles.container}>
      {/* Date & Shift Navigator Bar */}
      <div style={styles.dateNavBar}>
        <div style={styles.dateNavControls}>
          {/* Mode Switcher */}
          <div style={styles.modeSegment}>
            <button
              onClick={() => setPeriodMode('day')}
              style={{
                ...styles.modeSegmentBtn,
                background: periodMode === 'day' ? 'var(--bg-surface)' : 'transparent',
                color: periodMode === 'day' ? 'var(--accent-blue)' : 'var(--text-muted)',
                fontWeight: periodMode === 'day' ? 700 : 500,
              }}
            >
              يوم محدد
            </button>
            <button
              onClick={() => setPeriodMode('range')}
              style={{
                ...styles.modeSegmentBtn,
                background: periodMode === 'range' ? 'var(--bg-surface)' : 'transparent',
                color: periodMode === 'range' ? 'var(--accent-blue)' : 'var(--text-muted)',
                fontWeight: periodMode === 'range' ? 700 : 500,
              }}
            >
              فترة زمنية
            </button>
          </div>

          {periodMode === 'day' ? (
            <>
              <button
                onClick={handlePrevDay}
                style={styles.dateNavBtn}
                title="اليوم السابق"
                onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                <ChevronRight size={15} />
                <span>اليوم السابق</span>
              </button>

              <input
                type="date"
                value={selectedDate}
                max={todayStr}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                style={styles.datePickerInput}
                title="اختر يوماً معيناً"
                aria-label="اختيار التاريخ"
              />

              <button
                onClick={handleGoToday}
                style={{
                  ...styles.dateNavPill,
                  background: isToday ? 'var(--accent-green-bg)' : 'transparent',
                  borderColor: isToday ? 'var(--accent-green-border)' : 'var(--border-default)',
                  color: isToday ? 'var(--accent-green)' : 'var(--text-secondary)',
                }}
              >
                <Calendar size={13} />
                <span>اليوم (الوردية النشطة)</span>
              </button>

              <button
                onClick={handleNextDay}
                disabled={isToday}
                style={{
                  ...styles.dateNavBtn,
                  opacity: isToday ? 0.35 : 1,
                  cursor: isToday ? 'not-allowed' : 'pointer',
                }}
                title="اليوم التالي"
                onMouseDown={(e) => { if (!isToday) (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                onMouseUp={(e) => { if (!isToday) (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                <span>اليوم التالي</span>
                <ChevronLeft size={15} />
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <select
                value={rangePreset}
                onChange={(e) => setRangePreset(e.target.value as CockpitRangePreset)}
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
                    max={customRangeEnd || todayStr}
                    onChange={(e) => e.target.value && setCustomRangeStart(e.target.value)}
                    style={styles.datePickerInput}
                    aria-label="تاريخ البداية"
                  />
                  <span style={styles.rangeSep}>إلى</span>
                  <input
                    type="date"
                    value={customRangeEnd}
                    max={todayStr}
                    onChange={(e) => e.target.value && setCustomRangeEnd(e.target.value)}
                    style={styles.datePickerInput}
                    aria-label="تاريخ النهاية"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.dateDisplayBadge}>
          <Clock size={13} color="var(--accent-blue)" />
          <span style={styles.dateDisplayText}>
            {displayDateLabel}
          </span>
          {!isToday && (
            <span style={styles.archivedTag}>
              <Archive size={11} />
              {isRange ? 'ملخص الفترة' : 'مؤرشف وموثق'}
            </span>
          )}
        </div>
      </div>

      {/* Top Banner: Shift Mode & State */}
      {!isToday ? (
        <div style={styles.archivedBanner}>
          <div style={styles.archivedIconBox}>
            <History size={18} color="var(--accent-blue)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.bannerTitleRow}>
              <span style={styles.archivedTitle}>
                {isRange
                  ? `ملخص إنتاجية وأنشطة ${activeRange.label}`
                  : `سجل إنجاز وأنشطة يوم ${selectedDate} (مؤرشف)`}
              </span>
              <span style={styles.archivedChip}>
                {isRange ? 'ملخص مجمع' : 'سجل نهائي معتمد'}
              </span>
            </div>
            <div style={styles.archivedSubtext}>
              تم توثيق إجمالي عمل فعلي: {formatTime(activeSeconds)} — واستراحات وتوقف: {formatTime(idleSeconds)}
              {isRange ? ' خلال الفترة المحددة.' : '.'}
            </div>
          </div>
        </div>
      ) : shiftEnded ? (
        <div style={styles.shiftEndedBanner}>
          <div style={styles.shiftEndedIconBox}>
            <CheckCircle2 size={18} color="var(--accent-green)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.bannerTitleRow}>
              <span style={styles.shiftEndedTitle}>
                تم إنهاء وردية عمل اليوم وتسجيل الانصراف بنجاح
                {shiftEndedAt && ` (${formatClockTime(shiftEndedAt)})`}
              </span>
              <span style={styles.shiftEndedChip}>الوردية مغلقة</span>
            </div>
            <div style={styles.shiftEndedSubtext}>
              تم توثيق ساعات الوردية بالكامل في السحابة المركزية. إجمالي العمل الفعلي: {formatTime(activeSeconds)}.
            </div>
          </div>
          {onStartShift && (
            <button
              onClick={onStartShift}
              style={styles.startNewShiftBtn}
              title="بدء وردية جديدة أو عمل إضافي"
              onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              <Play size={13} fill="var(--text-inverse)" color="var(--text-inverse)" />
              <span>بدء وردية جديدة</span>
            </button>
          )}
        </div>
      ) : isPaused ? (
        <div style={styles.breakBanner}>
          <div style={styles.breakIconBox}>
            <Coffee size={18} color="var(--accent-yellow)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.bannerTitleRow}>
              <span style={styles.breakTitle}>
                {trackerState?.breakReason ? `استراحة موثقة: ${trackerState.breakReason}` : 'أنت الآن في وضع الاستراحة الرسمية المعتمدة'}
              </span>
              <span style={styles.breakChip}>عداد التوقف موقوف</span>
            </div>
            <div style={styles.breakSubtext}>
              وقت الصلاة أو الغداء لا يُحتسب كخمول؛ يتم حفظ خصوصيتك حتى استئناف جلسة العمل.
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.enforcedBanner}>
          <div style={styles.bannerIconBox}>
            <ShieldCheck size={18} color="var(--accent-green)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.bannerTitleRow}>
              <span style={styles.bannerTitle}>وردية العمل موثقة ونشطة في السحابة المركزية</span>
              <span style={styles.livePulseChip}>
                <span style={styles.pulsingDot} />
                <span>مباشر</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Telemetry */}
      <div style={styles.grid}>
        {/* Active Time Card */}
        <div style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <div style={{ ...styles.iconBadge, color: 'var(--accent-green)', background: 'var(--accent-green-bg)' }}>
              <Clock size={15} />
            </div>
            <span style={styles.metricLabel}>وقت العمل الفعلي</span>
          </div>
          <div style={styles.metricValue}>{formatTime(activeSeconds)}</div>
          <div style={styles.metricSubtext}>
            <span>{isToday ? 'معدل النشاط المستمر لليوم' : 'إجمالي الساعات المسجلة'}</span>
          </div>
        </div>

        {/* Device Sleep / Idle Card */}
        <div style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <div style={{ ...styles.iconBadge, color: 'var(--accent-blue)', background: 'rgba(56, 189, 248, 0.1)' }}>
              <Moon size={15} />
            </div>
            <span style={styles.metricLabel}>وضع سكون الجهاز</span>
          </div>
          <div style={styles.metricValue}>{formatTime(sleepSeconds)}</div>
          <div style={styles.metricSubtext}>
            <span>خمول الجهاز وتوقف حركة الماوس</span>
          </div>
        </div>

        {/* Break Time Card */}
        <div style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <div style={{ ...styles.iconBadge, color: 'var(--accent-yellow)', background: 'var(--accent-yellow-bg)' }}>
              <Coffee size={15} />
            </div>
            <span style={styles.metricLabel}>الاستراحات (البريك)</span>
          </div>
          <div style={styles.metricValue}>{formatTime(breakSeconds)}</div>
          <div style={styles.metricSubtext}>
            <span style={{ color: breakCount > 0 ? '#fbbf24' : 'var(--text-dim)', fontWeight: 600 }}>
              {breakCount > 0 ? `${breakCount} استراحة مسجلة اليوم` : 'لا توجد استراحات مسجلة'}
            </span>
          </div>
        </div>

        {/* Card 4: Task Completion (Employee) vs Input Telemetry (Admin) */}
        {isAdmin ? (
          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <div style={{ ...styles.iconBadge, color: 'var(--accent-purple)', background: 'rgba(168, 85, 247, 0.1)' }}>
                <Keyboard size={15} />
              </div>
              <span style={styles.metricLabel}>تفاعل الماوس والكيبورد</span>
            </div>
            <div style={{ ...styles.metricValue, fontSize: 17 }}>
              {mouseEvents.toLocaleString('en-US')} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>ماوس</span> · {keyboardEvents.toLocaleString('en-US')} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>كيبورد</span>
            </div>
            <div style={styles.metricSubtext}>
              <span>إجمالي الحركات والمدخلات لليوم</span>
            </div>
          </div>
        ) : (
          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <div style={{ ...styles.iconBadge, color: 'var(--accent-purple)', background: 'rgba(168, 85, 247, 0.1)' }}>
                <CheckSquare size={15} />
              </div>
              <span style={styles.metricLabel}>المهام المنجزة اليوم</span>
            </div>
            <div style={{ ...styles.metricValue, fontVariantNumeric: 'tabular-nums' }}>
              {taskStats.completed} / {taskStats.total}
            </div>
            <div style={styles.metricSubtext}>
              <span>
                {taskStats.total === 0
                  ? 'لا توجد مهام مسندة لليوم'
                  : taskStats.completed === taskStats.total
                  ? 'تم إنجاز كافة المهام بنجاح'
                  : `${taskStats.total - taskStats.completed} مهام متبقية قيد التنفيذ`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Ratio Bar */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={15} color="var(--accent-blue)" />
            <span style={styles.sectionTitle}>
              {isToday ? 'مؤشر الإنتاجية التراكمي لليوم' : `مؤشر الإنتاجية ليوم ${selectedDate}`}
            </span>
          </div>
          <span style={styles.ratioPercent}>{activeRatio}% نشط</span>
        </div>
        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressBar,
              width: `${Math.min(100, Math.max(0, activeRatio))}%`,
            }}
          />
        </div>
      </div>

      {/* Current Focus Window (Live Only) */}
      {isToday && !shiftEnded && isTracking && (
        <div style={styles.sectionBox}>
          <div style={styles.sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AppWindow size={15} color="var(--accent-green)" />
              <span style={styles.sectionTitle}>التطبيق النشط حالياً</span>
            </div>
            <span style={styles.activePill}>
              <CheckCircle2 size={12} />
              قيد التسجيل
            </span>
          </div>

          <div style={styles.appRow}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={styles.currentAppName}>{currentApp}</div>
              {currentUrl && (
                <div style={styles.currentUrlRow}>
                  <ExternalLink size={12} color="var(--text-muted)" />
                  <span style={styles.currentUrlText}>
                    {isAdmin
                      ? currentUrl
                      : (() => {
                          try {
                            return new URL(currentUrl).hostname;
                          } catch {
                            return currentUrl.split('?')[0].split('#')[0];
                          }
                        })()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    overflowY: 'auto',
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
  modeSegment: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 7,
    padding: 2,
    gap: 2,
  },
  modeSegmentBtn: {
    border: 'none',
    borderRadius: 5,
    padding: '3px 8px',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  datePickerInput: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 7,
    padding: '3px 8px',
    fontSize: 11,
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    fontVariantNumeric: 'tabular-nums',
    outline: 'none',
    cursor: 'pointer',
  },
  selectInput: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 7,
    padding: '3px 8px',
    fontSize: 11,
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
  },
  dateDisplayText: {
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
  archivedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: 10,
    padding: '12px 14px',
  },
  archivedIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'rgba(56, 189, 248, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  archivedTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--accent-blue)',
  },
  archivedChip: {
    background: 'rgba(56, 189, 248, 0.15)',
    border: '1px solid rgba(56, 189, 248, 0.35)',
    borderRadius: 20,
    padding: '2px 8px',
    fontSize: 10,
    color: 'var(--accent-blue)',
    fontWeight: 600,
  },
  archivedSubtext: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    marginTop: 4,
    lineHeight: 1.4,
  },
  shiftEndedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(34, 197, 94, 0.08)',
    border: '1px solid var(--accent-green-border)',
    borderRadius: 10,
    padding: '12px 14px',
  },
  shiftEndedIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'var(--accent-green-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftEndedTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--accent-green)',
  },
  shiftEndedChip: {
    background: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
    borderRadius: 20,
    padding: '2px 8px',
    fontSize: 10,
    color: 'var(--accent-green)',
    fontWeight: 600,
  },
  shiftEndedSubtext: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    marginTop: 4,
    lineHeight: 1.4,
  },
  startNewShiftBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--accent-green)',
    color: 'var(--text-inverse)',
    border: 'none',
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
    whiteSpace: 'nowrap',
  },
  breakBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(234, 179, 8, 0.08)',
    border: '1px solid var(--accent-yellow-border)',
    borderRadius: 10,
    padding: '12px 14px',
  },
  breakIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'rgba(234, 179, 8, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#fbbf24',
  },
  breakChip: {
    background: 'rgba(234, 179, 8, 0.2)',
    border: '1px solid rgba(234, 179, 8, 0.4)',
    borderRadius: 20,
    padding: '2px 8px',
    fontSize: 10,
    color: '#fbbf24',
    fontWeight: 600,
  },
  breakSubtext: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    marginTop: 4,
    lineHeight: 1.4,
  },
  enforcedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'var(--accent-green-bg)',
    border: '1px solid rgba(34, 197, 94, 0.18)',
    borderRadius: 10,
    padding: '10px 14px',
  },
  bannerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'var(--accent-green-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  livePulseChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
    borderRadius: 20,
    padding: '2px 8px',
    fontSize: 11,
    color: 'var(--accent-green)',
    fontWeight: 600,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--accent-green)',
    boxShadow: '0 0 8px var(--accent-green-dim)',
  },
  grid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gridTemplateRows: 'repeat(2, 1fr)',
    gap: 10,
    minHeight: 200,
  },
  metricCard: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 10,
    padding: '14px',
    boxShadow: 'var(--shadow-card)',
  },
  metricHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em',
  },
  metricSubtext: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: 'var(--text-dim)',
    marginTop: 6,
  },
  sectionBox: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 10,
    padding: '14px',
    boxShadow: 'var(--shadow-card)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  ratioPercent: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--accent-blue)',
    fontVariantNumeric: 'tabular-nums',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    background: 'var(--bg-hover)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: 'var(--accent-green)',
    borderRadius: 4,
    transition: 'width 300ms ease-out',
  },
  activePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    color: 'var(--accent-green)',
    background: 'var(--accent-green-bg)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    borderRadius: 6,
    padding: '3px 8px',
  },
  appRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'var(--bg-sidebar)',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--border-subtle)',
  },
  currentAppName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  currentUrlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  currentUrlText: {
    fontSize: 11,
    color: 'var(--text-dim)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};

export default CockpitTab;
