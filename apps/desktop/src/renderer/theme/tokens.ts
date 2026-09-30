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
  '--accent-orange': string;
  '--accent-purple': string;
  '--accent-purple-soft': string;

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
  '--accent-yellow':       '#f59e0b',
  '--accent-yellow-bg':    'rgba(245,158,11,0.1)',
  '--accent-yellow-border':'rgba(245,158,11,0.28)',
  '--accent-blue':         '#38bdf8',
  '--accent-blue-bg':      'rgba(56,189,248,0.1)',
  '--accent-blue-border':  'rgba(56,189,248,0.25)',
  '--accent-orange':        '#f97316',
  '--accent-purple':        '#a855f7',
  '--accent-purple-soft':   '#c084fc',

  '--avatar-gradient': 'linear-gradient(135deg, #27272a, #3f3f46)',
  '--avatar-border':   'rgba(255,255,255,0.1)',

  '--btn-primary-bg':   '#fafafa',
  '--btn-primary-text': '#09090b',
};

/* ═══════════════════════════════════════════════════════════
 *  LIGHT THEME
 * ═══════════════════════════════════════════════════════════ */
export const lightTokens: ThemeTokens = {
  '--bg-page':      '#f8fafc',
  '--bg-sidebar':   '#ffffff',
  '--bg-surface':   '#ffffff',
  '--bg-elevated':  '#f1f5f9',
  '--bg-hover':     '#e2e8f0',
  '--bg-topbar':    '#ffffff',
  '--bg-input':     '#ffffff',
  '--bg-overlay':   'rgba(15, 23, 42, 0.45)',

  '--text-primary':   '#0f172a',
  '--text-secondary': '#334155',
  '--text-muted':     '#64748b',
  '--text-dim':       '#94a3b8',
  '--text-dimmer':    '#cbd5e1',
  '--text-inverse':   '#ffffff',

  '--border-subtle':  'rgba(0, 0, 0, 0.06)',
  '--border-default': 'rgba(0, 0, 0, 0.10)',
  '--border-strong':  'rgba(0, 0, 0, 0.16)',

  '--shadow-card':  '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
  '--shadow-modal': '0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.08)',

  '--accent-green':        '#16a34a',
  '--accent-green-dim':    'rgba(22, 163, 74, 0.7)',
  '--accent-green-bg':     'rgba(22, 163, 74, 0.08)',
  '--accent-green-border': 'rgba(22, 163, 74, 0.22)',
  '--accent-red':          '#dc2626',
  '--accent-red-dim':      '#ef4444',
  '--accent-red-bg':       'rgba(220, 38, 38, 0.08)',
  '--accent-red-border':   'rgba(220, 38, 38, 0.22)',
  '--accent-yellow':       '#d97706',
  '--accent-yellow-bg':    'rgba(217, 119, 6, 0.08)',
  '--accent-yellow-border':'rgba(217, 119, 6, 0.22)',
  '--accent-blue':         '#0284c7',
  '--accent-blue-bg':      'rgba(2, 132, 199, 0.08)',
  '--accent-blue-border':  'rgba(2, 132, 199, 0.22)',
  '--accent-orange':        '#ea580c',
  '--accent-purple':        '#7c3aed',
  '--accent-purple-soft':   '#9333ea',

  '--avatar-gradient': 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
  '--avatar-border':   'rgba(0, 0, 0, 0.1)',

  '--btn-primary-bg':   '#0f172a',
  '--btn-primary-text': '#ffffff',
};

/** Resolve tokens map for a given mode. */
export const getTokens = (mode: ThemeMode): ThemeTokens =>
  mode === 'dark' ? darkTokens : lightTokens;

/* ═══════════════════════════════════════════════════════════
 *  THEME PRESETS (2026) — each inherits a base mode and re-skins
 *  the accent family + background tints. Semantic colors (red/
 *  yellow/blue) stay constant across presets by design.
 * ═══════════════════════════════════════════════════════════ */

export interface ThemePreset {
  id: string;
  name: string;
  base: ThemeMode;
  accent: string; // picker swatch color
  overrides: Partial<ThemeTokens>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'carbon',
    name: 'كربون',
    base: 'dark',
    accent: '#22c55e',
    overrides: {}, // identity — pure darkTokens
  },
  {
    id: 'rose',
    name: 'روز',
    base: 'dark',
    accent: '#fb7185',
    overrides: {
      '--bg-page': '#0d0a0e',
      '--bg-sidebar': '#110d12',
      '--bg-surface': '#161116',
      '--bg-elevated': '#1d161c',
      '--bg-topbar': '#0f0c10',
      '--bg-input': '#0c0a0d',
      '--accent-green': '#fb7185',
      '--accent-green-dim': 'rgba(251,113,133,0.7)',
      '--accent-green-bg': 'rgba(251,113,133,0.12)',
      '--accent-green-border': 'rgba(251,113,133,0.28)',
      '--avatar-gradient': 'linear-gradient(135deg, #2c1e26, #4a2f3d)',
    },
  },
  {
    id: 'lavender',
    name: 'لافندر',
    base: 'dark',
    accent: '#a78bfa',
    overrides: {
      '--bg-page': '#0c0b12',
      '--bg-sidebar': '#0f0e16',
      '--bg-surface': '#14121d',
      '--bg-elevated': '#1b1826',
      '--bg-topbar': '#0e0d14',
      '--bg-input': '#0b0a10',
      '--accent-green': '#a78bfa',
      '--accent-green-dim': 'rgba(167,139,250,0.7)',
      '--accent-green-bg': 'rgba(167,139,250,0.12)',
      '--accent-green-border': 'rgba(167,139,250,0.28)',
      '--avatar-gradient': 'linear-gradient(135deg, #241f33, #38304f)',
    },
  },
  {
    id: 'corpblue',
    name: 'أزرق مؤسسي',
    base: 'dark',
    accent: '#60a5fa',
    overrides: {
      '--bg-page': '#0a0d12',
      '--bg-sidebar': '#0d1117',
      '--bg-surface': '#111721',
      '--bg-elevated': '#171f2b',
      '--bg-topbar': '#0c1015',
      '--bg-input': '#090c11',
      '--accent-green': '#60a5fa',
      '--accent-green-dim': 'rgba(96,165,250,0.7)',
      '--accent-green-bg': 'rgba(96,165,250,0.12)',
      '--accent-green-border': 'rgba(96,165,250,0.28)',
      '--avatar-gradient': 'linear-gradient(135deg, #1d2633, #2e3d52)',
    },
  },
  {
    id: 'latte',
    name: 'لاتيه',
    base: 'light',
    accent: '#b05c30',
    overrides: {
      '--bg-page': '#fdfbf7',
      '--bg-sidebar': '#fbf7ef',
      '--bg-surface': '#ffffff',
      '--bg-elevated': '#f5efe3',
      '--bg-hover': '#ece4d4',
      '--bg-topbar': '#fdfbf7',
      '--bg-input': '#ffffff',
      '--accent-green': '#b05c30',
      '--accent-green-dim': 'rgba(176,92,48,0.7)',
      '--accent-green-bg': 'rgba(176,92,48,0.10)',
      '--accent-green-border': 'rgba(176,92,48,0.26)',
      '--avatar-gradient': 'linear-gradient(135deg, #efe6d6, #d8c9b2)',
    },
  },
  {
    id: 'sand',
    name: 'بيج صحراوي',
    base: 'light',
    accent: '#963c4a',
    overrides: {
      '--bg-page': '#f7f3ec',
      '--bg-sidebar': '#f2ede2',
      '--bg-surface': '#fdfbf7',
      '--bg-elevated': '#ece5d7',
      '--bg-hover': '#e1d9c8',
      '--bg-topbar': '#f7f3ec',
      '--bg-input': '#fdfbf7',
      '--accent-green': '#963c4a',
      '--accent-green-dim': 'rgba(150,60,74,0.7)',
      '--accent-green-bg': 'rgba(150,60,74,0.10)',
      '--accent-green-border': 'rgba(150,60,74,0.26)',
      '--avatar-gradient': 'linear-gradient(135deg, #e7dfd0, #cec2ab)',
    },
  },
];

export function getPreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id);
}

/** Base tokens for a mode, re-skinned by the preset when it matches the mode. */
export function getTokensFor(mode: ThemeMode, presetId: string): ThemeTokens {
  const base = mode === 'dark' ? darkTokens : lightTokens;
  const preset = getPreset(presetId);
  if (!preset || preset.base !== mode) return base;
  return { ...base, ...preset.overrides };
}
