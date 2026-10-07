import React, { useRef, useState } from 'react';
import { Plus, Square, X, ListChecks } from 'lucide-react';

interface AcceptanceCriteriaChecklistProps {
  value: string;
  onChange: (next: string) => void;
}

const toItems = (raw: string): string[] =>
  String(raw || '')
    .split('\n')
    .map((l) => l.replace(/^[-*•\d.\s]+/, '').trim())
    .filter(Boolean);

export const AcceptanceCriteriaChecklist: React.FC<AcceptanceCriteriaChecklistProps> = ({
  value,
  onChange,
}) => {
  // Raw lines while editing (no trimming) — cleaned on blur / add.
  const items = value ? String(value).split('\n') : [];
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (next: string[]) => onChange(next.filter((t) => t.trim()).join('\n'));

  const addDraft = () => {
    const lines = toItems(draft);
    if (lines.length === 0) return;
    commit([...items, ...lines]);
    setDraft('');
    inputRef.current?.focus();
  };

  const updateItem = (idx: number, text: string) => {
    const next = [...items];
    next[idx] = text;
    onChange(next.join('\n'));
  };

  const removeItem = (idx: number) => commit(items.filter((_, i) => i !== idx));

  return (
    <div>
      <div style={s.headerRow}>
        <label style={s.label}>
          <ListChecks size={12} style={{ verticalAlign: '-2px', marginInlineEnd: 4 }} />
          معايير القبول
          <span style={{ color: 'var(--text-dim)', marginInlineStart: 4 }}>(اختياري)</span>
        </label>
        <span style={s.counter}>{items.length}</span>
      </div>

      <div style={s.list}>
        {items.map((text, idx) => (
          <div key={idx} style={s.item}>
            <Square size={14} color="var(--text-dim)" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={text}
              onChange={(e) => updateItem(idx, e.target.value)}
              onBlur={() => commit(items)}
              aria-label={`معيار ${idx + 1}`}
              style={s.itemInput}
            />
            <button
              type="button"
              onClick={() => removeItem(idx)}
              style={s.removeBtn}
              title="حذف المعيار"
              aria-label="حذف المعيار"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        <div style={{ ...s.item, borderBottom: 'none' }}>
          <Plus size={14} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addDraft();
              }
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (text.includes('\n')) {
                e.preventDefault();
                commit([...items, ...toItems(text)]);
              }
            }}
            placeholder={items.length ? 'إضافة معيار… (Enter)' : 'اكتب أول معيار واضغط Enter…'}
            style={s.itemInput}
          />
          {draft.trim() && (
            <button type="button" onClick={addDraft} style={s.addBtn}>
              إضافة
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 11, color: 'var(--text-muted)' },
  counter: {
    fontSize: 10.5,
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--text-dim)',
    padding: '1px 7px',
    borderRadius: 10,
    border: '1px solid var(--border-default)',
  },
  list: {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-strong)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '2px 10px',
    borderBottom: '1px solid var(--border-default)',
  },
  itemInput: {
    flex: 1,
    minWidth: 0,
    padding: '6px 0',
    fontSize: 12,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: 3,
    display: 'flex',
    borderRadius: 4,
  },
  addBtn: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--accent-blue)',
    background: 'var(--accent-blue-bg)',
    border: '1px solid var(--accent-blue-border)',
    borderRadius: 5,
    padding: '2px 9px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
