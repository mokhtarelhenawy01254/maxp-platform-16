import React, { useCallback, useEffect, useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import i18n from "../../i18n";
import {
  platformDefaultSidebarService,
  type DefaultSidebarSettings,
} from "../../services/platformDefaultSidebarService";

type SidebarLayout =
  | "classic"
  | "three-tier"
  | "horizontal"
  | "floating"
  | "minimal"
  | "app-dashboard";

type SidebarLayoutOption = {
  id: SidebarLayout;
  nameKey: string;
  descriptionKey: string;
};

const SIDEBAR_LAYOUT_OPTIONS: SidebarLayoutOption[] = [
  {
    id: "classic",
    nameKey: "appDashboard.layoutOptions.classic.name",
    descriptionKey: "appDashboard.layoutOptions.classic.description",
  },
  {
    id: "three-tier",
    nameKey: "appDashboard.layoutOptions.threeTier.name",
    descriptionKey: "appDashboard.layoutOptions.threeTier.description",
  },
  {
    id: "horizontal",
    nameKey: "appDashboard.layoutOptions.horizontal.name",
    descriptionKey: "appDashboard.layoutOptions.horizontal.description",
  },
  {
    id: "floating",
    nameKey: "appDashboard.layoutOptions.floating.name",
    descriptionKey: "appDashboard.layoutOptions.floating.description",
  },
  {
    id: "minimal",
    nameKey: "appDashboard.layoutOptions.minimal.name",
    descriptionKey: "appDashboard.layoutOptions.minimal.description",
  },
  {
    id: "app-dashboard",
    nameKey: "appDashboard.layoutOptions.appDashboard.name",
    descriptionKey: "appDashboard.layoutOptions.appDashboard.description",
  },
];

const normalizeSidebarLayout = (value: unknown): SidebarLayout =>
  SIDEBAR_LAYOUT_OPTIONS.some((option) => option.id === value)
    ? (value as SidebarLayout)
    : "three-tier";

const SuperAdminDefaultSidebar: React.FC = () => {
  const [layout, setLayout] = useState<SidebarLayout>("three-tier");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await platformDefaultSidebarService.getSettings();
      setLayout(normalizeSidebarLayout(data.layout));
    } catch (error) {
      console.error("Failed to load default sidebar settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleLayoutChange = async (newLayout: SidebarLayout) => {
    try {
      setSaving(true);
      await platformDefaultSidebarService.updateSettings({ layout: newLayout });
      setLayout(newLayout);
    } catch (error) {
      console.error("Error updating layout:", error);
      alert(i18n.t("companySettings.error_error_d9e4"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
          <span className="mr-3 text-sm text-gray-500">{i18n.t("superAdminDefaultSidebar.loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <span className="text-indigo-600 dark:text-indigo-400 mr-2">⚙</span>
        نظام القائمة الجانبية
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        القيمة الافتراضية للقائمة الجانبية التي تُطبَّق على الشركات الجديدة عند التسجيل
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SIDEBAR_LAYOUT_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => handleLayoutChange(option.id)}
            disabled={saving}
            className={`relative p-4 rounded-xl border-2 text-right transition-[background-color,border-color,color,box-shadow] duration-200 ${
              layout === option.id
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <h3
              className={`font-semibold ${layout === option.id ? "text-indigo-700 dark:text-indigo-300" : "text-gray-900 dark:text-white"}`}
            >
              {i18n.t(option.nameKey)}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {i18n.t(option.descriptionKey)}
            </p>
            {layout === option.id && (
              <div className="absolute top-4 left-4 h-5 w-5 bg-indigo-500 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="h-3 w-3 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuperAdminDefaultSidebar;
