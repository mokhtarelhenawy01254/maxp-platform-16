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
} from 'lucide-react';

export type TabId = 'cockpit' | 'tasks' | 'apps' | 'attendance' | 'system';

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
  const navItems: { id: TabId; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'cockpit',
      label: 'النشاط المباشر',
      desc: 'المراقبة والعدادات الحية',
      icon: <Activity size={18} />,
    },
    {
      id: 'tasks',
      label: 'المهام والإنتاجية',
      desc: 'قائمة مهام العمل الحالية',
      icon: <CheckSquare size={18} />,
    },
    {
      id: 'apps',
      label: 'التطبيقات والمواقع',
      desc: 'سجل البرامج والمواقع اليوم',
      icon: <Globe size={18} />,
    },
    {
      id: 'attendance',
      label: 'مطابقة الحضور',
      desc: 'تدقيق البصمة مع أول نشاط',
      icon: <Clock size={18} />,
    },
    {
      id: 'system',
      label: 'حالة الجهاز والسحابة',
      desc: 'الاتصال والذاكرة المحلية',
      icon: <Cpu size={18} />,
    },
  ];

  const displayName = user?.firstName || user?.name || user?.email?.split('@')[0] || 'الموظف';
  const roleLabel = user?.role === 'COMPANY_ADMIN' ? 'مدير المنظومة' : 'موظف';

  return (
    <aside style={styles.sidebar}>
      {/* Brand Header */}
      <div style={styles.brandBox}>
        <div style={styles.brandIconWrapper}>
          <ShieldCheck size={20} color="#22c55e" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={styles.brandTitle}>MaxP Monitor</div>
          <div style={styles.enforcedBadge}>
            <Lock size={10} color="#22c55e" />
            <span>تتبع تلقائي إلزامي</span>
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
              background: isOnline ? '#22c55e' : '#ef4444',
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
                background: isActive ? '#1c1c20' : 'transparent',
                borderColor: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: isActive ? '#fafafa' : '#a1a1aa',
              }}
              onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = '#141417';
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <span style={{
                ...styles.iconContainer,
                color: isActive ? '#22c55e' : '#71717a',
              }}>
                {item.icon}
              </span>
              <div style={styles.navTextCol}>
                <span style={styles.navLabel}>{item.label}</span>
                <span style={styles.navDesc}>{item.desc}</span>
              </div>
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
          <Settings size={15} color="#a1a1aa" />
          <span>الإعدادات</span>
        </button>

        <button
          onClick={onLogout}
          style={{ ...styles.actionBtn, color: '#f87171' }}
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
    background: '#0d0d10',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    userSelect: 'none',
  },
  brandBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '16px 14px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  brandIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#fafafa',
    letterSpacing: '-0.01em',
  },
  enforcedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: '#22c55e',
    fontWeight: 600,
    marginTop: 2,
  },
  userBox: {
    margin: '12px 12px 6px 12px',
    padding: '10px',
    borderRadius: 8,
    background: '#121216',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 6,
    background: 'linear-gradient(135deg, #27272a, #3f3f46)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    color: '#fafafa',
  },
  userName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e4e4e7',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRole: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
  },
  nav: {
    flex: 1,
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
    padding: '9px 10px',
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
  navTextCol: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    flex: 1,
  },
  navLabel: {
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.2,
  },
  navDesc: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  footer: {
    padding: '10px 12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    background: '#141417',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    padding: '7px 10px',
    fontSize: 12,
    fontWeight: 500,
    color: '#d4d4d8',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
};

export default Sidebar;
