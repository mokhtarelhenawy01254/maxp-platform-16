import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Filter,
  Clock,
  AlertCircle,
  Tag,
  CheckCircle2,
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  estimatedMinutes?: number;
}

export const TasksTab: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('maxp_desktop_tasks');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: '1',
        title: 'مراجعة طلبات شحن العملاء وتأكيد أرقام البوليصات',
        priority: 'high',
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        estimatedMinutes: 45,
      },
      {
        id: '2',
        title: 'مطابقة الفواتير المعلقة مع قسم الحسابات',
        priority: 'normal',
        status: 'pending',
        createdAt: new Date().toISOString(),
        estimatedMinutes: 30,
      },
      {
        id: '3',
        title: 'إرسال التقرير اليومي للإدارة',
        priority: 'low',
        status: 'pending',
        createdAt: new Date().toISOString(),
        estimatedMinutes: 15,
      },
    ];
  });

  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'normal' | 'low'>('normal');

  useEffect(() => {
    try {
      localStorage.setItem('maxp_desktop_tasks', JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      priority: newPriority,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
    };

    setTasks([newTask, ...tasks]);
    setNewTitle('');
  };

  const toggleTaskStatus = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextStatus = t.status === 'completed' ? 'in_progress' : 'completed';
        return { ...t, status: nextStatus };
      })
    );
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'in_progress') return t.status !== 'completed';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const priorityColor = (p: string) => {
    if (p === 'high') return '#ef4444';
    if (p === 'normal') return '#38bdf8';
    return '#a1a1aa';
  };

  const priorityLabel = (p: string) => {
    if (p === 'high') return 'عاجل';
    if (p === 'normal') return 'عادي';
    return 'منخفض';
  };

  return (
    <div style={styles.container}>
      {/* Top Header Card */}
      <div style={styles.headerCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckSquare size={18} color="#22c55e" />
          <span style={styles.headerTitle}>قائمة مهام العمل الموكلة إليك</span>
        </div>
        <div style={styles.summaryBadge}>
          <span style={{ color: '#22c55e', fontWeight: 600 }}>{completedCount}</span>
          <span>من</span>
          <span style={{ fontWeight: 600 }}>{tasks.length}</span>
          <span>مكتملة</span>
        </div>
      </div>

      {/* Add Task Form */}
      <form onSubmit={handleAddTask} style={styles.addForm}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="أضف مهمة عمل جديدة الآن…"
          style={styles.input}
        />
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value as any)}
          style={styles.select}
        >
          <option value="high">عاجل</option>
          <option value="normal">عادي</option>
          <option value="low">منخفض</option>
        </select>
        <button
          type="submit"
          style={styles.addBtn}
          onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
          onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        >
          <Plus size={16} />
          <span>إضافة</span>
        </button>
      </form>

      {/* Filter Tabs */}
      <div style={styles.filterRow}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'in_progress', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...styles.filterBtn,
                background: filter === f ? '#27272a' : '#141417',
                color: filter === f ? '#fafafa' : '#71717a',
                borderColor: filter === f ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
              }}
            >
              {f === 'all' && 'الكل'}
              {f === 'in_progress' && 'قيد التنفيذ'}
              {f === 'completed' && 'المكتملة'}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div style={styles.list}>
        {filteredTasks.length === 0 ? (
          <div style={styles.emptyState}>لا توجد مهام في هذا التصنيف</div>
        ) : (
          filteredTasks.map((t) => {
            const isDone = t.status === 'completed';
            return (
              <div
                key={t.id}
                onClick={() => toggleTaskStatus(t.id)}
                style={{
                  ...styles.taskCard,
                  opacity: isDone ? 0.6 : 1,
                  borderColor: isDone ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
                }}
              >
                <div style={styles.checkIcon}>
                  {isDone ? (
                    <CheckCircle2 size={18} color="#22c55e" />
                  ) : (
                    <Square size={18} color="#71717a" />
                  )}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      ...styles.taskTitle,
                      textDecoration: isDone ? 'line-through' : 'none',
                      color: isDone ? '#a1a1aa' : '#fafafa',
                    }}
                  >
                    {t.title}
                  </div>
                  <div style={styles.taskMeta}>
                    <span
                      style={{
                        ...styles.priorityPill,
                        color: priorityColor(t.priority),
                        borderColor: `${priorityColor(t.priority)}33`,
                      }}
                    >
                      {priorityLabel(t.priority)}
                    </span>
                    <span style={styles.timeLabel}>
                      {new Date(t.createdAt).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  headerCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#121216',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: '12px 14px',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#fafafa',
  },
  summaryBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    color: '#a1a1aa',
    fontVariantNumeric: 'tabular-nums',
  },
  addForm: {
    display: 'flex',
    gap: 8,
  },
  input: {
    flex: 1,
    background: '#121216',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    padding: '8px 12px',
    color: '#fafafa',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
  },
  select: {
    background: '#121216',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    padding: '8px 10px',
    color: '#e4e4e7',
    fontSize: 12,
    outline: 'none',
    fontFamily: 'inherit',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: '#22c55e',
    color: '#000',
    border: 'none',
    borderRadius: 6,
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  filterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterBtn: {
    border: '1px solid transparent',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 11,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 'calc(100vh - 270px)',
    overflowY: 'auto',
  },
  taskCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    background: '#121216',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: '10px 12px',
    cursor: 'pointer',
    transition: 'all 140ms ease-out',
  },
  checkIcon: {
    marginTop: 2,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.4,
  },
  taskMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  priorityPill: {
    fontSize: 10,
    fontWeight: 600,
    border: '1px solid',
    borderRadius: 4,
    padding: '1px 6px',
  },
  timeLabel: {
    fontSize: 10,
    color: '#71717a',
    fontVariantNumeric: 'tabular-nums',
  },
  emptyState: {
    textAlign: 'center',
    padding: '30px 10px',
    color: '#52525b',
    fontSize: 12,
  },
};

export default TasksTab;
