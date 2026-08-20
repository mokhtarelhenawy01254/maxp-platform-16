import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useDateFormat } from "../../hooks/useDateFormat";
import stockMovementsService, { StockMovementRecord } from "../../services/stockMovementsService";

const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  IN: { ar: "┘ê╪º╪▒╪»", en: "IN" },
  OUT: { ar: "╪╡╪º╪»╪▒", en: "OUT" },
  ADJUSTMENT: { ar: "╪¬╪╣╪»┘è┘ä", en: "ADJUSTMENT" },
  TRANSFER: { ar: "╪¬╪¡┘ê┘è┘ä", en: "TRANSFER" },
  RETURN: { ar: "┘à╪▒╪¬╪¼╪╣", en: "RETURN" }
};

const TYPE_COLORS: Record<string, string> = {
  IN: "bg-green-100 text-green-700 dark:bg-green-900/25 dark:text-green-300",
  OUT: "bg-red-100 text-red-700 dark:bg-red-900/25 dark:text-red-300",
  ADJUSTMENT: "bg-amber-100 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300",
  TRANSFER: "bg-blue-100 text-blue-700 dark:bg-blue-900/25 dark:text-blue-300",
  RETURN: "bg-purple-100 text-purple-700 dark:bg-purple-900/25 dark:text-purple-300"
};

const StockMovementsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { formatDate } = useDateFormat();
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadMovements = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (typeFilter) params['type'] = typeFilter;
      if (search) params['search'] = search;
      if (dateFrom) params['startDate'] = dateFrom;
      if (dateTo) params['endDate'] = dateTo;
      const res = await stockMovementsService.getMovements(params);
      setMovements(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      toast.error(error?.message || t("stockMovements.loadFailed", "╪¬╪╣╪░╪▒ ╪¬╪¡┘à┘è┘ä ╪º┘ä╪¡╪▒┘â╪º╪¬"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [typeFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadMovements();
    }, 400);
    return () => clearTimeout(timeout);
  }, [search, dateFrom, dateTo]);

  const isArabic = i18n.language?.startsWith("ar");

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("stockMovements.title", "╪¡╪▒┘â╪º╪¬ ╪º┘ä┘à╪«╪▓┘ê┘å")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("stockMovements.description", "╪│╪¼┘ä ┘â┘ä ╪¡╪▒┘â╪º╪¬ ╪º┘ä┘à┘å╪¬╪¼╪º╪¬ ╪»╪º╪«┘ä ┘ê╪«╪º╪▒╪¼ ╪º┘ä┘à╪«╪▓┘ê┘å")}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={String(t("stockMovements.search", "╪º╪¿╪¡╪½ ╪¿╪º┘ä┘à┘å╪¬╪¼ ╪ú┘ê SKU ╪ú┘ê ╪º┘ä┘à╪▒╪¼╪╣..."))}
              className="min-h-[42px] w-full rounded-xl border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm dark:border-gray-600 dark:bg-gray-900"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
            >
              <option value="">{t("stockMovements.allTypes", "┘â┘ä ╪ú┘å┘ê╪º╪╣ ╪º┘ä╪¡╪▒┘â╪º╪¬")}</option>
              {Object.entries(TYPE_LABELS).map(([value, labels]) => (
                <option key={value} value={value}>
                  {isArabic ? labels.ar : labels.en}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">{t("stockMovements.loading", "╪¼╪º╪▒┘è ╪º┘ä╪¬╪¡┘à┘è┘ä...")}</div>
        ) : movements.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">{t("stockMovements.empty", "┘ä╪º ╪¬┘ê╪¼╪» ╪¡╪▒┘â╪º╪¬ ┘à╪«╪▓┘ê┘å")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-right text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="py-3 pl-4">{t("stockMovements.date", "╪º┘ä╪¬╪º╪▒┘è╪«")}</th>
                  <th className="py-3">{t("stockMovements.product", "╪º┘ä┘à┘å╪¬╪¼")}</th>
                  <th className="py-3">{t("stockMovements.type", "┘å┘ê╪╣ ╪º┘ä╪¡╪▒┘â╪⌐")}</th>
                  <th className="py-3">{t("stockMovements.reason", "╪º┘ä╪│╪¿╪¿")}</th>
                  <th className="py-3">{t("stockMovements.quantity", "╪º┘ä┘â┘à┘è╪⌐")}</th>
                  <th className="py-3">{t("stockMovements.reference", "╪º┘ä┘à╪▒╪¼╪╣")}</th>
                  <th className="py-3 pr-4">{t("stockMovements.notes", "┘à┘ä╪º╪¡╪╕╪º╪¬")}</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => {
                  const labels = TYPE_LABELS[movement.type] || { ar: movement.type, en: movement.type };
                  const qty = movement.type === "OUT" ? -Math.abs(movement.quantity) : Math.abs(movement.quantity);
                  return (
                    <tr key={movement.id} className="border-b border-gray-50 text-gray-700 dark:border-gray-800 dark:text-gray-200">
                      <td className="py-3 pl-4 whitespace-nowrap text-xs text-gray-500">{formatDate(movement.createdAt)}</td>
                      <td className="py-3">
                        <div className="font-bold">{movement.product?.name || "ΓÇö"}</div>
                        {movement.product?.sku && (
                          <div className="text-xs text-gray-500">{movement.product.sku}</div>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TYPE_COLORS[movement.type] || "bg-gray-100 text-gray-600"}`}>
                          {isArabic ? labels.ar : labels.en}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-gray-500">{movement.reason || "ΓÇö"}</td>
                      <td className={`py-3 font-bold ${qty < 0 ? "text-red-600" : "text-green-600"}`}>
                        {qty > 0 ? `+${qty}` : qty}
                      </td>
                      <td className="py-3 text-xs text-gray-500">{movement.reference || "ΓÇö"}</td>
                      <td className="py-3 pr-4 text-xs text-gray-500">{movement.notes || "ΓÇö"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockMovementsPage;
