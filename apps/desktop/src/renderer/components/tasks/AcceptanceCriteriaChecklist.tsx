import React, { useRef, useState, useEffect } from 'react';
import {
  Plus,
  Square,
  CheckSquare,
  X,
  ListChecks,
  Check,
  GripVertical,
} from 'lucide-react';

interface AcceptanceCriteriaChecklistProps {
  value: string;
  onChange?: (next: string) => void;
  readOnly?: boolean;
  interactive?: boolean;
  taskId?: string;
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
  taskId,
}) => {
  // Raw lines while editing (no trimming) — cleaned on blur / add.
  const items = value ? String(value).split('\n') : [];
  const [draft, setDraft] = useState('');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Persistence of checked state in readOnly / interactive mode per task
  const [checkedMap, setCheckedMap] = useState<Record<number, boolean>>(() => {
    if (!taskId) return {};
    try {
      const stored = localStorage.getItem(`maxp_task_criteria_${taskId}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!taskId) return;
    try {
      const stored = localStorage.getItem(`maxp_task_criteria_${taskId}`);
      setCheckedMap(stored ? JSON.parse(stored) : {});
    } catch {
      setCheckedMap({});
    }
  }, [taskId]);

  const inputRef = useRef<HTMLInputElement>(null);
  const itemInputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
    setCheckedMap((prev) => {
      const updated = {
        ...prev,
        [idx]: !prev[idx],
      };
      if (taskId) {
        try {
          localStorage.setItem(`maxp_task_criteria_${taskId}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };

  // Keyboard navigation for items
  const handleKeyDownItem = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (idx + 1 < items.length) {
        itemInputRefs.current[idx + 1]?.focus();
      } else {
        inputRef.current?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx > 0) {
        itemInputRefs.current[idx - 1]?.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const inputEl = e.currentTarget;
      const cursorPos = inputEl.selectionStart ?? items[idx].length;
      const currentText = items[idx];
      const before = currentText.slice(0, cursorPos).trim();
      const after = currentText.slice(cursorPos).trim();

      const next = [...items];
      next[idx] = before;
      next.splice(idx + 1, 0, after);
      commit(next);

      setTimeout(() => {
        itemInputRefs.current[idx + 1]?.focus();
      }, 30);
    } else if (e.key === 'Backspace' && items[idx].trim() === '') {
      e.preventDefault();
      removeItem(idx);
      if (idx > 0) {
        itemInputRefs.current[idx - 1]?.focus();
      } else {
        inputRef.current?.focus();
      }
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const reordered = [...items];
    const [moved] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    setDraggedIdx(targetIdx);
    commit(reordered);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  // ReadOnly View Mode (TaskDetailDrawer)
  if (readOnly) {
    const displayItems = toItems(value);
    const completedCount = displayItems.filter((_, idx) => checkedMap[idx]).length;
    const totalCount = displayItems.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const isAllDone = totalCount > 0 && completedCount === totalCount;

    if (totalCount === 0) {
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
                  color: isAllDone ? 'var(--accent-green)' : 'var(--text-dim)',
                  borderColor: isAllDone ? 'var(--accent-green-border)' : 'var(--border-default)',
                  backgroundColor: isAllDone ? 'var(--accent-green-bg)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {isAllDone && <Check size={11} />}
                <span>
                  {completedCount} / {totalCount} ({percentage}%)
                </span>
              </span>
            )}
            {!interactive && <span style={s.counter}>{totalCount} معايير</span>}
          </div>
        </div>

        {/* Micro-Progress Bar */}
        {interactive && totalCount > 0 && (
          <div style={s.progressBarTrack}>
            <div
              style={{
                ...s.progressBarFill,
                width: `${percentage}%`,
                backgroundColor: isAllDone ? 'var(--accent-green)' : 'var(--accent-blue)',
              }}
            />
          </div>
        )}

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

  // Edit / Form Mode (CreateTaskModal & EditTaskModal)
  return (
    <div>
      <div style={s.headerRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ListChecks size={12} style={{ verticalAlign: '-2px', color: 'var(--accent-blue)' }} />
          <label style={s.label}>
            معايير القبول
            <span style={{ color: 'var(--text-dim)', marginInlineStart: 4 }}>(اختياري)</span>
          </label>
        </div>
        <span style={s.counter}>{items.length}</span>
      </div>

      <div style={s.list}>
        {items.map((text, idx) => (
          <div
            key={idx}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{
              ...s.item,
              opacity: draggedIdx === idx ? 0.4 : 1,
            }}
          >
            {/* Drag Handle */}
            <div
              style={{
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                color: hoveredIdx === idx ? 'var(--text-muted)' : 'transparent',
                transition: 'color 120ms ease',
                flexShrink: 0,
              }}
              title="اسحب لإعادة الترتيب"
            >
              <GripVertical size={12} />
            </div>

            <Square size={13} color="var(--text-dim)" style={{ flexShrink: 0 }} />

            <input
              ref={(el) => {
                itemInputRefs.current[idx] = el;
              }}
              type="text"
              value={text}
              onChange={(e) => updateItem(idx, e.target.value)}
              onBlur={() => commit(items)}
              onKeyDown={(e) => handleKeyDownItem(e, idx)}
              aria-label={`معيار ${idx + 1}`}
              style={s.itemInput}
            />

            {/* Hover-reveal delete button */}
            <button
              type="button"
              onClick={() => removeItem(idx)}
              style={{
                ...s.removeBtn,
                opacity: hoveredIdx === idx ? 1 : 0,
                pointerEvents: hoveredIdx === idx ? 'auto' : 'none',
              }}
              title="حذف المعيار (أو Backspace على سطر فارغ)"
              aria-label="حذف المعيار"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {/* Add New Criterion Input Row */}
        <div style={{ ...s.item, borderBottom: 'none' }}>
          <div style={{ width: 12, flexShrink: 0 }} />
          <Plus size={13} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addDraft();
              } else if (e.key === 'ArrowUp' && items.length > 0) {
                e.preventDefault();
                itemInputRefs.current[items.length - 1]?.focus();
              }
            }}
            onPaste={(e) => {
              const pastedText = e.clipboardData.getData('text');
              if (pastedText.includes('\n')) {
                e.preventDefault();
                commit([...items, ...toItems(pastedText)]);
              }
            }}
            placeholder={items.length ? 'إضافة معيار جديد… (Enter)' : 'اكتب أول معيار واضغط Enter…'}
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
  progressBarTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 240ms ease-out, background-color 240ms ease',
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
    gap: 6,
    padding: '2px 8px',
    borderBottom: '1px solid var(--border-default)',
    transition: 'background-color 100ms ease',
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
    transition: 'opacity 140ms ease, color 120ms ease',
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
