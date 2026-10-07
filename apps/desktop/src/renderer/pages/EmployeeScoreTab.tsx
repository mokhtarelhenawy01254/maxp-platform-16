import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  TrendingUp,
  CheckCircle2,
  Clock,
  Activity,
  Target,
  Sparkles,
  RefreshCw,
  Info,
  ShieldCheck,
  ChevronLeft,
  Zap,
  HelpCircle,
  FileText,
  AlertTriangle,
  X,
  ExternalLink,
} from 'lucide-react';

interface PillarInfo {
  score: number;
  weight: number;
  baseWeight?: number;
  label: string;
  details: string;
  isApplicable?: boolean;
}

interface TelemetryStats {
  tasksCompleted: number;
  totalTasks: number;
  onTimeTasks: number;
  lateTasksCount: number;
  returns: number;
  missingEvidenceCount: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  workDaysScheduled: number;
  monitoredDays: number;
  activeGoals: number;
}

interface LateTaskItem {
  id: string;
  title: string;
  dueDate?: string;
  status: string;
}

interface ReturnedTaskItem {
  id: string;
  title: string;
  returnCount: number;
  lastReturnReason?: string;
}

interface PerformanceData {
  compositeScore: number;
  isEvaluated?: boolean;
  tier: string;
  tierLabel: string;
  isAtRisk?: boolean;
  pillars: {
    delivery: PillarInfo;
    quality: PillarInfo;
    punctuality: PillarInfo;
    focus: PillarInfo;
    goals: PillarInfo;
  };
  recommendations: string[];
  period: string;
  telemetryStats?: TelemetryStats;
  drilldownDetails?: {
    lateTasks: LateTaskItem[];
    returnedTasks: ReturnedTaskItem[];
  };
}

interface EmployeeScoreTabProps {
  user?: any;
}

export const EmployeeScoreTab: React.FC<EmployeeScoreTabProps> = ({ user }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<PerformanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState<boolean>(false);

  const loadScore = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await window.electronAPI.getMyPerformanceScore();
      if (res?.success && res.data) {
        setData(res.data);
      } else {
        setError(res?.error || 'تعذر تحميل بيانات تقييم الأداء');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScore();
  }, [loadScore]);

  const getTierColor = (score: number, isEvaluated = true) => {
    if (!isEvaluated) {
      return { bg: 'rgba(148, 163, 184, 0.12)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
    }
    if (score >= 90) return { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
    if (score >= 80) return { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' };
    if (score >= 70) return { bg: 'rgba(234, 179, 8, 0.12)', text: '#eab308', border: 'rgba(234, 179, 8, 0.3)' };
    if (score >= 60) return { bg: 'rgba(249, 115, 22, 0.12)', text: '#f97316', border: 'rgba(249, 115, 22, 0.3)' };
    return { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
  };

  const getPillarIcon = (key: string) => {
    switch (key) {
      case 'delivery':
        return <TrendingUp size={16} color="var(--accent-green, #10b981)" />;
      case 'quality':
        return <CheckCircle2 size={16} color="var(--accent-blue, #3b82f6)" />;
      case 'punctuality':
        return <Clock size={16} color="var(--accent-purple, #a855f7)" />;
      case 'focus':
        return <Activity size={16} color="var(--accent-cyan, #06b6d4)" />;
      case 'goals':
        return <Target size={16} color="var(--accent-amber, #f59e0b)" />;
      default:
        return <Award size={16} />;
    }
  };

  if (loading && !data) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', opacity: 0.7 }} />
        <div style={{ fontSize: 13, fontWeight: 600 }}>جاري احتساب تقييم الأداء التلقائي من السجلات…</div>
      </div>
    );
  }

  if (!data && error) {
    return (
      <div style={{ padding: '32px 16px', maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <div
          style={{
            background: 'var(--bg-card, rgba(255,255,255,0.02))',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
            borderRadius: 12,
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
            }}
          >
            <Award size={22} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            تعذر تحميل بيانات تقييم الأداء
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {error}
          </div>
          <button
            onClick={loadScore}
            style={{
              marginTop: 8,
              background: 'var(--accent-green, #10b981)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 18px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      </div>
    );
  }

  const isEvaluated = data?.isEvaluated !== false;
  const score = data?.compositeScore ?? 0;
  const tierStyle = getTierColor(score, isEvaluated);
  const pillars = data?.pillars;
  const telemetry = data?.telemetryStats;
  const drilldown = data?.drilldownDetails;

  return (
    <div style={{ padding: '16px', maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'var(--bg-card-subtle, rgba(255,255,255,0.04))',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-green, #10b981)',
            }}
          >
            <Award size={20} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>تقييم أدائي التلقائي 360°</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: isEvaluated ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                  color: isEvaluated ? '#10b981' : '#94a3b8',
                  border: isEvaluated ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(148, 163, 184, 0.25)',
                }}
              >
                {isEvaluated ? '100% مؤتمت ومحايد' : 'قيد التقييم'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              محسوب مباشرة من سجلات المهام، بصمة الحضور، ومؤشرات نشاط بيئة العمل خلال {data?.period || 'آخر 30 يوماً'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setIsDrilldownOpen(true)}
            style={{
              background: 'var(--bg-card-subtle, rgba(255,255,255,0.04))',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 140ms ease-out',
            }}
          >
            <FileText size={13} color="var(--accent-cyan, #06b6d4)" />
            <span>سجلات التدقيق (Drill-down)</span>
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('maxp:navigate', { detail: { tab: 'wage' } }))}
            style={{
              background: 'var(--bg-card-subtle, rgba(255,255,255,0.04))',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 140ms ease-out',
            }}
          >
            <span>حضوري ومستحقاتي</span>
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={loadScore}
            disabled={loading}
            style={{
              background: 'var(--bg-card-subtle, rgba(255,255,255,0.04))',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#ef4444', fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Hero Composite Banner */}
      <div
        style={{
          background: 'var(--bg-card, rgba(255,255,255,0.02))',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
          borderRadius: 12,
          padding: '18px 22px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 16,
              background: tierStyle.bg,
              border: `1.5px solid ${tierStyle.border}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            <span style={{ fontSize: 28, fontWeight: 900, color: tierStyle.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {isEvaluated ? score : '—'}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: tierStyle.text, opacity: 0.85 }}>
              {isEvaluated ? 'من 100' : 'قيد التدقيق'}
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 6,
                  background: tierStyle.bg,
                  color: tierStyle.text,
                  border: `1px solid ${tierStyle.border}`,
                }}
              >
                {data?.tierLabel || 'تقييم الأداء'}
              </span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {isEvaluated ? 'المستوى التشغيلي التراكمي' : 'سجلات الأداء قيد التجميع'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {isEvaluated
                ? 'يؤهل الموظف للحوافز الدورية ومكافآت التميز التشغيلي في المنظومة'
                : 'يبدأ احتساب التقييم التراكمي تلقائياً بمجرد إسناد المهام أو تسجيل بصمة الحضور'}
            </div>
          </div>
        </div>

        {/* Dynamic Formula Disclosure Box */}
        <div
          style={{
            background: 'var(--bg-card-subtle, rgba(255,255,255,0.03))',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
            borderRadius: 8,
            padding: '12px 14px',
            fontSize: 11,
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            <Zap size={13} color="var(--accent-amber, #f59e0b)" />
            <span>معادلة الاحتساب الآلي وتوزيع الأوزان:</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', fontSize: 10.5, fontVariantNumeric: 'tabular-nums' }}>
            <span>• إنجاز: <b>{pillars?.delivery?.weight ?? 25}%</b></span>
            <span>• جودة: <b>{pillars?.quality?.weight ?? 25}%</b></span>
            <span>• انضباط: <b>{pillars?.punctuality?.weight ?? 20}%</b></span>
            <span>• نشاط مكتبي: <b>{pillars?.focus?.weight ?? 20}%</b></span>
            <span>• أهداف OKRs: <b>{pillars?.goals?.weight ?? 10}%</b></span>
          </div>
        </div>
      </div>

      {/* Telemetry Operational Highlights */}
      {telemetry && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 10,
          }}
        >
          <div style={{ background: 'var(--bg-card, rgba(255,255,255,0.02))', border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>المهام المنجزة في الموعد</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-green, #10b981)', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
              {telemetry.onTimeTasks} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>من {telemetry.totalTasks}</span>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card, rgba(255,255,255,0.02))', border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>سجل الحضور والانضباط</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: telemetry.absentDays > 0 ? '#ef4444' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
              {telemetry.presentDays} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>حضور ({telemetry.lateDays} تأخير، {telemetry.absentDays} غياب)</span>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card, rgba(255,255,255,0.02))', border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>إرجاعات الجودة المسجلة</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: telemetry.returns > 0 ? '#f59e0b' : 'var(--accent-green, #10b981)', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
              {telemetry.returns} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>إرجاع ({telemetry.missingEvidenceCount} أدلة ناقصة)</span>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card, rgba(255,255,255,0.02))', border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>النشاط المكتبي والأهداف</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-cyan, #06b6d4)', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
              {telemetry.monitoredDays} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>أيام نشاط ({telemetry.activeGoals} أهداف)</span>
            </div>
          </div>
        </div>
      )}

      {/* 5 Pillars Bento Breakdown */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>المحاور الخمسة للتقييم الموضوعي</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
            أوزان تناسبية ديناميكية حسب توفر السجلات
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 12 }}>
          {pillars &&
            Object.entries(pillars).map(([key, pillar]) => {
              const isPillarActive = pillar.isApplicable !== false;
              const pColor = getTierColor(pillar.score, isPillarActive);
              return (
                <div
                  key={key}
                  style={{
                    background: 'var(--bg-card, rgba(255,255,255,0.02))',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.07))',
                    borderRadius: 10,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {getPillarIcon(key)}
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {pillar.label}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'var(--bg-card-subtle, rgba(255,255,255,0.05))',
                          color: isPillarActive ? 'var(--text-secondary)' : 'var(--text-muted)',
                        }}
                      >
                        الوزن الفعلي: {pillar.weight}%
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: pColor.text, fontVariantNumeric: 'tabular-nums' }}>
                        {isPillarActive ? pillar.score : '—'}
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginRight: 3 }}>
                          {isPillarActive ? '/ 100' : 'غير متاح'}
                        </span>
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {pillar.details}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${isPillarActive ? Math.min(100, Math.max(5, pillar.score)) : 0}%`,
                          background: pColor.text,
                          borderRadius: 3,
                          transition: 'width 300ms ease-out',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Actionable Recommendations & Guidance */}
      {data?.recommendations && data.recommendations.length > 0 && (
        <div
          style={{
            background: 'var(--bg-card, rgba(255,255,255,0.02))',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
            borderRadius: 10,
            padding: '14px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            <Sparkles size={15} color="var(--accent-green, #10b981)" />
            <span>إرشادات عملية لرفع التقييم ومطابقة معايير التميز:</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.recommendations.map((rec, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11.5, color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--accent-green, #10b981)', fontWeight: 700 }}>•</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transparency Guarantee */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          fontSize: 11,
          color: 'var(--text-muted)',
        }}
      >
        <ShieldCheck size={16} color="var(--accent-green, #10b981)" style={{ flexShrink: 0 }} />
        <span>
          <b>ضمان الحيادية التامة:</b> يتم استخراج كافة المؤشرات تلقائياً من قواعد البيانات الرسمية للمهام، البصمة، ونشاط النظام بدون أي تدخل بشري. يمكنك مراجعة الإدارة وسجلات التدقيق في أي وقت.
        </span>
      </div>

      {/* Audit Drill-down Modal */}
      {isDrilldownOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setIsDrilldownOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg-card, #121214)',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
              borderRadius: 14,
              width: '100%',
              maxWidth: 620,
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color="var(--accent-cyan, #06b6d4)" />
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                  سجلات التدقيق والمطابقة التشغيلية
                </span>
              </div>
              <button
                onClick={() => setIsDrilldownOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Late Tasks Section */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color="#f59e0b" />
                <span>المهام المتأخرة عن موعد الاستحقاق ({drilldown?.lateTasks?.length || 0})</span>
              </div>
              {drilldown?.lateTasks && drilldown.lateTasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {drilldown.lateTasks.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(245, 158, 11, 0.05)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        borderRadius: 6,
                        fontSize: 11,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</span>
                      <span style={{ color: '#f59e0b', fontSize: 10 }}>
                        {t.dueDate ? `استحقاق: ${new Date(t.dueDate).toLocaleDateString('ar-EG')}` : 'متأخرة'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
                  لا توجد مهام متأخرة مسجلة خلال الفترة (التزام تام بمواعيد التسليم).
                </div>
              )}
            </div>

            {/* Returned Tasks Section */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} color="#ef4444" />
                <span>المهام المرجعة لملاحظات الجودة ({drilldown?.returnedTasks?.length || 0})</span>
              </div>
              {drilldown?.returnedTasks && drilldown.returnedTasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {drilldown.returnedTasks.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: 6,
                        fontSize: 11,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</span>
                        <span style={{ color: '#ef4444', fontSize: 10, fontWeight: 700 }}>
                          {t.returnCount} مرات إرجاع
                        </span>
                      </div>
                      {t.lastReturnReason && (
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                          سبب الإرجاع: {t.lastReturnReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
                  لا توجد أي مهام مرجعة (نسبة اعتماد 100% من المرة الأولى).
                </div>
              )}
            </div>

            {/* Attendance Audit Summary */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color="var(--accent-purple, #a855f7)" />
                <span>ملخص أيام الدوام الموثقة</span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  textAlign: 'center',
                }}
              >
                <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>حضور فعلي</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>{telemetry?.presentDays || 0} يوم</div>
                </div>
                <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>تأخير صباحي</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b' }}>{telemetry?.lateDays || 0} يوم</div>
                </div>
                <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>غياب غير مبرر</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>{telemetry?.absentDays || 0} يوم</div>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
              <button
                onClick={() => setIsDrilldownOpen(false)}
                style={{
                  background: 'var(--bg-card-subtle, rgba(255,255,255,0.08))',
                  border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                  color: 'var(--text-primary)',
                  borderRadius: 6,
                  padding: '7px 16px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeScoreTab;
