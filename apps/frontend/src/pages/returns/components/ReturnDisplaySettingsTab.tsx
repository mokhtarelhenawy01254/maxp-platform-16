import React from 'react';
import { useTranslation } from 'react-i18next';
import { Settings2, Eye, EyeOff, Package, Calendar, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ReviewDisplayConfig } from '../../../services/returnService';

interface ReturnDisplaySettingsTabProps {
  settingsLoading: boolean;
  displayConfig: ReviewDisplayConfig;
  setDisplayConfig: React.Dispatch<React.SetStateAction<ReviewDisplayConfig>>;
  toggleDisplayField: (key: keyof ReviewDisplayConfig) => void;
  DISPLAY_FIELDS: {
    key: keyof ReviewDisplayConfig;
    label: string;
    description: string;
    section: 'columns' | 'controls';
  }[];
  ORDER_STATUS_FIELDS: {
    code: string;
    label: string;
  }[];
  isOrderStatusVisible: (code: string) => boolean;
  toggleOrderStatusField: (code: string) => void;
  handleSaveDisplayConfig: () => Promise<void>;
  saving: boolean;
}

export const ReturnDisplaySettingsTab: React.FC<ReturnDisplaySettingsTabProps> = ({
  settingsLoading,
  displayConfig,
  setDisplayConfig,
  toggleDisplayField,
  DISPLAY_FIELDS,
  ORDER_STATUS_FIELDS,
  isOrderStatusVisible,
  toggleOrderStatusField,
  handleSaveDisplayConfig,
  saving,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Columns Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
            <Settings2 size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              {t('returns.k_164')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('returns.k_165')}
            </p>
          </div>
        </div>

        {settingsLoading ? (
          <div className="text-center py-8 text-gray-400">
            {t('returns.k_144')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DISPLAY_FIELDS.filter((f) => f.section === 'columns').map((field) => (
              <div
                key={field.key}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      displayConfig[field.key]
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {displayConfig[field.key] ? (
                      <Eye size={18} />
                    ) : (
                      <EyeOff size={18} />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-white">
                      {field.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {field.description}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={displayConfig[field.key]}
                  onCheckedChange={() => toggleDisplayField(field.key)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
            <Settings2 size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              {t('returns.k_166')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('returns.k_167')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DISPLAY_FIELDS.filter((f) => f.section === 'controls').map((field) => (
            <div
              key={field.key}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    displayConfig[field.key]
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {displayConfig[field.key] ? (
                    <Eye size={18} />
                  ) : (
                    <EyeOff size={18} />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-white">
                    {field.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {field.description}
                  </div>
                </div>
              </div>
              <Switch
                checked={displayConfig[field.key]}
                onCheckedChange={() => toggleDisplayField(field.key)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Filter Statuses Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400">
            <Package size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800 dark:text-white">
              {t('returns.k_170')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('returns.k_171')}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ORDER_STATUS_FIELDS.map((field) => (
            <div
              key={field.code}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    isOrderStatusVisible(field.code)
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {isOrderStatusVisible(field.code) ? (
                    <Eye size={18} />
                  ) : (
                    <EyeOff size={18} />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-white">
                    {field.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {field.code}
                  </div>
                </div>
              </div>
              <Switch
                checked={isOrderStatusVisible(field.code)}
                onCheckedChange={() => toggleOrderStatusField(field.code)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Start Date Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
            <Calendar size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              تاريخ بدء ظهور الطلبات والمرتجعات
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              تحديد تاريخ بداية الشغل على النظام بحيث تظهر فقط الطلبات والمرتجعات المنشأة من هذا التاريخ وما بعده
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 max-w-md">
          <input
            type="date"
            value={displayConfig.ordersStartDate ? displayConfig.ordersStartDate.split('T')[0] : ''}
            onChange={(e) =>
              setDisplayConfig((prev) => ({
                ...prev,
                ordersStartDate: e.target.value || undefined,
              }))
            }
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums font-mono"
          />
          {displayConfig.ordersStartDate && (
            <button
              type="button"
              onClick={() =>
                setDisplayConfig((prev) => ({
                  ...prev,
                  ordersStartDate: undefined,
                }))
              }
              className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 underline font-medium"
            >
              إلغاء تاريخ البدء (عرض جميع البيانات القديمة)
            </button>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveDisplayConfig}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium shadow-xs"
        >
          <Save size={18} />
          {saving ? t('returns.k_105') : t('returns.k_106')}
        </button>
      </div>
    </div>
  );
};
