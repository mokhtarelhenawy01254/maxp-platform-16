import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Compass,
  ArrowRight,
  Search,
  Plus,
  Loader2,
  Sliders,
  Layers,
  Sparkles,
  Inbox,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../services/apiClient';
import i18n from '../../i18n';

interface DiscoveredItem {
  suggestedName: string;
  reason: string;
  matchedProducts: number;
}

export const AutoDiscoverPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [maxResults, setMaxResults] = useState(5);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    discovered: DiscoveredItem[];
    searchedTerms: number;
    yourProductCount: number;
    suggestion: string;
  } | null>(null);
  const [error, setError] = useState('');

  const handleDiscover = async () => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const params: Record<string, string | number> = { maxResults };
      if (category.trim()) params.category = category.trim();
      const res = await apiClient.get('/competitors/auto-discover', { params });
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        setError(res.data?.error || t('competitors.errors.discoveryFailed') || 'فشل استكشاف المنافسين');
      }
    } catch {
      setError(t('competitors.errors.discoveryFailed') || 'تعذر الاتصال بمحرك الاستكشاف');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (name: string) => {
    toast.success(t('competitors.autoDiscover.addedSuccess') || 'تم اختيار المنافس للمتابعة', {
      description: name,
    });
    navigate(`/competitors/add?name=${encodeURIComponent(name)}`);
  };

  return (
    <div dir={i18n.dir()} className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border/70 rounded-xl p-4 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/competitors')}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>قائمة المنافسين</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-foreground">الاستكشاف التلقائي</span>
          </div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Compass className="w-4 h-4 text-primary" />
            الاستكشاف الذكي للمنافسين (AI Auto-Discovery Engine)
          </h2>
          <p className="text-xs text-muted-foreground">
            فحص وتحليل الكتالوج للعثور على المتاجر التي تبيع نفس منتجاتك في السوق المحلي
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => navigate('/competitors')}
            className="px-3.5 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors"
          >
            العودة للمنافسين
          </button>
        </div>
      </div>

      {/* Telemetry ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>محرك الاستكشاف</span>
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">تحليل الكلمات والكتالوج</span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">AI Active</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>الحد الأقصى للنتائج</span>
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-foreground tabular-nums">
              {maxResults} منافسين
            </span>
            <span className="text-[11px] text-muted-foreground">لكل جولة فحص</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>مطابقة المنتجات</span>
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">
              {data ? `${data.yourProductCount} منتج محلل` : "جاهز للبدء"}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">Catalog Match</span>
          </div>
        </div>
      </div>

      {/* Discovery Control Surface */}
      <div className="bg-card border border-border/70 rounded-xl p-5 space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">
              تصفية حسب التصنيف أو الكلمة المفتاحية (اختياري)
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="مثال: أحذية، عطور، ملابس نسائية..."
              className="w-full h-9 px-3 text-xs rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">عدد المقترحات المطلوبة:</span>
              <span className="font-mono font-bold text-primary tabular-nums">{maxResults}</span>
            </div>
            <input
              type="range"
              min={1}
              max={15}
              step={1}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer mt-2"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleDiscover}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Compass className="w-3.5 h-3.5" />}
            <span>{loading ? "جاري الفحص والتحليل في السوق..." : "بدء الاستكشاف الذكي"}</span>
          </button>
        </div>
      </div>

      {/* Results View */}
      {data && (
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden divide-y divide-border/60">
          <div className="px-4 py-3 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>نتائج الاستكشاف التلقائي ({data.discovered.length} منافس محتمل)</span>
            </div>
            {data.suggestion && (
              <span className="text-[11px] text-muted-foreground">{data.suggestion}</span>
            )}
          </div>

          {data.discovered.length === 0 ? (
            <div className="p-8 text-center space-y-2 text-muted-foreground">
              <Inbox className="w-8 h-8 text-muted-foreground/30 mx-auto" />
              <p className="text-xs">لم نتمكن من العثور على منافسين مطابقين بناءً على المدخلات الحالية</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {data.discovered.map((item, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between gap-3 hover:bg-muted/15 transition-colors">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-foreground truncate">{item.suggestedName}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-primary/10 text-primary font-medium">
                        {item.matchedProducts} منتجات متطابقة
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{item.reason}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdd(item.suggestedName)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-primary" />
                    <span>إضافة ومراقبة</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutoDiscoverPage;