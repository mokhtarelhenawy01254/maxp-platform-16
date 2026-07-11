import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface PreparationPageHeaderProps {
  refreshing: boolean;
  onRefresh: () => void;
}

const PreparationPageHeader = ({
  refreshing,
  onRefresh,
}: PreparationPageHeaderProps) => {
  return (
    <section className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-5 py-3 shadow-sm">
      <div>
        <p className="text-xs text-gray-400">تجهيز الطلبات</p>
      </div>

      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300 disabled:opacity-60"
      >
        <ArrowPathIcon className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        تحديث
      </button>
    </section>
  );
};

export default PreparationPageHeader;
