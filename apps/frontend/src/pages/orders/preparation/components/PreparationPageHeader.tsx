import {
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { FETCH_LIMIT } from "../constants";

interface PreparationPageHeaderProps {
  refreshing: boolean;
  onRefresh: () => void;
}

const PreparationPageHeader = ({
  refreshing,
  onRefresh,
}: PreparationPageHeaderProps) => {
  return (
    <section className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
          <CubeIcon className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-900">
            غرفة تجهيز الطلبات
          </h1>
          <p className="text-xs text-gray-400">
            آخر {FETCH_LIMIT} طلب في مسار التجهيز
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300 disabled:opacity-60"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          تحديث
        </button>
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-800"
        >
          <ClipboardDocumentListIcon className="h-3.5 w-3.5" />
          الطلبات
        </Link>
      </div>
    </section>
  );
};

export default PreparationPageHeader;
