import React, { useRef, useState } from 'react';
import { Plus, Square, CheckSquare, X, ListChecks } from 'lucide-react';

interface AcceptanceCriteriaChecklistProps {
  value: string;
  onChange?: (next: string) => void;
  readOnly?: boolean;
  interactive?: boolean;
}

const toItems = (raw: string): string[] =>
  String(raw || '')
    .split('\n')
    .map((l) => l.replace(/^[-*•\d.\s]+/, '').trim())
    .filter(Boolean);

export const AcceptanceCriteriaChecklist: React.FC<AcceptanceCriteriaChecklistProps> = ({
  value,
  onChange,
  readOnly = false,
  interactive = false,
}) => {
  // Raw lines while editing (no trimming) — cleaned on blur / add.
  const items = value ? String(value).split('\n') : [];
  const [draft, setDraft] = useState('');
  const [checkedMap, setCheckedMap] = useState<Record<number, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (next: string[]) => onChange?.(next.filter((t) => t.trim()).join('\n'));

  const addDraft = () => {
    if (readOnly || !onChange) return;
    const lines = toItems(draft);
    if (lines.length === 0) return;
    commit([...items, ...lines]);
    setDraft('');
    inputRef.current?.focus();
  };

  const updateItem = (idx: number, text: string) => {
    if (readOnly || !onChange) return;
    const next = [...items];
    next[idx] = text;
    onChange(next.join('\n'));
  };

  const removeItem = (idx: number) => {
    if (readOnly || !onChange) return;
    commit(items.filter((_, i) => i !== idx));
  };

  const toggleCheck = (idx: number) => {
    if (!interactive) return;
    setCheckedMap((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // If readOnly view mode
  if (readOnly) {
    const displayItems = toItems(value);
    const completedCount = displayItems.filter((_, idx) => checkedMap[idx]).length;

    if (displayItems.length === 0) {
      return (
        <div>
          <div style={s.headerRow}>
            <label style={s.label}>
              <ListChecks size={13} style={{ verticalAlign: '-2px', marginInlineEnd: 4 }} />
              معايير القبول
            </label>
          </div>
          <div style={s.emptyState}>
            <span>لم يتم تحديد معايير قبول لهذه المهمة.</span>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div style={s.headerRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ListChecks size={13} color="var(--accent-blue)" />
            <label style={{ ...s.label, color: 'var(--text-primary)', fontWeight: 600 }}>
              معايير القبول والتسليم
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {interactive && (
              <span
                style={{
                  ...s.counter,
                  color: completedCount === displayItems.length ? 'var(--accent-green)' : 'var(--text-dim)',
                  borderColor:
                    completedCount === displayItems.length
                      ? 'var(--accent-green-border)'
                      : 'var(--border-default)',
                  backgroundColor:
                    completedCount === displayItems.length ? 'var(--accent-green-bg)' : 'transparent',
                }}
              >
                {completedCount} / {displayItems.length}
              </span>
            )}
            {!interactive && <span style={s.counter}>{displayItems.length} معايير</span>}
          </div>
        </div>

        <div style={s.readOnlyList}>
          {displayItems.map((text, idx) => {
            const isChecked = Boolean(checkedMap[idx]);
            return (
              <div
                key={idx}
                onClick={() => interactive && toggleCheck(idx)}
                style={{
                  ...s.readOnlyItem,
                  cursor: interactive ? 'pointer' : 'default',
                  backgroundColor: isChecked ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
                  borderColor: isChecked ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-subtle)',
                }}
              >
                <div style={{ flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center' }}>
                  {isChecked ? (
                    <CheckSquare size={14} color="var(--accent-green)" />
                  ) : (
                    <Square size={14} color="var(--text-dim)" />
                  )}
                </div>
                <span
                  style={{
                    ...s.readOnlyText,
                    textDecoration: isChecked ? 'line-through' : 'none',
                    color: isChecked ? 'var(--text-dim)' : 'var(--text-primary)',
                  }}
                >
                  {text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Edit / Form Mode
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
              const pastedText = e.clipboardData.getData('text');
              if (pastedText.includes('\n')) {
                e.preventDefault();
                commit([...items, ...toItems(pastedText)]);
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
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
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
  readOnlyList: {
    backgroundColor: 'var(--bg-hover, rgba(255, 255, 255, 0.02))',
    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.07))',
    borderRadius: 6,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  readOnlyItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '7px 10px',
    borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.07))',
    transition: 'background-color 120ms ease, border-color 120ms ease',
  },
  readOnlyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 1.5,
    wordBreak: 'break-word',
    transition: 'color 120ms ease',
  },
  emptyState: {
    padding: '10px 12px',
    fontSize: 11.5,
    color: 'var(--text-dim)',
    fontStyle: 'italic',
    backgroundColor: 'var(--bg-hover, rgba(255, 255, 255, 0.02))',
    borderRadius: 6,
    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.07))',
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
