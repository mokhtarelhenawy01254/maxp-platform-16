import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  DuplicateOrderActionCard,
  DuplicateOrderCriteriaCard,
  DuplicateOrderExtrasCard,
  DuplicateOrderHeader,
  DuplicateOrderSaveBar,
  DuplicateOrderStatusesCard,
  DuplicateOrderTimeWindowCard,
  DuplicateOrderWhitelistCard,
  useDuplicateOrderSettingsController,
  type DuplicateOrderSettingsData,
} from './duplicate-orders';

export type { DuplicateOrderSettingsData };

const DuplicateOrderSettings: React.FC = () => {
  const {
    settings,
    setSettings,
    exemptPhonesText,
    setExemptPhonesText,
    loading,
    saving,
    fetchSettings,
    handleStatusToggle,
    handleSave,
  } = useDuplicateOrderSettingsController();

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* 1. Header & Master Switch */}
      <DuplicateOrderHeader settings={settings} setSettings={setSettings} />

      <div
        className={`space-y-5 transition-opacity ${
          settings.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'
        }`}
      >
        {/* 2. Criteria & Active Statuses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DuplicateOrderCriteriaCard settings={settings} setSettings={setSettings} />
          <DuplicateOrderStatusesCard
            settings={settings}
            onStatusToggle={handleStatusToggle}
          />
        </div>

        {/* 3. Time Window & Action */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DuplicateOrderTimeWindowCard settings={settings} setSettings={setSettings} />
          <DuplicateOrderActionCard settings={settings} setSettings={setSettings} />
        </div>

        {/* 4. Additional Controls & Whitelist */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DuplicateOrderExtrasCard settings={settings} setSettings={setSettings} />
          <DuplicateOrderWhitelistCard
            settings={settings}
            setSettings={setSettings}
            exemptPhonesText={exemptPhonesText}
            setExemptPhonesText={setExemptPhonesText}
          />
        </div>
      </div>

      {/* 5. Save & Reset Action Bar */}
      <DuplicateOrderSaveBar
        saving={saving}
        onSave={handleSave}
        onReload={fetchSettings}
      />
    </div>
  );
};

export default DuplicateOrderSettings;
