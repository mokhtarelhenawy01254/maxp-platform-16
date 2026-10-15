import React, { useState, useEffect, useMemo } from 'react';
import {
  FlaskConical,
  Plus,
  Trash2,
  Scale,
  Search,
  Clock,
  Coins,
  Percent,
  Layers,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { companyAwareApi } from '../../services/companyAwareApi';
import { useCurrency } from '../../hooks/useCurrency';
import { RecipeModal, IngredientInput, ProductOption } from './RecipeModal';

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  prepTimeMinutes: number;
  yieldQuantity: number;
  estimatedCost: number;
  liveTheoreticalCost?: number;
  profitMarginPercentage?: number;
  product: {
    id: string;
    name: string;
    price: number;
    sku?: string;
  };
  ingredients: Array<{
    id: string;
    quantity: number;
    unit: string;
    unitConversionRatio: number;
    yieldPercentage: number;
    effectiveCost?: number;
    rawProduct: {
      id: string;
      name: string;
      cost: number;
      stock: number;
    };
  }>;
}

export const RecipeManagementPage: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [prepTime, setPrepTime] = useState(3);
  const [ingredients, setIngredients] = useState<IngredientInput[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recipesRes, productsRes] = await Promise.all([
        companyAwareApi.get('/cafe/recipes'),
        companyAwareApi.get('/products?limit=200'),
      ]);

      if (recipesRes.data?.success) {
        setRecipes(recipesRes.data.data?.recipes || recipesRes.data.data || []);
      }
      if (productsRes.data?.data) {
        setProducts(productsRes.data.data || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل تحميل بيانات الوصفات');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedProductId('');
    setRecipeName('');
    setPrepTime(3);
    setIngredients([
      { rawProductId: '', quantity: 18, unit: 'G', unitConversionRatio: 1, yieldPercentage: 100 },
    ]);
    setIsModalOpen(true);
  };

  const handleAddIngredientRow = () => {
    setIngredients([
      ...ingredients,
      { rawProductId: '', quantity: 1, unit: 'G', unitConversionRatio: 1, yieldPercentage: 100 },
    ]);
  };

  const handleRemoveIngredientRow = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: keyof IngredientInput, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const liveModalCost = useMemo(() => {
    return ingredients.reduce((sum, ing) => {
      const prod = products.find((p) => p.id === ing.rawProductId);
      const cost = Number(prod?.cost || 0);
      const qty = Number(ing.quantity || 0);
      const ratio = Number(ing.unitConversionRatio || 1);
      const yieldPct = Number(ing.yieldPercentage || 100) / 100;
      const effective = yieldPct > 0 ? (qty * ratio) / yieldPct : qty * ratio;
      return sum + effective * cost;
    }, 0);
  }, [ingredients, products]);

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      toast.error('يرجى اختيار المشروب / المنتج النهائي');
      return;
    }
    const validIngredients = ingredients.filter((i) => i.rawProductId && Number(i.quantity) > 0);
    if (validIngredients.length === 0) {
      toast.error('يرجى إضافة مكون خام واحد على الأقل مع تحديد الكمية');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        productId: selectedProductId,
        name: recipeName || undefined,
        prepTimeMinutes: prepTime,
        yieldQuantity: 1,
        ingredients: validIngredients,
      };

      const res = await companyAwareApi.post('/cafe/recipes', payload);
      if (res.data?.success) {
        toast.success(res.data.message || 'تم حفظ معيار التصنيع بنجاح');
        setIsModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل حفظ معيار التصنيع');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف معيار هذا المشروب؟')) return;
    try {
      const res = await companyAwareApi.delete(`/cafe/recipes/${id}`);
      if (res.data?.success) {
        toast.success('تم حذف الرسيبي بنجاح');
        setRecipes((prev) => (prev || []).filter((r) => r.id !== id));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل حذف الرسيبي');
    }
  };

  const filteredRecipes = (recipes || []).filter(
    (r) =>
      r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <FlaskConical className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              معايير تصنيع المشروبات (Recipe BOM)
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted/40 text-muted-foreground border border-border/70 font-mono tabular-nums">
              <Layers className="h-3 w-3" />
              {filteredRecipes.length} معيار
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            ضبط مقادير الأكواب بالجرام والمل، واحتساب تكلفة الخامات وهامش الربح الحقيقي
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-[0.97] shadow-xs"
        >
          <Plus className="w-4 h-4" />
          معيار مشروب جديد
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-card p-3 rounded-2xl border border-border/70 shadow-2xs">
        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث في المشروبات والمعايير…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl bg-muted/20 border border-border/70 text-foreground focus:outline-hidden"
          />
        </div>
      </div>

      {/* Recipes Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">جاري تحميل المعايير…</div>
      ) : filteredRecipes.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border/70 rounded-2xl p-6 bg-card">
          <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground mx-auto mb-3 border border-border/60">
            <FlaskConical className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground mb-1">لا توجد معايير تصنيع مسجلة</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
            أضف رسيبي للمشروبات لتتمكن من تتبع استهلاك حبوب القهوة والحليب تلقائياً عند البيع.
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.97]"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة أول معيار
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredRecipes.map((recipe) => {
            const margin = recipe.profitMarginPercentage ?? 0;
            return (
              <div
                key={recipe.id}
                className="border border-border/70 rounded-2xl bg-card p-4 space-y-3 shadow-2xs hover:border-border transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {recipe.product?.name || recipe.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {recipe.prepTimeMinutes} دقيقة
                      </span>
                      <span>•</span>
                      <span className="font-mono tabular-nums">
                        بيع: {formatPrice(recipe.product?.price || 0)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteRecipe(recipe.id)}
                    aria-label="حذف المعيار"
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Cost & Margin Strip */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/60 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[10px]">تكلفة الخامات:</span>
                    <p className="font-mono tabular-nums font-bold text-foreground mt-0.5">
                      {formatPrice(recipe.estimatedCost || 0)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px]">هامش الربح:</span>
                    <p className={`font-mono tabular-nums font-bold mt-0.5 ${
                      margin >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {margin.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Ingredients List */}
                <div className="space-y-1.5 border-t border-border/60 pt-2.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">المكونات:</span>
                  {(recipe.ingredients || []).map((ing, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-muted/20"
                    >
                      <span className="text-foreground">{ing.rawProduct?.name || 'مكون'}</span>
                      <span className="font-mono tabular-nums text-muted-foreground text-[11px]">
                        {ing.quantity} {ing.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recipe Modal Subcomponent */}
      <RecipeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedProductId={selectedProductId}
        setSelectedProductId={setSelectedProductId}
        recipeName={recipeName}
        setRecipeName={setRecipeName}
        prepTime={prepTime}
        setPrepTime={setPrepTime}
        ingredients={ingredients}
        products={products}
        onAddIngredientRow={handleAddIngredientRow}
        onRemoveIngredientRow={handleRemoveIngredientRow}
        onIngredientChange={handleIngredientChange}
        liveModalCost={liveModalCost}
        onSave={handleSaveRecipe}
        saving={saving}
        formatPrice={formatPrice}
      />
    </div>
  );
};

export default RecipeManagementPage;
