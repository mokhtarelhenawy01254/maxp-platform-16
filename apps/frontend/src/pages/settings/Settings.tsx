import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings as SettingsIcon } from 'lucide-react';

import CustomDomainPage from './CustomDomainPage';
import SidebarSettings from './SidebarSettings';
import AuthorizedDevicesTab from './AuthorizedDevicesTab';
import OvertimeManagementTab from './OvertimeManagementTab';
import DeveloperHubPage from './developer/DeveloperHubPage';
import {
  ProfileSettings,
  SecuritySettings,
  StoreSettingsRedirect,
  type SettingsTab,
} from './settings-hub';

const DEFAULT_TAB = 'profile';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const { t, i18n } = useTranslation();

  const tabs: SettingsTab[] = [
    { id: 'profile', name: t('settings.tabProfile', 'الملف الشخصي'), component: ProfileSettings },
    { id: 'custom-domain', name: t('settings.tabCustomDomain', 'النطاق المخصص'), component: CustomDomainPage },
    { id: 'store', name: t('settings.tabStore', 'إعدادات المتجر'), component: StoreSettingsRedirect },
    { id: 'security', name: t('settings.tabSecurity', 'الأمان'), component: SecuritySettings },
    { id: 'devices', name: 'الأجهزة المعتمدة', component: AuthorizedDevicesTab },
    { id: 'overtime', name: 'الورديات الإضافية', component: OvertimeManagementTab },
    { id: 'sidebar', name: t('settings.tabSidebar', 'القائمة الجانبية'), component: SidebarSettings },
    { id: 'developer', name: i18n.language === 'en' ? 'Developer' : 'المطورون', component: DeveloperHubPage },
  ];

  const validTabIds = tabs.map((item) => item.id);

  useEffect(() => {
    if (tab === 'billing') {
      navigate('/marketplace', { replace: true });
      return;
    }

    if (tab && !validTabIds.includes(tab)) {
      navigate(`/settings/${DEFAULT_TAB}`, { replace: true });
    }
  }, [navigate, tab, validTabIds]);

  const activeTab = tab && validTabIds.includes(tab) ? tab : DEFAULT_TAB;
  const activeTabConfig = tabs.find((item) => item.id === activeTab) ?? tabs[0]!;
  const ActiveComponent = activeTabConfig.component;

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center text-3xl font-bold text-foreground">
            <SettingsIcon className="mr-3 h-8 w-8 text-primary" />
            {t('settings.title', 'الإعدادات')}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t('settings.pageDescription', 'إدارة تفضيلات الحساب والمتجر والأمان')}
          </p>
        </div>
      </div>

      {/* MOB-015: Single-depth rule: no box-in-box under 768px */}
      <div className="md:rounded-3xl md:border md:border-border md:bg-card">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default Settings;
