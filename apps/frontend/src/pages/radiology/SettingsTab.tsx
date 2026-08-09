import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">الإعدادات</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">إعدادات نظام الأشعة</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
        <SettingsIcon className="w-10 h-10 mx-auto mb-3" />
        سيتم إضافة إعدادات نظام الأشعة في المراحل القادمة.
      </div>
    </div>
  );
}
