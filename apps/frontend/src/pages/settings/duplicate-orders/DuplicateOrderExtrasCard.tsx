import React from 'react';
import { BarChart3, Bell, Globe } from 'lucide-react';
import type { DuplicateOrderSettingsData } from './types';

interface DuplicateOrderExtrasCardProps {
  settings: DuplicateOrderSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<DuplicateOrderSettingsData>>;
}

export const DuplicateOrderExtrasCard: React.FC<DuplicateOrderExtrasCardProps> = ({
  settings,
  setSettings,
}) => {
  const notifyTeam = settings.notifyTeam ?? settings.alertTeam ?? true;
  const compareStorefrontOrders =
    settings.compareStorefrontOrders ?? settings.includeStoreOrders ?? true;
  const reportAs =
    settings.reportAs || (settings.reportTreatment === 'cancelled' ? 'cancelled' : 'duplicate');

  return (
    <div className="bg-card border border-border/60 rounded-xl p-4 shadow-xs space-y-3">
      <label className="block text-xs font-semibold text-foreground">
        خيارات الإشعارات والتقارير
      </label>
      <div className="space-y-3">
        {/* Notify Team Toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" />
            <span className="text-xs text-foreground font-medium">تنبيه الفريق عند رصد مكرر</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={notifyTeam}
            onClick={() =>
              setSettings((s) => {
                const nextVal = !(s.notifyTeam ?? s.alertTeam ?? true);
                return { ...s, notifyTeam: nextVal, alertTeam: nextVal };
              })
            }
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              notifyTeam ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block size-3.5 transform rounded-full bg-white transition-transform ${
                notifyTeam ? '-translate-x-4.5' : '-translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Compare Storefront Orders Toggle */}
        <div className="flex items-center justify-between py-1 border-t border-border/40 pt-2">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" />
            <span className="text-xs text-foreground font-medium">
              المقارنة تشمل طلبات المتجر (الزائر)
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={compareStorefrontOrders}
            onClick={() =>
              setSettings((s) => {
                const nextVal = !(s.compareStorefrontOrders ?? s.includeStoreOrders ?? true);
                return {
                  ...s,
                  compareStorefrontOrders: nextVal,
                  includeStoreOrders: nextVal,
                };
              })
            }
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              compareStorefrontOrders ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block size-3.5 transform rounded-full bg-white transition-transform ${
                compareStorefrontOrders ? '-translate-x-4.5' : '-translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Reporting Treatment */}
        <div className="border-t border-border/40 pt-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" />
            <span className="text-xs text-foreground font-medium">المعاملة في التقارير</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  reportAs: 'duplicate',
                  reportTreatment: 'separate',
                }))
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                reportAs === 'duplicate'
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40'
              }`}
            >
              بند منفصل «مكرر»
            </button>
            <button
              type="button"
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  reportAs: 'cancelled',
                  reportTreatment: 'cancelled',
                }))
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                reportAs === 'cancelled'
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40'
              }`}
            >
              يتحسب ملغي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
