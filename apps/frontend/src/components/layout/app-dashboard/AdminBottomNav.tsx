import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  LayoutGrid,
  MessageSquare,
  Bell,
  User,
} from 'lucide-react';

interface AdminBottomNavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  matchPaths?: string[];
  badge?: number;
}

interface AdminBottomNavProps {
  /** Show notification badge (e.g. unread count from /notifications). */
  notificationCount?: number;
  /** Custom labels to override i18n defaults. */
  labels?: Partial<Record<'home' | 'apps' | 'whatsapp' | 'notifications' | 'account', string>>;
}

const buildItems = (
  labels: AdminBottomNavProps['labels'],
  notificationCount: number | undefined,
): AdminBottomNavItem[] => [
  {
    key: 'home',
    label: labels?.home ?? 'الرئيسية',
    href: '/apps/main',
    icon: Home,
    matchPaths: ['/apps/main'],
  },
  {
    key: 'apps',
    label: labels?.apps ?? 'التطبيقات',
    href: '/apps',
    icon: LayoutGrid,
    matchPaths: ['/apps'],
  },
  {
    key: 'whatsapp',
    label: labels?.whatsapp ?? 'الواتساب',
    href: '/apps/whatsapp',
    icon: MessageSquare,
    matchPaths: ['/apps/whatsapp', '/apps/messaging-automation'],
  },
  {
    key: 'notifications',
    label: labels?.notifications ?? 'الإشعارات',
    href: '/apps/notifications',
    icon: Bell,
    matchPaths: ['/apps/notifications'],
    badge: notificationCount && notificationCount > 0 ? notificationCount : undefined,
  },
  {
    key: 'account',
    label: labels?.account ?? 'حسابي',
    href: '/apps/my-account',
    icon: User,
    matchPaths: ['/apps/my-account', '/apps/company', '/apps/settings'],
  },
];

const isActive = (item: AdminBottomNavItem, pathname: string): boolean => {
  if (item.matchPaths) {
    return item.matchPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }
  return pathname === item.href;
};

const AdminBottomNav: React.FC<AdminBottomNavProps> = ({ notificationCount, labels }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith('ar') ?? false;
  const location = useLocation();
  const items = React.useMemo(() => buildItems(labels, notificationCount), [labels, notificationCount]);

  return (
    <nav
      aria-label="التنقل السفلي للتاجر"
      className="admin-bottom-nav lg:hidden border-t border-border/70 bg-card/95 backdrop-blur-md"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <ul className="admin-bottom-nav-list" role="list">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item, location.pathname);
          return (
            <li key={item.key} className="admin-bottom-nav-item">
              <NavLink
                to={item.href}
                end={item.href === '/apps'}
                className={({ isActive: navActive }) =>
                  `admin-bottom-nav-link${navActive || active ? ' admin-bottom-nav-link--active' : ''}`
                }
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <span className="admin-bottom-nav-icon-wrap">
                  <Icon className="admin-bottom-nav-icon" aria-hidden="true" />
                  {item.badge ? (
                    <span className="admin-bottom-nav-badge font-mono tabular-nums" aria-label={`${item.badge} جديد`}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </span>
                <span className="admin-bottom-nav-label">{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default AdminBottomNav;
