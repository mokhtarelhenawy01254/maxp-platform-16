import React from 'react';
import {
  Activity,
  CheckSquare,
  Globe,
  Clock,
  Cpu,
  Settings,
  LogOut,
  ShieldCheck,
  Lock,
  Moon,
  Sun,
  Target,
  FileText,
} from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

export type TabId = 'tasks' | 'goals' | 'reports' | 'cockpit' | 'apps' | 'attendance' | 'system';

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  user: any;
  onOpenSettings: () => void;
  onLogout: () => void;
  isOnline?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  user,
  onOpenSettings,
  onLogout,
  isOnline = true,
}) => {
  const { mode, toggleTheme } = useTheme();
  const roleStr = String(user?.role || '').toUpperCase();
  const isAdmin = ['COMPANY_ADMIN', 'SUPER_ADMIN', 'OWNER'].includes(roleStr);
  const isManager = isAdmin || ['MANAGER', 'HR_MANAGER'].includes(roleStr);

  const navItems: { id: TabId; label: string; icon: React.ReactNode; badge?: number }[] = isManager
    ? [
        {
          id: 'tasks',
          label: 'المهام والإنتاجية',
          icon: <CheckSquare size={17} />,
        },
        {
          id: 'goals',
          label: 'الأهداف ومؤشرات الأداء',
          icon: <Target size={17} />,
        },
        {
          id: 'reports',
          label: 'التقرير والملخص',
          icon: <FileText size={17} />,
        },
        {
          id: 'cockpit',
          label: 'سجل النشاط وساعات العمل',
          icon: <Activity size={17} />,
        },
        {
          id: 'apps',
          label: 'البرامج والمواقع',
          icon: <Globe size={17} />,
        },
        {
          id: 'attendance',
          label: 'مطابقة الحضور والتدقيق',
          icon: <Clock size={17} />,
        },
        {
          id: 'system',
          label: 'حالة السحابة والجهاز',
          icon: <Cpu size={17} />,
        },
      ]
    : [
        {
          id: 'tasks',
          label: 'المهام والإنتاجية',
          icon: <CheckSquare size={17} />,
        },
        {
          id: 'goals',
          label: 'الأهداف ومؤشرات الأداء',
          icon: <Target size={17} />,
        },
        {
          id: 'reports',
          label: 'التقرير اليومي',
          icon: <FileText size={17} />,
        },
        {
          id: 'cockpit',
          label: 'النشاط وساعات العمل',
          icon: <Activity size={17} />,
        },
        {
          id: 'apps',
          label: 'البرامج والمواقع',
          icon: <Globe size={17} />,
        },
      ];

  const displayName = user?.firstName || user?.name || user?.email?.split('@')[0] || 'الموظف';
  const roleLabel = isAdmin ? 'مدير المنظومة' : 'عضو فريق العمل';

  return (
    <aside style={styles.sidebar}>
      {/* Brand Header */}
      <div style={styles.brandBox}>
        <div style={styles.brandIconWrapper}>
          <ShieldCheck size={19} color="var(--accent-green)" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={styles.brandTitle}>MaxP Workspace</div>
          <div style={styles.enforcedBadge}>
            <span style={styles.pulsingDotMini} />
            <span>توثيق النشاط متصل</span>
          </div>
        </div>
      </div>

      {/* User Profile Box */}
      <div style={styles.userBox}>
        <div style={styles.userAvatar}>
          {displayName.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={styles.userName} title={displayName}>{displayName}</div>
          <div style={styles.userRole}>
            <span style={{
              ...styles.statusDot,
              background: isOnline ? 'var(--accent-green)' : 'var(--accent-red)',
            }} />
            <span>{roleLabel}</span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={styles.nav}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                ...styles.navItem,
                background: isActive ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                borderRight: isActive ? '2.5px solid var(--accent-green)' : '2.5px solid transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <span style={{
                ...styles.iconContainer,
                color: isActive ? 'var(--accent-green)' : 'var(--text-dim)',
              }}>
                {item.icon}
              </span>
              <span style={{
                ...styles.navLabel,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
              }}>{item.label}</span>

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  style={{
                    marginRight: 'auto',
                    backgroundColor: 'var(--accent-green)',
                    color: '#062015',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 10,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / System Controls */}
      <div style={styles.footer}>
        <button
          onClick={onOpenSettings}
          style={styles.actionBtn}
          title="إعدادات التطبيق"
          onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
          onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        >
          <Settings size={15} color="var(--text-muted)" />
          <span>الإعدادات</span>
        </button>

        <button
          onClick={toggleTheme}
          style={styles.actionBtn}
          title={mode === 'dark' ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن'}
          onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
          onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          aria-label="تبديل المظهر"
        >
          {mode === 'dark' ? <Sun size={15} color="var(--accent-yellow)" /> : <Moon size={15} color="#6366f1" />}
        </button>

        <button
          onClick={onLogout}
          style={{ ...styles.actionBtn, color: 'var(--accent-red-dim)' }}
          title="تسجيل الخروج"
          onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
          onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        >
          <LogOut size={15} color="#f87171" />
          <span>خروج</span>
        </button>
      </div>
    </aside>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 240,
    minWidth: 240,
    height: '100%',
    background: 'var(--bg-sidebar)',
    borderLeft: '1px solid var(--border-default)',
    display: 'flex',
    flexDirection: 'column',
    userSelect: 'none',
  },
  brandBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '16px 14px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  brandIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  enforcedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: 'var(--accent-green)',
    fontWeight: 600,
    marginTop: 2,
  },
  pulsingDotMini: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--accent-green)',
    boxShadow: '0 0 6px var(--accent-green-dim)',
  },
  userBox: {
    margin: '12px 12px 6px 12px',
    padding: '10px',
    borderRadius: 8,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 6,
    background: 'var(--avatar-gradient)',
    border: '1px solid var(--border-strong)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  userName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRole: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    color: 'var(--text-dim)',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
  },
  nav: {
    flex: 1,
    minHeight: 0,
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid transparent',
    cursor: 'pointer',
    textAlign: 'right',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 13,
    lineHeight: 1.2,
  },
  footer: {
    padding: '10px 12px',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex',
    gap: 8,
    flexShrink: 0,
  },
  actionBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    padding: '7px 10px',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
};

export default Sidebar;
