interface PreparationStatsProps {
  searchedOrdersCount: number;
  readyCount: number;
  shortageCount: number;
  readyToShipCount: number;
  shortageHoldCount: number;
  overdueShortageFollowUpCount: number;
}

const PreparationStats = ({
  searchedOrdersCount,
  readyCount,
  shortageCount,
  readyToShipCount,
  shortageHoldCount,
  overdueShortageFollowUpCount,
}: PreparationStatsProps) => {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">طلبات في مسار التجهيز</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">
          {searchedOrdersCount}
        </p>
        <p className="mt-2 text-xs text-gray-500">بعد تطبيق الفلاتر الحالية</p>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <p className="text-sm text-emerald-700">جاهزة بالكامل</p>
        <p className="mt-2 text-3xl font-bold text-emerald-900">{readyCount}</p>
        <p className="mt-2 text-xs text-emerald-700">كل المنتجات متاحة للتجهيز</p>
      </div>

      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
        <p className="text-sm text-rose-700">طلبات بها نواقص</p>
        <p className="mt-2 text-3xl font-bold text-rose-900">{shortageCount}</p>
        <p className="mt-2 text-xs text-rose-700">تحتاج تحويل أو مراجعة مخزون</p>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
        <p className="text-sm text-sky-700">جاهزة للشحن</p>
        <p className="mt-2 text-3xl font-bold text-sky-900">
          {readyToShipCount}
        </p>
        <p className="mt-2 text-xs text-sky-700">يمكن تسليمها لشركة الشحن الآن</p>
      </div>

      <div className="rounded-2xl border border-rose-300 bg-rose-50 p-5 shadow-sm">
        <p className="text-sm text-rose-700">مؤجلة بسبب العجز</p>
        <p className="mt-2 text-3xl font-bold text-rose-900">
          {shortageHoldCount}
        </p>
        <p className="mt-2 text-xs text-rose-700">
          طلبات خرجت من التشغيل اليومي لحين توفر المخزون
        </p>
      </div>

      <div className="rounded-2xl border border-orange-300 bg-orange-50 p-5 shadow-sm">
        <p className="text-sm text-orange-700">متابعات متأخرة</p>
        <p className="mt-2 text-3xl font-bold text-orange-900">
          {overdueShortageFollowUpCount}
        </p>
        <p className="mt-2 text-xs text-orange-700">
          طلبات مؤجلة تجاوزت تاريخ المتابعة المحدد
        </p>
      </div>
    </section>
  );
};

export default PreparationStats;
