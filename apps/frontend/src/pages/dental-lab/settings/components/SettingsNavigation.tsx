import { useTranslation } from "react-i18next";
import {
  type SettingsSectionId,
  SETTINGS_SECTIONS,
} from "../types/settingsTypes";

interface SettingsNavigationProps {
  activeSection: SettingsSectionId;
  onSelectSection: (id: SettingsSectionId) => void;
  dirtyMap: Record<string, boolean>;
  loading: boolean;
}

export function SettingsNavigation({
  activeSection,
  onSelectSection,
  dirtyMap,
  loading,
}: SettingsNavigationProps) {
  const { t } = useTranslation();

  return (
    <aside className="min-w-0">
      <nav className="flex flex-wrap lg:flex-col gap-1 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-2">
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon;
          const sectionDirty = !loading && (dirtyMap[section.id] ?? false);
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelectSection(section.id)}
              aria-current={activeSection === section.id ? "page" : undefined}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{t(section.labelKey)}</span>
              {sectionDirty && (
                <span
                  className={`ms-auto w-1.5 h-1.5 shrink-0 rounded-full ${
                    activeSection === section.id ? "bg-white" : "bg-amber-500"
                  }`}
                  title={t("dentalLab.settings.unsavedChanges")}
                />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default SettingsNavigation;
