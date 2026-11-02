import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, Trash2, Shirt, Calendar, DollarSign, Tag, User, Upload, Check } from 'lucide-react';
import {
  manufacturingApi,
  BillOfMaterials,
  SampleMaterialSource,
  PartnerFactory,
  SampleExpenseCatalogItem,
  ProductOption,
  SampleOrderItem,
} from '../manufacturingApi';
import { CustomerPicker } from './CustomerPicker';

interface CreateSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SampleItemRow {
  productId: string;
  productName: string;
  productSearch: string;
  quantity: number;
  size: string;
  color: string;
}

export const CreateSampleModal: React.FC<CreateSampleModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [productName, setProductName] = useState('');
  const [productId, setProductId] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<boolean>(false);
  const productDropdownRef = useRef<HTMLDivElement | null>(null);

  // بنود منتجات العينة (Task HZ-E)
  const [sampleItems, setSampleItems] = useState<SampleItemRow[]>([
    {
      productId: '',
      productName: '',
      productSearch: '',
      quantity: 1,
      size: '',
      color: '',
    },
  ]);
  const [activeItemDropdownIdx, setActiveItemDropdownIdx] = useState<number | null>(null);
  const itemDropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerDisplayName, setCustomerDisplayName] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [plannedQuantity, setPlannedQuantity] = useState<number>(1);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [materialSource, setMaterialSource] = useState<SampleMaterialSource>('CUSTOMER');
  const [fee, setFee] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<string>('0');
  const [partnerFactoryId, setPartnerFactoryId] = useState<string>('');
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState<string>('');
  const [sampleReceived, setSampleReceived] = useState<boolean>(false);
  const [receivedAt, setReceivedAt] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dueDate, setDueDate] = useState<string>('');
  const [designNotes, setDesignNotes] = useState('');
  const [bomId, setBomId] = useState<string>('');

  // المصاريف المتكررة (T07)
  const [expenseCatalog, setExpenseCatalog] = useState<SampleExpenseCatalogItem[]>([]);
  const [expenses, setExpenses] = useState<Array<{ name: string; amount: number; catalogId?: string | null }>>([]);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState<string>('');

  // Factories list
  const [factories, setFactories] = useState<PartnerFactory[]>([]);

  // BOMs list for optional linking
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);

  // Default stages
  const [stages, setStages] = useState<Array<{ name: string; sequence: number }>>([
    { name: 'قص وتجهيز القماش', sequence: 1 },
    { name: 'خياطة وتجميع العينة', sequence: 2 },
    { name: 'تشطيب وكي وفحص الجودة', sequence: 3 },
  ]);

  const resetForm = () => {
    setProductName('');
    setProductId('');
    setProductSearch('');
    setIsProductDropdownOpen(false);
    setCustomerId(null);
    setCustomerDisplayName('');
    setCustomerName('');
    setBrandName('');
    setPlannedQuantity(1);
    setSize('');
    setColor('');
    setMaterialSource('CUSTOMER');
    setFee('');
    setTotalAmount('');
    setDepositAmount('0');
    setPartnerFactoryId('');
    setExpectedDeliveryAt('');
    setDueDate('');
    setDesignNotes('');
    setBomId('');
    setExpenses([]);
    setNewExpenseName('');
    setNewExpenseAmount('');
    setSelectedFiles([]);
    setError(null);
    setSampleReceived(false);
    setReceivedAt('');
    setStages([
      { name: 'قص وتجهيز القماش', sequence: 1 },
      { name: 'خياطة وتجميع العينة', sequence: 2 },
      { name: 'تشطيب وكي وفحص الجودة', sequence: 3 },
    ]);
    setSampleItems([
      {
        productId: '',
        productName: '',
        productSearch: '',
        quantity: 1,
        size: '',
        color: '',
      },
    ]);
    setActiveItemDropdownIdx(null);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setIsProductDropdownOpen(false);
      }
      if (activeItemDropdownIdx !== null) {
        const rowRef = itemDropdownRefs.current[activeItemDropdownIdx];
        if (rowRef && !rowRef.contains(e.target as Node)) {
          setActiveItemDropdownIdx(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeItemDropdownIdx]);

  const handleAddItem = () => {
    setSampleItems((prev) => [
      ...prev,
      {
        productId: '',
        productName: '',
        productSearch: '',
        quantity: 1,
        size: '',
        color: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (sampleItems.length <= 1) return;
    const updated = sampleItems.filter((_, i) => i !== index);
    setSampleItems(updated);
    const totalQty = updated.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
    setPlannedQuantity(totalQty);
    if (index === 0 && updated.length > 0) {
      setProductId(updated[0].productId);
      setProductName(updated[0].productName);
      setProductSearch(updated[0].productSearch);
      setSize(updated[0].size);
      setColor(updated[0].color);
    }
  };

  const handleItemProductSelect = (index: number, p: ProductOption) => {
    const updated = [...sampleItems];
    updated[index] = {
      ...updated[index],
      productId: p.id,
      productName: p.name,
      productSearch: p.name,
    };
    setSampleItems(updated);
    setActiveItemDropdownIdx(null);

    if (index === 0) {
      setProductId(p.id);
      setProductName(p.name);
      setProductSearch(p.name);
    }
  };

  const handleItemSearchChange = (index: number, text: string) => {
    const updated = [...sampleItems];
    updated[index] = {
      ...updated[index],
      productSearch: text,
      productName: text,
    };
    if (updated[index].productId) {
      const match = products.find((p) => p.id === updated[index].productId);
      if (!match || match.name !== text) {
        updated[index].productId = '';
      }
    }
    setSampleItems(updated);
    setActiveItemDropdownIdx(index);

    if (index === 0) {
      setProductSearch(text);
      setProductName(text);
      if (productId && (!selectedProduct || selectedProduct.name !== text)) {
        setProductId('');
      }
    }
  };

  const handleItemFieldChange = (index: number, field: 'quantity' | 'size' | 'color', value: any) => {
    const updated = [...sampleItems];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setSampleItems(updated);

    if (field === 'quantity') {
      const totalQty = updated.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
      setPlannedQuantity(totalQty);
    }
    if (index === 0) {
      if (field === 'size') setSize(value);
      if (field === 'color') setColor(value);
      if (field === 'quantity' && updated.length === 1) setPlannedQuantity(value);
    }
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
      setProductsLoading(true);
      manufacturingApi
        .getProducts()
        .then((res: any) => {
          setProducts(Array.isArray(res) ? res : []);
        })
        .catch(() => {
          setProducts([]);
        })
        .finally(() => {
          setProductsLoading(false);
        });

      manufacturingApi
        .listBoms()
        .then((res: any) => {
          setBoms(Array.isArray(res) ? res : (res?.items || []));
        })
        .catch(() => {});

      manufacturingApi
        .listPartnerFactories()
        .then((res: any) => {
          setFactories(Array.isArray(res) ? res : (res?.items || []));
        })
        .catch(() => {});

      manufacturingApi
        .listExpenseCatalog()
        .then((res: any) => {
          setExpenseCatalog(Array.isArray(res) ? res : []);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 8);
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [products, productSearch]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === productId) || null;
  }, [products, productId]);

  if (!isOpen) return null;

  const handleAddStage = () => {
    setStages([...stages, { name: '', sequence: stages.length + 1 }]);
  };

  const handleRemoveStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  const handleStageChange = (index: number, val: string) => {
    const updated = [...stages];
    updated[index].name = val;
    setStages(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (products.length === 0) {
      setError('لا توجد منتجات — أضف منتج من شاشة المنتجات أولًا');
      return;
    }
    if (sampleItems.length === 0) {
      setError('أضف منتج واحد على الأقل');
      return;
    }
    for (let i = 0; i < sampleItems.length; i++) {
      const it = sampleItems[i];
      if (!it.productId && !it.productName.trim()) {
        setError(`اختر المنتج التام للبند رقم ${i + 1}`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const validStages = stages
        .filter((s) => s.name.trim())
        .map((s, idx) => ({
          name: s.name.trim(),
          sequence: idx + 1,
        }));

      const itemsPayload: SampleOrderItem[] = sampleItems.map((it, idx) => ({
        productId: it.productId || null,
        productName: it.productName.trim() || (products.find((p) => p.id === it.productId)?.name || 'منتج'),
        quantity: Math.max(1, Number(it.quantity) || 1),
        size: it.size ? it.size.trim().toUpperCase() : undefined,
        color: it.color ? it.color.trim().toUpperCase() : undefined,
        sortOrder: idx + 1,
      }));

      const createdSample = await manufacturingApi.createSampleOrder({
        productId: itemsPayload[0]?.productId || productId || undefined,
        productName: itemsPayload[0]?.productName || productName.trim(),
        items: itemsPayload,
        customerId: customerId || undefined,
        customerName: customerName.trim() || undefined,
        brandName: brandName.trim() || undefined,
        plannedQuantity: Number(plannedQuantity) || 1,
        size: size.trim() || undefined,
        color: color.trim() || undefined,
        materialSource,
        fee: fee ? Number(fee) : undefined,
        totalAmount: totalAmount !== '' ? Number(totalAmount) : undefined,
        depositAmount: depositAmount !== '' ? Number(depositAmount) : 0,
        partnerFactoryId: partnerFactoryId || undefined,
        expectedDeliveryAt: expectedDeliveryAt || undefined,
        sampleReceived,
        receivedAt: sampleReceived ? (receivedAt ? new Date(receivedAt).toISOString() : new Date().toISOString()) : undefined,
        dueDate: dueDate || undefined,
        designNotes: designNotes.trim() || undefined,
        bomId: bomId || undefined,
        stages: validStages.length > 0 ? validStages : undefined,
        expenses:
          expenses.length > 0
            ? expenses.map((e) => ({
                name: e.name,
                amount: Number(e.amount) || 0,
                catalogId: e.catalogId || undefined,
              }))
            : undefined,
      });

      // Upload selected initial attachments
      if (selectedFiles.length > 0 && createdSample?.id) {
        for (const file of selectedFiles) {
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileName', file.name);
            await manufacturingApi.uploadSampleFile(createdSample.id, formData);
          } catch (_) {}
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء إنشاء أمر العينة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-card border border-border/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between bg-muted/20">
          <div>
            <h2 className="text-base font-bold text-foreground">إنشاء أمر تصنيع عينة جديد (SMP)</h2>
            <p className="text-xs text-muted-foreground">
              سجل تفاصيل العينة ومواصفاتها سواء كانت خامة من العميل أو من المصنع
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Row 1: Product & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Product Combobox */}
            <div ref={productDropdownRef} className="relative">
              <label className="block text-xs font-semibold text-foreground mb-1">
                المنتج التام (الأساسي) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProductSearch(val);
                    setIsProductDropdownOpen(true);
                    if (productId && val !== productName) {
                      setProductId('');
                      setProductName('');
                    }
                    setSampleItems((prev) => {
                      if (prev.length === 0) return prev;
                      const updated = [...prev];
                      updated[0] = {
                        ...updated[0],
                        productSearch: val,
                        productName: val,
                        productId: (productId && val === productName) ? productId : '',
                      };
                      return updated;
                    });
                  }}
                  onFocus={() => setIsProductDropdownOpen(true)}
                  placeholder="ابحث واختر منتج تام..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                <Shirt className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              </div>

              {/* Sub-label */}
              <div className="mt-1">
                {products.length === 0 && !productsLoading ? (
                  <p className="text-[11px] text-destructive font-medium">
                    لا توجد منتجات — أضف منتج من شاشة المنتجات أولًا
                  </p>
                ) : selectedProduct ? (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    المنتج المختار: {selectedProduct.name} — كود {selectedProduct.sku ? selectedProduct.sku : 'بدون كود'}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    اختر منتج من القائمة (يتزامن مع أول بند)
                  </p>
                )}
              </div>

              {/* Dropdown list */}
              {isProductDropdownOpen && (
                <div className="absolute z-30 top-full mt-1 right-0 left-0 bg-popover border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {productsLoading ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">جاري تحميل المنتجات...</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      {products.length === 0
                        ? 'لا توجد منتجات — أضف منتج من شاشة المنتجات أولًا'
                        : 'لا توجد نتائج مطابقة للبحث'}
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const isSelected = p.id === productId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setProductId(p.id);
                            setProductName(p.name);
                            setProductSearch(p.name);
                            setIsProductDropdownOpen(false);
                            setSampleItems((prev) => {
                              if (prev.length === 0) {
                                return [{ productId: p.id, productName: p.name, productSearch: p.name, quantity: 1, size, color }];
                              }
                              const updated = [...prev];
                              updated[0] = {
                                ...updated[0],
                                productId: p.id,
                                productName: p.name,
                                productSearch: p.name,
                              };
                              return updated;
                            });
                          }}
                          className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-muted/70 transition-colors ${
                            isSelected ? 'bg-primary/10 text-primary font-bold' : 'text-foreground'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{p.name}</span>
                            {p.sku && <span className="text-[10px] text-muted-foreground font-mono">كود: {p.sku}</span>}
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 mr-2" />}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">العلامة التجارية (البراند)</label>
              <div className="relative">
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="مثال: Brand Z / Huinzo"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                <Tag className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* قسم منتجات العينة (Task HZ-E) */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-muted/15 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shirt className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">منتجات العينة (بنود المنتجات)</span>
                <span className="text-[11px] text-muted-foreground font-mono">({sampleItems.length})</span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ إضافة منتج تاني</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {sampleItems.map((item, idx) => {
                const rowFilteredProducts = (() => {
                  const q = (item.productSearch || '').trim().toLowerCase();
                  if (!q) return products.slice(0, 8);
                  return products
                    .filter((p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)))
                    .slice(0, 8);
                })();

                const isRowDropdownOpen = activeItemDropdownIdx === idx;
                const rowSelectedProduct = products.find((p) => p.id === item.productId);

                return (
                  <div
                    key={idx}
                    ref={(el) => (itemDropdownRefs.current[idx] = el)}
                    className="p-3 rounded-lg border border-border/60 bg-card space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start">
                      {/* Product Combobox */}
                      <div className="sm:col-span-5 relative">
                        <label className="block text-[11px] font-semibold text-foreground mb-1">
                          المنتج #{idx + 1} <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={item.productSearch}
                            onChange={(e) => handleItemSearchChange(idx, e.target.value)}
                            onFocus={() => setActiveItemDropdownIdx(idx)}
                            placeholder="ابحث واختر منتج تام..."
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                          />
                          <Shirt className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2" />
                        </div>

                        {/* Dropdown */}
                        {isRowDropdownOpen && (
                          <div className="absolute z-40 top-full mt-1 right-0 left-0 bg-popover border border-border rounded-lg shadow-xl max-h-52 overflow-y-auto">
                            {productsLoading ? (
                              <div className="p-2.5 text-center text-xs text-muted-foreground">جاري التحميل...</div>
                            ) : rowFilteredProducts.length === 0 ? (
                              <div className="p-2.5 text-center text-xs text-muted-foreground">لا توجد نتائج</div>
                            ) : (
                              rowFilteredProducts.map((p) => {
                                const isSelected = p.id === item.productId;
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleItemProductSelect(idx, p)}
                                    className={`w-full text-right px-3 py-1.5 text-xs flex items-center justify-between hover:bg-muted/70 transition-colors ${
                                      isSelected ? 'bg-primary/10 text-primary font-bold' : 'text-foreground'
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">{p.name}</span>
                                      {p.sku && <span className="text-[10px] text-muted-foreground font-mono">كود: {p.sku}</span>}
                                    </div>
                                    {isSelected && <Check className="w-3 h-3 text-primary shrink-0 mr-2" />}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}

                        {rowSelectedProduct ? (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                            {rowSelectedProduct.name} {rowSelectedProduct.sku ? `(${rowSelectedProduct.sku})` : ''}
                          </p>
                        ) : null}
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-foreground mb-1">الكمية</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemFieldChange(idx, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none tabular-nums"
                        />
                      </div>

                      {/* Size */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-foreground mb-1">المقاس</label>
                        <input
                          type="text"
                          value={item.size}
                          onChange={(e) => handleItemFieldChange(idx, 'size', e.target.value)}
                          placeholder="L / XL"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                      </div>

                      {/* Color */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-foreground mb-1">اللون</label>
                        <input
                          type="text"
                          value={item.color}
                          onChange={(e) => handleItemFieldChange(idx, 'color', e.target.value)}
                          placeholder="أسود"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                      </div>

                      {/* Remove Button */}
                      <div className="sm:col-span-1 flex items-end justify-center pt-5 sm:pt-6">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={sampleItems.length <= 1}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                          title="حذف البند"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 2: Customer & BOM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                العميل <span className="text-muted-foreground text-[10px]">(بحث واختيار عميل مسجل)</span>
              </label>
              <CustomerPicker
                value={customerId}
                displayName={customerDisplayName}
                onChange={(c) => {
                  if (c) {
                    setCustomerId(c.id);
                    setCustomerDisplayName(c.name);
                    setCustomerName(c.name);
                  } else {
                    setCustomerId(null);
                    setCustomerDisplayName('');
                  }
                }}
              />
              <div className="mt-1.5">
                <span className="text-[10px] text-muted-foreground block mb-0.5">
                  أو اكتب اسم عميل غير مسجل (حر):
                </span>
                <div className="relative">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="مثال: أحمد مختار / شركة Z للملابس"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                  <User className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                قائمة المكونات (BOM) <span className="text-muted-foreground text-[10px]">(اختياري للعينة)</span>
              </label>
              <select
                value={bomId}
                onChange={(e) => setBomId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">بدون قائمة مكونات مسبقة</option>
                {boms.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Specs (Qty, Size, Color, Material Source) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">الكمية المطلوبة</label>
              <input
                type="number"
                min="1"
                value={plannedQuantity}
                onChange={(e) => setPlannedQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">المقاس</label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="L / XL / Oversize"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">اللون</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="أسود / كحلي"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                سعر/تكلفة العينة الأساسية (بدون المصاريف)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={fee}
                  onChange={(e) => {
                    setFee(e.target.value);
                    setTotalAmount(e.target.value);
                  }}
                  placeholder="2500"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none tabular-nums"
                />
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* المصاريف المتكررة (T07) */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                مصاريف العينة (شحن · تطريز · غسيل · معاينة)
              </label>
              <span className="text-[11px] font-bold text-foreground tabular-nums">
                إجمالي المصاريف: {expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0).toLocaleString()} ج.م
              </span>
            </div>

            {/* اختيار من الكتالوج */}
            <div className="flex flex-wrap gap-2">
              {expenseCatalog.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    setExpenses((prev) =>
                      prev.some((e) => e.catalogId === c.id)
                        ? prev
                        : [...prev, { name: c.name, amount: Number(c.defaultAmount) || 0, catalogId: c.id }]
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-[11px] border border-border bg-background hover:border-primary hover:text-primary transition-colors"
                >
                  + {c.name} ({Number(c.defaultAmount).toLocaleString()} ج.م)
                </button>
              ))}
              {expenseCatalog.length === 0 && (
                <span className="text-[11px] text-muted-foreground">مفيش كتالوج بعد — أضف أول مصروف من تحت.</span>
              )}
            </div>

            {/* البنود المضافة */}
            {expenses.map((ex, i) => (
              <div key={`${ex.catalogId || ex.name}-${i}`} className="flex items-center gap-2 text-xs">
                <span className="flex-1 font-medium">{ex.name}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={ex.amount}
                  onChange={(e) =>
                    setExpenses((prev) =>
                      prev.map((x, idx) => (idx === i ? { ...x, amount: Number(e.target.value) || 0 } : x))
                    )
                  }
                  className="w-24 px-2 py-1 rounded border border-border bg-background tabular-nums"
                />
                <span className="text-muted-foreground">ج.م</span>
                <button
                  type="button"
                  onClick={() => setExpenses((prev) => prev.filter((_, idx) => idx !== i))}
                  className="p-1 text-muted-foreground hover:text-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* إدخال مصروف جديد (بيتحفظ في الكتالوج تلقائيًا) */}
            <div className="flex items-center gap-2 pt-1 border-t border-border/60">
              <input
                type="text"
                value={newExpenseName}
                onChange={(e) => setNewExpenseName(e.target.value)}
                placeholder="مصروف جديد (مثال: تطريز)"
                className="flex-1 px-2 py-1 text-xs rounded border border-border bg-background"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newExpenseName.trim()) {
                      const name = newExpenseName.trim();
                      const amount = Number(newExpenseAmount) || 0;
                      setExpenses((prev) => [...prev, { name, amount }]);
                      setNewExpenseName('');
                      setNewExpenseAmount('');
                    }
                  }
                }}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={newExpenseAmount}
                onChange={(e) => setNewExpenseAmount(e.target.value)}
                placeholder="150"
                className="w-20 px-2 py-1 text-xs rounded border border-border bg-background tabular-nums"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newExpenseName.trim()) {
                      const name = newExpenseName.trim();
                      const amount = Number(newExpenseAmount) || 0;
                      setExpenses((prev) => [...prev, { name, amount }]);
                      setNewExpenseName('');
                      setNewExpenseAmount('');
                    }
                  }
                }}
              />
              <button
                type="button"
                disabled={!newExpenseName.trim()}
                onClick={() => {
                  const name = newExpenseName.trim();
                  const amount = Number(newExpenseAmount) || 0;
                  setExpenses((prev) => [...prev, { name, amount }]);
                  setNewExpenseName('');
                  setNewExpenseAmount('');
                }}
                className="px-2.5 py-1 text-[11px] rounded bg-primary text-primary-foreground disabled:opacity-50"
              >
                إضافة
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              أي مصروف جديد بيتحفظ في كتالوج الإعدادات أول مرة، وبعدها بتلاقيه زرار جاهز.
            </p>
          </div>

          {/* Row: Partner Factory & Expected Delivery Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                المصنع المنفذ <span className="text-muted-foreground text-[10px]">(المصانع الشريكة)</span>
              </label>
              <select
                value={partnerFactoryId}
                onChange={(e) => setPartnerFactoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">بدون مصنع</option>
                {factories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.code ? `(${f.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">موعد استلام العينة من المصنع</label>
              <div className="relative">
                <input
                  type="date"
                  value={expectedDeliveryAt}
                  onChange={(e) => setExpectedDeliveryAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                <Calendar className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Row: Sample Receipt Status */}
          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/70 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sampleReceived}
                onChange={(e) => setSampleReceived(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
              />
              <span className="text-xs font-semibold text-foreground">
                تم استلام العينة الفعلية من المصنع
              </span>
              {sampleReceived && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  مستلمة
                </span>
              )}
            </label>

            {sampleReceived && (
              <div className="pt-2 border-t border-border/50">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  تاريخ استلام العينة
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="date"
                    value={receivedAt}
                    onChange={(e) => setReceivedAt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                  <Calendar className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                </div>
              </div>
            )}
          </div>

          {/* Row: Financials (Total, Deposit, Calculated Remaining) */}
          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/70 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">إجمالي العينة</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="2500"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none tabular-nums"
                  />
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">العربون</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="500"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none tabular-nums"
                  />
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 flex justify-between items-center text-xs">
              <span className="text-muted-foreground">المتبقي بعد العربون:</span>
              <span className="font-bold text-foreground tabular-nums">
                {(() => {
                  const tot = Number(totalAmount || 0);
                  const dep = Number(depositAmount || 0);
                  return Math.max(0, tot - dep).toLocaleString();
                })()} ج.م
              </span>
            </div>
          </div>

          {/* Row 4: Material Source Toggle & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">مصدر الخامة</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMaterialSource('CUSTOMER')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    materialSource === 'CUSTOMER'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 font-semibold'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  خامة من العميل (CMT)
                </button>
                <button
                  type="button"
                  onClick={() => setMaterialSource('COMPANY')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    materialSource === 'COMPANY'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 font-semibold'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  خامة من عندنا (كامل)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">موعد تسليم العينة للعميل</label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                <Calendar className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Row 5: Stages Configuration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-foreground">مراحل تشغيل العينة المبسطة</label>
              <button
                type="button"
                onClick={handleAddStage}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> إضافة مرحلة
              </button>
            </div>
            <div className="space-y-2">
              {stages.map((st, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    value={st.name}
                    onChange={(e) => handleStageChange(idx, e.target.value)}
                    placeholder="اسم المرحلة"
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                  {stages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStage(idx)}
                      className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-muted"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Row 6: Design Notes */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              ملاحظات التصميم والمواصفات الفنية
            </label>
            <textarea
              rows={2}
              value={designNotes}
              onChange={(e) => setDesignNotes(e.target.value)}
              placeholder="تفاصيل التطريز، الطباعة، مواصفات خياطة الجيوب أو الباترون..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
          </div>

          {/* Row 7: Attachments (صور ومرفقات أولية) */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-primary" />
                <span>المرفقات وصور العينة الأولية</span>
                <span className="text-muted-foreground text-[10px]">(اختياري - صور / PDF)</span>
              </label>
              <label className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted cursor-pointer transition-colors flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                <span>اختيار ملفات</span>
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      const newFiles = Array.from(e.target.files);
                      setSelectedFiles((prev) => [...prev, ...newFiles]);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-background border border-border shadow-xs"
                  >
                    <span className="truncate max-w-[150px] font-medium">{file.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({Math.round(file.size / 1024)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-0.5 text-muted-foreground hover:text-rose-500 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {loading ? 'جاري الإنشاء...' : 'إنشاء أمر العينة (SMP)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
