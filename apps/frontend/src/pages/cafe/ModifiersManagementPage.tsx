import React, { useState, useEffect } from 'react';
import {
  AdjustmentsHorizontalIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { companyAwareApi } from '../../services/companyAwareApi';
import { useCurrency } from '../../hooks/useCurrency';

interface ModifierOption {
  id?: string;
  name: string;
  additionalPrice: number;
  rawProductId?: string;
  isDefault: boolean;
}

interface ModifierGroup {
  id: string;
  name: string;
  selectionType: 'SINGLE' | 'MULTIPLE';
  isRequired: boolean;
  minSelection: number;
  maxSelection: number;
  options: ModifierOption[];
}

interface ProductOption {
  id: string;
  name: string;
}

export const ModifiersManagementPage: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [selectionType, setSelectionType] = useState<'SINGLE' | 'MULTIPLE'>('SINGLE');
  const [isRequired, setIsRequired] = useState(false);
  const [options, setOptions] = useState<ModifierOption[]>([
    { name: '', additionalPrice: 0, isDefault: true },
    { name: '', additionalPrice: 0, isDefault: false }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsRes, prodsRes] = await Promise.all([
        companyAwareApi.get('/cafe/modifiers'),
        companyAwareApi.get('/products?limit=200')
      ]);

      if (groupsRes.data?.success) {
        setGroups(groupsRes.data.data || []);
      }
      if (prodsRes.data?.data) {
        setProducts(prodsRes.data.data || []);
      }
    } catch (err: any) {
      toast.error('فشل تحميل مجموعات الإضافات');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setName('');
    setSelectionType('SINGLE');
    setIsRequired(false);
    setOptions([
      { name: 'حليب عادي', additionalPrice: 0, isDefault: true },
      { name: 'حليب لوز', additionalPrice: 15, isDefault: false }
    ]);
    setIsModalOpen(true);
  };

  const handleAddOption = () => {
    setOptions([...options, { name: '', additionalPrice: 0, isDefault: false }]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, field: keyof ModifierOption, value: any) => {
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: value };
    setOptions(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('يرجى إدخال اسم المجموعة');
      return;
    }
    const validOpts = options.filter((o) => o.name.trim() !== '');
    if (validOpts.length === 0) {
      toast.error('يرجى إضافة خيار واحد على الأقل');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name,
        selectionType,
        isRequired,
        minSelection: isRequired ? 1 : 0,
        maxSelection: selectionType === 'SINGLE' ? 1 : 5,
        options: validOpts
      };

      const res = await companyAwareApi.post('/cafe/modifiers', payload);
      if (res.data?.success) {
        toast.success('تم حفظ مجموعة التعديلات بنجاح');
        setIsModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل حفظ المجموعة');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المجموعة؟')) return;
    try {
      const res = await companyAwareApi.delete(`/cafe/modifiers/${id}`);
      if (res.data?.success) {
        toast.success('تم حذف المجموعة بنجاح');
        setGroups(groups.filter((g) => g.id !== id));
      }
    } catch (err: any) {
      toast.error('فشل حذف المجموعة');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <AdjustmentsHorizontalIcon className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-pretty">
              خيارات وتعديلات المشروبات (Drink Modifiers)
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            إدارة أنواع الحليب، النكهات الإضافية، والشوتات مع أسعارها وربطها بالمخزن
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-[0.97]"
        >
          <PlusIcon className="w-4 h-4" />
          مجموعة تعديل جديدة
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">جاري تحميل الخيارات…</div>
      ) : groups.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border/50 rounded-lg p-6">
          <AdjustmentsHorizontalIcon className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <h3 className="text-sm font-semibold mb-1">لا توجد خيارات تعديل مسجلة</h3>
          <p className="text-xs text-muted-foreground mb-4">
            أضف خيارات مثل "أنواع الحليب" أو "الشوت الإضافي" لتظهر للكاشير أثناء تحضير الطلب.
          </p>
          <button
            onClick={handleOpenModal}
            className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground"
          >
            إضافة أول مجموعة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map((group) => (
            <div key={group.id} className="border border-border/60 rounded-lg bg-card p-3.5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-semibold">{group.name}</h3>
                  <span className="text-[10px] text-muted-foreground">
                    {group.selectionType === 'SINGLE' ? 'اختيار واحد فقط' : 'اختيارات متعددة'}
                    {group.isRequired && ' • إجباري'}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(group.id)}
                  aria-label="حذف المجموعة"
                  className="text-muted-foreground hover:text-destructive p-1 rounded"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1 border-t border-border/30 pt-2">
                {group.options.map((opt, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs py-1">
                    <span className="text-muted-foreground">{opt.name}</span>
                    <span className="font-mono tabular-nums font-medium">
                      {opt.additionalPrice > 0 ? `+${formatPrice(opt.additionalPrice)}` : 'مجاناً'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-card border border-border w-full max-w-lg rounded-lg p-4 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="text-sm font-semibold">إنشاء مجموعة تعديل للمشروبات</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <XMarkIcon className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">اسم المجموعة *</label>
                <input
                  type="text"
                  placeholder="مثال: نوع الحليب البديل، النكهة الإضافية"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 text-xs rounded bg-muted/40 border border-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">نوع الاختيار</label>
                  <select
                    value={selectionType}
                    onChange={(e) => setSelectionType(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs rounded bg-muted/40 border border-border"
                  >
                    <option value="SINGLE">خيار واحد (Single)</option>
                    <option value="MULTIPLE">متعدد (Multiple)</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRequired}
                      onChange={(e) => setIsRequired(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span>إجباري على الكاشير</span>
                  </label>
                </div>
              </div>

              {/* Options */}
              <div className="border border-border/60 rounded p-3 space-y-2 bg-muted/20">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold">خيارات التعديل والأسعار</span>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <PlusIcon className="w-3.5 h-3.5" /> إضافة خيار
                  </button>
                </div>

                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="اسم الخيار (مثال: حليب لوز)"
                        value={opt.name}
                        onChange={(e) => handleOptionChange(idx, 'name', e.target.value)}
                        className="flex-1 px-2.5 py-1 text-xs rounded bg-background border border-border"
                        required
                      />

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">+</span>
                        <input
                          type="number"
                          step="any"
                          placeholder="السعر"
                          value={opt.additionalPrice}
                          onChange={(e) => handleOptionChange(idx, 'additionalPrice', Number(e.target.value))}
                          className="w-16 px-2 py-1 text-xs rounded bg-background border border-border tabular-nums"
                        />
                      </div>

                      <select
                        value={opt.rawProductId || ''}
                        onChange={(e) => handleOptionChange(idx, 'rawProductId', e.target.value || undefined)}
                        className="w-32 px-2 py-1 text-xs rounded bg-background border border-border text-[11px]"
                      >
                        <option value="">خامة المخزن (اختياري)</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>

                      {options.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded border border-border"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs rounded bg-primary text-primary-foreground disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ…' : 'حفظ المجموعة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModifiersManagementPage;
