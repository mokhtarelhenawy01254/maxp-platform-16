import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Plus,
  RefreshCw,
  Users,
  CheckCircle2,
  Clock,
  ExternalLink,
  X,
  Layers,
} from 'lucide-react';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { TaskItemCard } from '../components/tasks/TaskItemCard';

export const TasksTab: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'my-tasks' | 'assigned-by-me'>('my-tasks');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [users, setUsers] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState('https://maxp.online');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Get auth state to retrieve serverUrl
      const authState = await window.electronAPI.getAuthState();
      if (authState?.serverUrl) {
        setServerUrl(authState.serverUrl);
      }

      // 1. Fetch tasks
      const res = await window.electronAPI.getTasks(activeView);
      if (res.success && Array.isArray(res.tasks)) {
        setTasks(res.tasks);
      }

      // 2. Fetch company users for assign dropdown
      const usersRes = await window.electronAPI.getCompanyUsers();
      if (usersRes.success && Array.isArray(usersRes.users)) {
        setUsers(usersRes.users);
      }
    } catch (err) {
      console.warn('[TasksTab] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeView]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleStatus = async (taskId: string, currentStatus: string) => {
    const isCompleted = String(currentStatus || '').toUpperCase() === 'COMPLETED';
    const nextStatus = isCompleted ? 'PENDING' : 'COMPLETED';

    // Optimistic local update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
    );

    try {
      await window.electronAPI.updateTaskStatus(taskId, nextStatus);
    } catch (err) {
      console.warn('[TasksTab] Status update failed:', err);
      // Rollback on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: currentStatus } : t))
      );
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const isDone = String(t.status || '').toUpperCase() === 'COMPLETED';
    if (statusFilter === 'IN_PROGRESS') return !isDone;
    if (statusFilter === 'COMPLETED') return isDone;
    return true;
  });

  const completedCount = tasks.filter(
    (t) => String(t.status || '').toUpperCase() === 'COMPLETED'
  ).length;

  return (
    <div style={styles.container}>
      {/* Top Header Card */}
      <div style={styles.headerCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={styles.iconBox}>
            <CheckSquare size={18} color="#38bdf8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={styles.headerTitle}>مركز مهام العمل والإنتاجية</span>
              <span style={styles.cloudBadge}>سحابي مركزي</span>
            </div>
            <span style={styles.headerSub}>
              مزامنة فورية مع لوحة تحكم المنصة وقاعدة بيانات الشركة
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setIsCreateOpen(true)}
            style={styles.addBtn}
            onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            <Plus size={15} />
            <span>تكليف مهمة جديدة</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            style={styles.refreshBtn}
            title="تحديث ومزامنة المهام من السيرفر"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main View Switcher (Assigned to Me vs Assigned by Me) */}
      <div style={styles.viewRow}>
        <div style={styles.segmented}>
          <button
            onClick={() => setActiveView('my-tasks')}
            style={{
              ...styles.segBtn,
              backgroundColor: activeView === 'my-tasks' ? '#27272a' : 'transparent',
              color: activeView === 'my-tasks' ? '#fafafa' : '#a1a1aa',
              fontWeight: activeView === 'my-tasks' ? 600 : 400,
            }}
          >
            <span>مهامي الموكلة إليّ</span>
          </button>
          <button
            onClick={() => setActiveView('assigned-by-me')}
            style={{
              ...styles.segBtn,
              backgroundColor: activeView === 'assigned-by-me' ? '#27272a' : 'transparent',
              color: activeView === 'assigned-by-me' ? '#fafafa' : '#a1a1aa',
              fontWeight: activeView === 'assigned-by-me' ? 600 : 400,
            }}
          >
            <Users size={12} />
            <span>مهام كلفت بها فريقي</span>
          </button>
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {(['ALL', 'IN_PROGRESS', 'COMPLETED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                ...styles.statusFilterBtn,
                backgroundColor: statusFilter === s ? '#18181b' : 'transparent',
                borderColor: statusFilter === s ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                color: statusFilter === s ? '#fafafa' : '#71717a',
              }}
            >
              {s === 'ALL' && `الكل (${tasks.length})`}
              {s === 'IN_PROGRESS' && `قيد التنفيذ (${tasks.length - completedCount})`}
              {s === 'COMPLETED' && `المكتملة (${completedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div style={styles.list}>
        {loading && tasks.length === 0 ? (
          <div style={styles.emptyState}>جاري جلب المهام من السيرفر السحابي…</div>
        ) : filteredTasks.length === 0 ? (
          <div style={styles.emptyState}>
            لا توجد مهام في هذا التصنيف حالياً. يمكنك إضافة مهمة جديدة لأحد زملائك في العمل بالضغط على "تكليف مهمة جديدة".
          </div>
        ) : (
          filteredTasks.map((t) => (
            <TaskItemCard
              key={t.id}
              task={t}
              onToggleStatus={handleToggleStatus}
              onOpenImage={(img) => setPreviewImage(img)}
              serverUrl={serverUrl}
            />
          ))
        )}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={loadData}
        users={users}
      />

      {/* Image Lightbox Modal */}
      {previewImage && (
        <div style={styles.lightboxOverlay} onClick={() => setPreviewImage(null)}>
          <div style={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.lightboxHeader}>
              <span style={{ fontSize: 12, color: '#fafafa', fontWeight: 600 }}>معاينة المرفق</span>
              <button onClick={() => setPreviewImage(null)} style={styles.closeBtn}>
                <X size={16} />
              </button>
            </div>
            <img src={previewImage} alt="Preview" style={styles.lightboxImg} />
          </div>
        </div>
      )}
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
    backgroundColor: '#121216',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#fafafa',
  },
  cloudBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    borderRadius: 4,
    padding: '1px 6px',
  },
  headerSub: {
    display: 'block',
    fontSize: 10,
    color: '#71717a',
    marginTop: 2,
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms ease-out',
  },
  refreshBtn: {
    backgroundColor: '#1c1c21',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#fafafa',
    borderRadius: 6,
    padding: '6px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  segmented: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#0d0d10',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 6,
    padding: 2,
  },
  segBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 12px',
    fontSize: 11,
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms ease-out',
  },
  statusFilterBtn: {
    padding: '4px 10px',
    fontSize: 11,
    borderRadius: 6,
    border: '1px solid',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms ease-out',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  emptyState: {
    textAlign: 'center',
    padding: '36px 16px',
    fontSize: 12,
    color: '#71717a',
    backgroundColor: '#0d0d10',
    borderRadius: 8,
    border: '1px dashed rgba(255, 255, 255, 0.06)',
    lineHeight: 1.6,
  },
  lightboxOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    backdropFilter: 'blur(5px)',
  },
  lightboxContent: {
    backgroundColor: '#121216',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    maxWidth: '90vw',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
  },
  lightboxHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  lightboxImg: {
    maxWidth: '85vw',
    maxHeight: '75vh',
    objectFit: 'contain',
    display: 'block',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#71717a',
    cursor: 'pointer',
    padding: 3,
  },
};

export default TasksTab;
