/**
 * MaxP Workspace — Design Tokens (Dark + Light)
 *
 * Every colour that changes between themes lives here.
 * CSS custom-properties are injected on `document.documentElement`
 * by `ThemeContext`, so inline `style={{ color: 'var(--text-primary)' }}`
 * works everywhere with zero import overhead.
 */

export type ThemeMode = 'dark' | 'light';

export interface ThemeTokens {
  /* ── backgrounds ────────────────────────────────────────── */
  '--bg-page': string;
  '--bg-sidebar': string;
  '--bg-surface': string;
  '--bg-elevated': string;
  '--bg-hover': string;
  '--bg-topbar': string;
  '--bg-input': string;
  '--bg-overlay': string;

  /* ── text ────────────────────────────────────────────────── */
  '--text-primary': string;
  '--text-secondary': string;
  '--text-muted': string;
  '--text-dim': string;
  '--text-dimmer': string;
  '--text-inverse': string;

  /* ── borders ─────────────────────────────────────────────── */
  '--border-subtle': string;
  '--border-default': string;
  '--border-strong': string;

  /* ── shadows ─────────────────────────────────────────────── */
  '--shadow-card': string;
  '--shadow-modal': string;

  /* ── accent (same both themes unless overridden) ────────── */
  '--accent-green': string;
  '--accent-green-dim': string;
  '--accent-green-bg': string;
  '--accent-green-border': string;
  '--accent-red': string;
  '--accent-red-dim': string;
  '--accent-red-bg': string;
  '--accent-red-border': string;
  '--accent-yellow': string;
  '--accent-yellow-bg': string;
  '--accent-yellow-border': string;
  '--accent-blue': string;
  '--accent-blue-bg': string;
  '--accent-blue-border': string;

  /* ── avatar / misc ──────────────────────────────────────── */
  '--avatar-gradient': string;
  '--avatar-border': string;

  /* ── button primary ─────────────────────────────────────── */
  '--btn-primary-bg': string;
  '--btn-primary-text': string;
}

/* ═══════════════════════════════════════════════════════════
 *  DARK THEME  (current default)
 * ═══════════════════════════════════════════════════════════ */
export const darkTokens: ThemeTokens = {
  '--bg-page':      '#09090b',
  '--bg-sidebar':   '#0d0d10',
  '--bg-surface':   '#121216',
  '--bg-elevated':  '#18181b',
  '--bg-hover':     '#27272a',
  '--bg-topbar':    '#0c0c0e',
  '--bg-input':     '#0a0a0c',
  '--bg-overlay':   'rgba(0,0,0,0.6)',

  '--text-primary':   '#fafafa',
  '--text-secondary': '#e4e4e7',
  '--text-muted':     '#a1a1aa',
  '--text-dim':       '#71717a',
  '--text-dimmer':    '#52525b',
  '--text-inverse':   '#09090b',

  '--border-subtle':  'rgba(255,255,255,0.06)',
  '--border-default': 'rgba(255,255,255,0.08)',
  '--border-strong':  'rgba(255,255,255,0.1)',

  '--shadow-card':  '0 2px 8px rgba(0,0,0,0.35)',
  '--shadow-modal': '0 20px 40px -15px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',

  '--accent-green':        '#22c55e',
  '--accent-green-dim':    'rgba(34,197,94,0.7)',
  '--accent-green-bg':     'rgba(34,197,94,0.12)',
  '--accent-green-border': 'rgba(34,197,94,0.25)',
  '--accent-red':          '#ef4444',
  '--accent-red-dim':      '#f87171',
  '--accent-red-bg':       'rgba(239,68,68,0.1)',
  '--accent-red-border':   'rgba(239,68,68,0.25)',
  '--accent-yellow':       '#eab308',
  '--accent-yellow-bg':    'rgba(234,179,8,0.1)',
  '--accent-yellow-border':'rgba(234,179,8,0.28)',
  '--accent-blue':         '#3b82f6',
  '--accent-blue-bg':      'rgba(59,130,246,0.1)',
  '--accent-blue-border':  'rgba(59,130,246,0.25)',

  '--avatar-gradient': 'linear-gradient(135deg, #27272a, #3f3f46)',
  '--avatar-border':   'rgba(255,255,255,0.1)',

  '--btn-primary-bg':   '#fafafa',
  '--btn-primary-text': '#09090b',
};

/* ═══════════════════════════════════════════════════════════
 *  LIGHT THEME
 * ═══════════════════════════════════════════════════════════ */
export const lightTokens: ThemeTokens = {
  '--bg-page':      '#f4f4f5',
  '--bg-sidebar':   '#ffffff',
  '--bg-surface':   '#ffffff',
  '--bg-elevated':  '#f4f4f5',
  '--bg-hover':     '#e4e4e7',
  '--bg-topbar':    '#ffffff',
  '--bg-input':     '#f4f4f5',
  '--bg-overlay':   'rgba(0,0,0,0.3)',

  '--text-primary':   '#18181b',
  '--text-secondary': '#3f3f46',
  '--text-muted':     '#71717a',
  '--text-dim':       '#a1a1aa',
  '--text-dimmer':    '#d4d4d8',
  '--text-inverse':   '#fafafa',

  '--border-subtle':  'rgba(0,0,0,0.04)',
  '--border-default': 'rgba(0,0,0,0.08)',
  '--border-strong':  'rgba(0,0,0,0.12)',

  '--shadow-card':  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  '--shadow-modal': '0 20px 40px -15px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',

  '--accent-green':        '#16a34a',
  '--accent-green-dim':    'rgba(22,163,74,0.7)',
  '--accent-green-bg':     'rgba(22,163,74,0.08)',
  '--accent-green-border': 'rgba(22,163,74,0.2)',
  '--accent-red':          '#dc2626',
  '--accent-red-dim':      '#ef4444',
  '--accent-red-bg':       'rgba(220,38,38,0.06)',
  '--accent-red-border':   'rgba(220,38,38,0.18)',
  '--accent-yellow':       '#ca8a04',
  '--accent-yellow-bg':    'rgba(202,138,4,0.08)',
  '--accent-yellow-border':'rgba(202,138,4,0.2)',
  '--accent-blue':         '#2563eb',
  '--accent-blue-bg':      'rgba(37,99,235,0.06)',
  '--accent-blue-border':  'rgba(37,99,235,0.18)',

  '--avatar-gradient': 'linear-gradient(135deg, #e4e4e7, #d4d4d8)',
  '--avatar-border':   'rgba(0,0,0,0.1)',

  '--btn-primary-bg':   '#18181b',
  '--btn-primary-text': '#fafafa',
};

/** Resolve tokens map for a given mode. */
export const getTokens = (mode: ThemeMode): ThemeTokens =>
  mode === 'dark' ? darkTokens : lightTokens;
