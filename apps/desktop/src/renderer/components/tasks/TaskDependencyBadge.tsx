import React, { useState, useEffect } from 'react';
import {
  Link as LinkIcon,
  Plus,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
} from 'lucide-react';

interface TaskDependencyBadgeProps {
  taskId: string;
  onRefresh?: () => void;
}

export const TaskDependencyBadge: React.FC<TaskDependencyBadgeProps> = ({ taskId, onRefresh }) => {
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [depType, setDepType] = useState('blocked_by');

  const fetchDeps = async () => {
    try {
      setLoading(true);
      const res = await window.electronAPI.getTaskDependencies(taskId);
      if (res?.success) {
        // Handle both formats just in case: { blockedBy: [], blocks: [] } or a flat array
        let flatDeps: any[] = [];
        if (Array.isArray(res.data)) {
          flatDeps = res.data;
        } else if (res.data?.blockedBy || res.data?.blocks) {
          flatDeps = [...(res.data.blockedBy || []), ...(res.data.blocks || [])];
        }
        setDependencies(flatDeps);
      }
    } catch (err) {
      console.error('[TaskDependencyBadge] Error fetching dependencies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeps();
  }, [taskId]);

  const handleAddClick = async () => {
    setIsAdding(true);
    try {
      const res = await window.electronAPI.getTasks('all');
      if (res?.success) {
        setAllTasks(res.tasks.filter((t: any) => t.id !== taskId));
      }
    } catch (err) {
      console.error('[TaskDependencyBadge] Error fetching tasks:', err);
    }
  };

  const handleAddDependency = async (selectedId: string) => {
    try {
      const res = await window.electronAPI.addTaskDependency(taskId, selectedId, depType);
      if (res?.success) {
        setIsAdding(false);
        setSearchQuery('');
        fetchDeps();
        onRefresh?.();
      }
    } catch (err) {
      console.error('[TaskDependencyBadge] Error adding dependency:', err);
    }
  };

  const handleRemoveDependency = async (depId: string) => {
    try {
      const res = await window.electronAPI.removeTaskDependency(depId);
      if (res?.success) {
        fetchDeps();
        onRefresh?.();
      }
    } catch (err) {
      console.error('[TaskDependencyBadge] Error removing dependency:', err);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>جاري تحميل التبعيات...</span>
      </div>
    );
  }

  // A dependency where this task depends on another
  const blockedBy = dependencies.filter(d => d.type === 'blocked_by' && d.taskId === taskId);
  // A dependency where another task depends on this one
  const blocks = dependencies.filter(d => d.type === 'blocked_by' && d.dependsOnId === taskId);

  const getStatusIcon = (status: string) => {
    const s = String(status || '').toUpperCase();
    if (s === 'COMPLETED') return <CheckCircle2 size={12} color="var(--accent-green)" />;
    return <Clock size={12} color="var(--accent-yellow)" />;
  };

  const getStatusText = (status: string) => {
    const s = String(status || '').toUpperCase();
    if (s === 'COMPLETED') return 'مكتملة';
    if (s === 'IN_PROGRESS') return 'قيد التنفيذ';
    if (s === 'PENDING_REVIEW' || s === 'IN_REVIEW') return 'بانتظار الاعتماد';
    return 'قيد الانتظار';
  };

  const hasIncompleteBlocking = blockedBy.some(d => String(d.dependsOn?.status || '').toUpperCase() !== 'COMPLETED');

  const filteredTasks = allTasks.filter(t => 
    t.title?.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !dependencies.some(d => d.dependsOnId === t.id || d.taskId === t.id)
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <LinkIcon size={14} color="#6366f1" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>تبعيات المهمة</span>
        </div>
        {!isAdding && (
          <button
            onClick={handleAddClick}
            style={styles.addBtn}
            onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            <Plus size={12} />
            <span>إضافة تبعية</span>
          </button>
        )}
      </div>

      {hasIncompleteBlocking && (
        <div style={styles.warningBanner}>
          <AlertTriangle size={14} color="#b45309" />
          <span>هذه المهمة محظورة بمهام أخرى غير مكتملة</span>
        </div>
      )}

      {isAdding && (
        <div style={styles.addSection}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <select
              value={depType}
              onChange={(e) => setDepType(e.target.value)}
              style={styles.select}
            >
              <option value="blocked_by">محظورة بـ (تعتمد على)</option>
              <option value="blocks">تحظر (مهام أخرى تعتمد عليها)</option>
            </select>
            <button onClick={() => setIsAdding(false)} style={styles.iconBtn}>
              <X size={14} />
            </button>
          </div>
          
          <div style={styles.searchBox}>
            <Search size={12} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="ابحث عن مهمة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
              autoFocus
            />
          </div>

          <div style={styles.taskList}>
            {filteredTasks.length === 0 ? (
              <div style={{ padding: 8, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                لا توجد مهام مطابقة
              </div>
            ) : (
              filteredTasks.map(t => (
                <div
                  key={t.id}
                  style={styles.taskOption}
                  onClick={() => handleAddDependency(t.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    {getStatusIcon(t.status)}
                    <span style={styles.taskOptionTitle}>{t.title}</span>
                  </div>
                  <span style={styles.taskOptionStatus}>{getStatusText(t.status)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {blockedBy.length > 0 && (
        <div style={styles.listGroup}>
          <div style={styles.groupTitle}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-red)' }} />
            محظورة بـ (يجب إكمالها أولاً)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {blockedBy.map(dep => {
              const otherTask = dep.dependsOn;
              if (!otherTask) return null;
              const isComp = String(otherTask.status || '').toUpperCase() === 'COMPLETED';
              return (
                <div key={dep.id} style={{ ...styles.depItem, borderColor: isComp ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)', backgroundColor: isComp ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    {getStatusIcon(otherTask.status)}
                    <span style={styles.depTitle} title={otherTask.title}>{otherTask.title}</span>
                    <span style={styles.depStatus}>({getStatusText(otherTask.status)})</span>
                  </div>
                  <button onClick={() => handleRemoveDependency(dep.id)} style={styles.removeBtn}>
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {blocks.length > 0 && (
        <div style={styles.listGroup}>
          <div style={styles.groupTitle}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }} />
            تحظر (تنتظر إكمال هذه المهمة)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {blocks.map(dep => {
              const otherTask = dep.task;
              if (!otherTask) return null;
              return (
                <div key={dep.id} style={{ ...styles.depItem, borderColor: 'rgba(59, 130, 246, 0.3)', backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    {getStatusIcon(otherTask.status)}
                    <span style={styles.depTitle} title={otherTask.title}>{otherTask.title}</span>
                    <span style={styles.depStatus}>({getStatusText(otherTask.status)})</span>
                  </div>
                  <button onClick={() => handleRemoveDependency(dep.id)} style={styles.removeBtn}>
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dependencies.length === 0 && !isAdding && (
        <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-muted)', fontSize: 12 }}>
          لا توجد تبعيات لهذه المهمة
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'var(--bg-elevated, rgba(0,0,0,0.1))',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    padding: '10px 12px',
    marginTop: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(99, 102, 241, 0.1)',
    color: '#6366f1',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 100ms',
  },
  warningBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: 6,
    padding: '6px 10px',
    color: '#b45309',
    fontSize: 11,
    fontWeight: 600,
  },
  listGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  groupTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  depItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid transparent',
  },
  depTitle: {
    fontSize: 12,
    color: 'var(--text-primary)',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 200,
  },
  depStatus: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  removeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    borderRadius: 4,
  },
  addSection: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  select: {
    flex: 1,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 11,
    outline: 'none',
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 4,
    padding: '4px 8px',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: 11,
    outline: 'none',
  },
  taskList: {
    maxHeight: 120,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    border: '1px solid var(--border-default)',
    borderRadius: 4,
  },
  taskOption: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 8px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface)',
  },
  taskOptionTitle: {
    fontSize: 11,
    color: 'var(--text-primary)',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 150,
  },
  taskOptionStatus: {
    fontSize: 10,
    color: 'var(--text-muted)',
  },
};
