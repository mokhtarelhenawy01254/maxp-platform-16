import { Construction } from "lucide-react";

export default function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-10 text-center">
      <Construction className="w-10 h-10 mx-auto mb-3 text-gray-400" />
      <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">{title}</p>
      <p className="text-sm text-gray-500 mt-1">سيتم تفعيله في المرحلة القادمة</p>
    </div>
  );
}
