import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, MessageCircle, ClipboardList } from "lucide-react";
import { api, fetchJson, MODAL_INPUT_CLS } from "./shared";

interface QuoteExamType {
  id: string;
  name: string;
  category?: string;
  abbreviation?: string;
  price: number;
}

interface QuoteItem {
  examTypeId: string;
  name: string;
  category?: string;
  price: number;
}

const formatPrice = (value: number) => `${value} ج`;

export default function PriceQuoteTab() {
  const [examTypes, setExamTypes] = useState<QuoteExamType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);

  const loadExamTypes = async (quiet = false) => {
    setLoading(true);
    try {
      const data = await fetchJson<QuoteExamType[]>(`${api("exam-types")}&limit=200`);
      setExamTypes(data || []);
    } catch (e: unknown) {
      if (!quiet) setError(e instanceof Error ? e.message : "حدث خطأ في جلب أنواع الفحوصات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExamTypes();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim();
    if (!term) return examTypes;
    return examTypes.filter(
      (t) =>
        t.name.includes(term) ||
        (t.category || "").includes(term) ||
        (t.abbreviation || "").includes(term)
    );
  }, [examTypes, search]);

  const addItem = (t: QuoteExamType) => {
    setError(null);
    setItems((prev) =>
      prev.some((it) => it.examTypeId === t.id)
        ? prev
        : [...prev, { examTypeId: t.id, name: t.name, category: t.category, price: t.price }]
    );
    setSearch("");
  };

  const removeItem = (examTypeId: string) => {
    setItems((prev) => prev.filter((it) => it.examTypeId !== examTypeId));
  };

  const total = useMemo(() => items.reduce((sum, it) => sum + Number(it.price || 0), 0), [items]);

  const buildWhatsAppText = () => {
    const lines = items.map((it) => `• ${it.name}: ${formatPrice(it.price)}`);
    return [`عرض سعر فحوصات الأشعة:`, ...lines, `الإجمالي: ${formatPrice(total)}`].join("\n");
  };

  const shareWhatsApp = () => {
    if (items.length === 0) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsAppText())}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">عرض سعر سريع</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">اختر نوع فحص أو أكثر لعرض السعر فوراً ومشاركته عبر واتساب</p>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded">×</button>
        </div>
      )}

      <div className="relative">
        <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
        <input
          className={`${MODAL_INPUT_CLS} pr-9`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الفئة أو الاختصار..."
        />
        {search.trim() && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-xl">
            {filtered.map((t) => {
              const added = items.some((it) => it.examTypeId === t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => addItem(t)}
                  disabled={added}
                  className="flex items-center justify-between w-full text-right px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="font-medium">{t.name}</span>
                  <span className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                    <span className="whitespace-nowrap">{formatPrice(t.price)}</span>
                    {added ? <span className="text-xs text-green-600 dark:text-green-400">مضاف</span> : <Plus className="w-4 h-4" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">جارٍ التحميل...</div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
          <ClipboardList className="w-10 h-10 mx-auto mb-3" />
          لم يتم اختيار فحوصات بعد — ابحث وأضف نوع الفحص من القائمة
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300">
            الفحوصات المختارة ({items.length})
          </div>
          <ul className="divide-y dark:divide-gray-700">
            {items.map((it) => (
              <li key={it.examTypeId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="font-medium">{it.name}</div>
                  {it.category && <div className="text-xs text-gray-500 dark:text-gray-400">{it.category}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="whitespace-nowrap text-sm">{formatPrice(it.price)}</span>
                  <button
                    onClick={() => removeItem(it.examTypeId)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                    title="إزالة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t dark:border-gray-700">
            <div className="text-lg font-bold">
              الإجمالي: <span className="text-blue-600 dark:text-blue-400">{formatPrice(total)}</span>
            </div>
            <button
              onClick={shareWhatsApp}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <MessageCircle className="w-4 h-4" />مشاركة عبر واتساب
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
