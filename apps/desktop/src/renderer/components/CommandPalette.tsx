import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, CheckSquare, Timer, Target, FileText, Activity, Globe, Clock,
  Cpu, Plus, Moon, Sun, RefreshCw, CornerDownLeft, Palette, Play,
} from 'lucide-react';
import { THEME_PRESETS } from '../theme/tokens';

interface PaletteProps {
  open: boolean;
  onClose: () => void;
}

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  keywords: string;
  run: () => void;
}

/**
 * Ctrl+K command palette — jump to any screen, open any task, or run actions.
 * Esc closes, ↑/↓ navigate, Enter runs.
 */
export const CommandPalette: React.FC<PaletteProps> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [tasks, setTasks] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) { setQuery(''); setCursor(0); return; }
    inputRef.current?.focus();
    window.electronAPI?.getTasks('all')
      .then((res: any) => { if (res?.success && Array.isArray(res.tasks)) setTasks(res.tasks); })
      .catch(() => {});
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const nav = (tab: string): void => {
      localStorage.setItem('maxp_active_tab', tab);
      window.dispatchEvent(new CustomEvent('maxp:navigate', { detail: { tab } }));
    };
    const cmds: Command[] = [
      { id: 'nav-tasks', label: 'المهام والإنتاجية', icon: <CheckSquare size={14} />, keywords: 'tasks مهام', run: () => nav('tasks') },
      { id: 'nav-timers', label: 'المؤقتات الحية', icon: <Timer size={14} />, keywords: 'timers مؤقت مؤقتات', run: () => nav('timers') },
      { id: 'nav-goals', label: 'الأهداف ومؤشرات الأداء', icon: <Target size={14} />, keywords: 'goals أهداف okr', run: () => nav('goals') },
      { id: 'nav-reports', label: 'تقارير الأداء', icon: <FileText size={14} />, keywords: 'reports تقرير تقارير', run: () => nav('reports') },
      { id: 'nav-cockpit', label: 'سجل النشاط وساعات العمل', icon: <Activity size={14} />, keywords: 'cockpit نشاط سجل ساعات', run: () => nav('cockpit') },
      { id: 'nav-apps', label: 'البرامج والمواقع', icon: <Globe size={14} />, keywords: 'apps برامج مواقع', run: () => nav('apps') },
      { id: 'nav-attendance', label: 'مطابقة الحضور والتدقيق', icon: <Clock size={14} />, keywords: 'attendance حضور تدقيق', run: () => nav('attendance') },
      { id: 'nav-system', label: 'حالة السحابة والجهاز', icon: <Cpu size={14} />, keywords: 'system سحابة جهاز حالة', run: () => nav('system') },
      { id: 'act-new', label: 'مهمة جديدة…', hint: 'Ctrl+N', icon: <Plus size={14} />, keywords: 'new create مهمة جديدة إنشاء', run: () => { nav('tasks'); setTimeout(() => window.dispatchEvent(new CustomEvent('maxp:new-task')), 120); } },
      { id: 'act-sync', label: 'مزامنة الآن', icon: <RefreshCw size={14} />, keywords: 'sync مزامنة', run: () => { window.electronAPI?.syncNow(); } },
      { id: 'act-updates', label: 'التحقق من التحديثات', icon: <Play size={14} />, keywords: 'update تحديث إصدار', run: () => { window.electronAPI?.checkForUpdates(); } },
      { id: 'act-theme-toggle', label: 'تبديل داكن/فاتح', icon: <Moon size={14} />, keywords: 'theme ثيم وضع داكن فاتح', run: () => { nav(document.documentElement.getAttribute('data-theme') === 'dark' ? 'tasks' : 'tasks'); window.dispatchEvent(new CustomEvent('maxp:toggle-theme')); } },
      ...THEME_PRESETS.map((p) => ({
        id: `theme-${p.id}`,
        label: `ثيم: ${p.name}`,
        icon: <Palette size={14} />,
        keywords: `theme preset ثيم ${p.name} ${p.id}`,
        run: () => { nav('tasks'); setTimeout(() => window.dispatchEvent(new CustomEvent('maxp:preset', { detail: p.id })), 120); },
      })),
    ];
    return cmds;
  }, []);

  const q = query.trim().toLowerCase();
  const matchedCommands = useMemo(() =>
    q ? commands.filter((c) => (c.label + ' ' + c.keywords).toLowerCase().includes(q)) : commands,
  [commands, q]);

  const matchedTasks = useMemo(() => {
    if (!q || q.length < 2) return [];
    return tasks
      .filter((t) => String(t.title || '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [tasks, q]);

  const items = useMemo(() => ([
    ...matchedTasks.map((t) => ({
      id: `task-${t.id}`,
      label: t.title || 'مهمة',
      hint: String(t.status || '').toUpperCase(),
      icon: <CheckSquare size={14} />,
      task: t,
    })),
    ...matchedCommands,
  ]), [matchedTasks, matchedCommands]);

  useEffect(() => { setCursor((c) => Math.min(c, Math.max(0, items.length - 1))); }, [items.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, items.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const item = items[cursor];
        if (!item) return;
        onClose();
        if ('task' in item && item.task) {
          localStorage.setItem('maxp_active_tab', 'tasks');
          window.dispatchEvent(new CustomEvent('maxp:navigate', { detail: { tab: 'tasks' } }));
          setTimeout(() => window.dispatchEvent(new CustomEvent('maxp:open-task', { detail: item.task })), 150);
        } else {
          (item as Command).run();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, cursor, onClose]);

  // keep highlighted row visible
  useEffect(() => {
    listRef.current?.querySelectorAll('[data-idx]')?.[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        backgroundColor: 'var(--bg-overlay)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        paddingTop: 90,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560, maxWidth: '92vw',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <Search size={15} color="var(--text-muted)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن مهمة، شاشة، أو أمر…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit' }}
          />
          <span style={{ ...styles.kbd }}>Esc</span>
        </div>

        <div ref={listRef} style={{ maxHeight: 380, overflowY: 'auto', padding: 6 }}>
          {items.length === 0 && (
            <div style={{ padding: 18, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              لا نتائج مطابقة.
            </div>
          )}
          {items.map((item, idx) => {
            const active = idx === cursor;
            return (
              <div
                key={item.id}
                data-idx={idx}
                onMouseEnter={() => setCursor(idx)}
                onClick={() => {
                  onClose();
                  if ('task' in item && item.task) {
                    localStorage.setItem('maxp_active_tab', 'tasks');
                    window.dispatchEvent(new CustomEvent('maxp:navigate', { detail: { tab: 'tasks' } }));
                    setTimeout(() => window.dispatchEvent(new CustomEvent('maxp:open-task', { detail: item.task })), 150);
                  } else {
                    (item as Command).run();
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                  background: active ? 'var(--accent-green-bg)' : 'transparent',
                  color: 'var(--text-primary)',
                }}
              >
                <span style={{ color: active ? 'var(--accent-green)' : 'var(--text-muted)', display: 'inline-flex' }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.label}
                </span>
                {item.hint && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{item.hint}</span>
                )}
                {active && <CornerDownLeft size={12} color="var(--text-muted)" />}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderTop: '1px solid var(--border-subtle)', fontSize: 10, color: 'var(--text-muted)' }}>
          <span>↑↓ تنقل</span>
          <span>Enter تنفيذ</span>
          <span>Esc إغلاق</span>
          <span style={{ marginInlineStart: 'auto' }}>Ctrl+K في أي وقت</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  kbd: {
    fontSize: 9.5,
    fontFamily: 'monospace',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-default)',
    borderRadius: 4,
    padding: '1px 5px',
  },
};

export default CommandPalette;
