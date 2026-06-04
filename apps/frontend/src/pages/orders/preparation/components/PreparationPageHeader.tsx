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
    <section className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-6 shadow-sm">
      <div className="absolute -left-16 top-0 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl" />
      <div className="absolute -right-16 bottom-0 h-44 w-44 rounded-full bg-emerald-200/30 blur-3xl" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-xs font-semibold text-amber-700">
            <CubeIcon className="h-4 w-4" />
            Fulfillment / تجهيز الطلبات
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            غرفة تشغيل تجهيز الأوردرات
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            شاشة موحدة للمخزن تجمع الطلبات المؤكدة، حالة التجهيز، جاهزية
            المخزون، والتحويل السريع إلى مرحلة الشحن.
          </p>
          <p className="mt-3 text-xs text-gray-500">
            يتم عرض آخر {FETCH_LIMIT} طلب ضمن رحلة التجهيز لتسهيل المتابعة
            اليومية بدون الحاجة للتنقل بين أكثر من صفحة.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-300 disabled:opacity-60"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            تحديث
          </button>
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
          >
            <ClipboardDocumentListIcon className="h-4 w-4" />
            صفحة الطلبات
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PreparationPageHeader;
