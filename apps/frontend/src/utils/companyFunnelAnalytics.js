const EMPTY_SUMMARY = {
  stageKey: 'registered',
  label: 'سجل',
  progressLabel: '',
  hint: '',
  badgeClassName: 'badge-info',
};

export const getCompanyFunnelAnalytics = () => ({
  register: {},
  onboarding: { status: 'not_started', completedCount: 0, totalSteps: 0, steps: {} },
  activation: { status: 'not_started', completedCount: 0, totalSteps: 0, steps: {} },
  recentEvents: [],
});

export const getCompaniesFunnelStats = () => ({
  totalCompanies: 0, activeCompanies: 0, activated: 0, followUpNow: 0, escalationDue: 0, urgentEscalationDue: 0, stale72h: 0, myDueToday: 0,
});

export const getCompaniesFunnelFollowUpStats = () => ({
  needsFollowUpNow: 0, stale24h: 0, stale72h: 0, myFollowUpsToday: 0,
});

export const getCompanyFunnelSummary = () => EMPTY_SUMMARY;

export const getCompanyFunnelLastActivity = () => ({ label: '-', relativeLabel: '-', sortValue: '' });

export const getCompanyFunnelStaleStatus = () => ({ label: '', badgeClassName: '', isPending: false, needsFollowUpNow: false, isStale72h: false });

export const getCompanyFunnelAttentionScore = () => 0;

export const getCompanyInterventionAction = () => ({ mode: 'details', path: null, label: 'عرض التفاصيل', hint: '' });
