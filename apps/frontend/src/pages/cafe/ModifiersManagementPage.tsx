import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Coffee,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { companyAwareApi } from '../../services/companyAwareApi';
import { useCurrency } from '../../hooks/useCurrency';
import { ModifierModal, ModifierOption } from './ModifierModal';

export interface ModifierGroup {
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
    { name: '', additionalPrice: 0, isDefault: false },
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsRes, prodsRes] = await Promise.all([
        companyAwareApi.get('/cafe/modifiers'),
        companyAwareApi.get('/products?limit=200'),
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
      { name: 'حليب لوز', additionalPrice: 15, isDefault: false },
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
        options: validOpts,
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
        setGroups((prev) => (prev || []).filter((g) => g.id !== id));
      }
    } catch (err: any) {
      toast.error('فشل حذف المجموعة');
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <SlidersHorizontal className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              خيارات وتعديلات المشروبات
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted/40 text-muted-foreground border border-border/70 font-mono tabular-nums">
              <Layers className="h-3 w-3" />
              {groups.length} مجموعات
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            إدارة أنواع الحليب، النكهات الإضافية، والشوتات مع أسعارها وربطها بالمخزن
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-[0.97] shadow-xs"
        >
          <Plus className="w-4 h-4" />
          مجموعة تعديل جديدة
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">جاري تحميل الخيارات…</div>
      ) : (groups || []).length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border/70 rounded-2xl p-6 bg-card">
          <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground mx-auto mb-3 border border-border/60">
            <Coffee className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground mb-1">لا توجد خيارات تعديل مسجلة</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
            أضف خيارات مثل نوع الحليب أو الشوت الإضافي لتظهر للكاشير أثناء تحضير الطلب.
          </p>
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.97]"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة أول مجموعة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(groups || []).map((group) => (
            <div
              key={group.id}
              className="border border-border/70 rounded-2xl bg-card p-4 space-y-3 shadow-2xs hover:border-border transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{group.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md border border-border/60">
                      {group.selectionType === 'SINGLE' ? 'اختيار واحد فقط' : 'اختيارات متعددة'}
                    </span>
                    {group.isRequired && (
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                        إجباري
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(group.id)}
                  aria-label="حذف المجموعة"
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 border-t border-border/60 pt-2.5">
                {(group.options || []).map((opt, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-muted/20"
                  >
                    <span className="text-foreground font-medium">{opt.name}</span>
                    <span className="font-mono tabular-nums font-semibold text-foreground text-[11px]">
                      {opt.additionalPrice > 0 ? `+${formatPrice(opt.additionalPrice)}` : 'مجاناً'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Subcomponent */}
      <ModifierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        name={name}
        setName={setName}
        selectionType={selectionType}
        setSelectionType={setSelectionType}
        isRequired={isRequired}
        setIsRequired={setIsRequired}
        options={options}
        onAddOption={handleAddOption}
        onRemoveOption={handleRemoveOption}
        onOptionChange={handleOptionChange}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
};

export default ModifiersManagementPage;
