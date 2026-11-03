import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Save,
  AlertCircle,
  Shirt,
  Calendar,
  DollarSign,
  Tag,
  User,
  Building2,
  Check,
  Plus,
  Trash2,
  Package,
  RotateCcw,
} from 'lucide-react';
import {
  manufacturingApi,
  SampleOrder,
  SampleOrderStatus,
  SampleMaterialSource,
  PartnerFactory,
  ProductOption,
  SampleOrderItem,
  SampleComponentInput,
  BillOfMaterials,
} from '../manufacturingApi';
import { DateInput } from '../../../components/ui/DateInput';

type TabKey = 'products' | 'materials' | 'costs' | 'factory';

interface SampleItemRow {
  productId: string;
  productName: string;
  productSearch: string;
  quantity: number;
  size: string;
  color: string;
}

interface SampleComponentRow {
  id?: string;
  productId: string;
  name: string;
  quantity: number | string;
  unit: string;
  unitPrice: number | string;
}

interface EditSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sample: SampleOrder | null;
  onUpdated: () => void;
}

export const EditSampleModal: React.FC<EditSampleModalProps> = ({
  isOpen,
  onClose,
  sample,
  onUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('products');
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

  // جدول الخامات (Task HZ-G)
  const [sampleComponents, setSampleComponents] = useState<SampleComponentRow[]>([]);
  const [activeCompDropdownIdx, setActiveCompDropdownIdx] = useState<number | null>(null);
  const compDropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const [brandName, setBrandName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [plannedQuantity, setPlannedQuantity] = useState<number>(1);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [materialSource, setMaterialSource] = useState<SampleMaterialSource>('CUSTOMER');
  const [fee, setFee] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<string>('0');
  const [partnerFactoryId, setPartnerFactoryId] = useState<string>('');
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [status, setStatus] = useState<SampleOrderStatus>('DRAFT');
  const [sampleReceived, setSampleReceived] = useState<boolean>(false);
  const [receivedAt, setReceivedAt] = useState<string>('');
  const [designNotes, setDesignNotes] = useState('');
  const [bomId, setBomId] = useState<string>('');

  // Factories list
  const [factories, setFactories] = useState<PartnerFactory[]>([]);
  // BOMs list
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);

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
      if (activeCompDropdownIdx !== null) {
        const rowRef = compDropdownRefs.current[activeCompDropdownIdx];
        if (rowRef && !rowRef.contains(e.target as Node)) {
          setActiveCompDropdownIdx(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeItemDropdownIdx, activeCompDropdownIdx]);

  useEffect(() => {
    if (isOpen) {
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
        .listPartnerFactories()
        .then((res: any) => {
          setFactories(Array.isArray(res) ? res : res?.items || []);
        })
        .catch(() => {});

      manufacturingApi
        .listBoms()
        .then((res: any) => {
          setBoms(Array.isArray(res) ? res : res?.items || []);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && sample) {
      setActiveTab('products');
      setProductId(sample.productId || '');
      setProductName(sample.productName || '');
      setProductSearch(sample.productName || '');
      setIsProductDropdownOpen(false);
      setBrandName(sample.brandName || '');
      setCustomerName(
        sample.customerName ||
          (sample.customer
            ? `${sample.customer.firstName ?? ''} ${sample.customer.lastName ?? ''}`.trim()
            : '')
      );
      setPlannedQuantity(sample.plannedQuantity ? Number(sample.plannedQuantity) : 1);
      setSize(sample.size || '');
      setColor(sample.color || '');
      setMaterialSource(sample.materialSource || 'CUSTOMER');
      setFee(sample.fee !== null && sample.fee !== undefined ? String(sample.fee) : '');
      setTotalAmount(
        sample.totalAmount !== null && sample.totalAmount !== undefined ? String(sample.totalAmount) : ''
      );
      setDepositAmount(
        sample.depositAmount !== null && sample.depositAmount !== undefined
          ? String(sample.depositAmount)
          : '0'
      );
      setPartnerFactoryId(sample.partnerFactoryId || '');
      setExpectedDeliveryAt(
        sample.expectedDeliveryAt ? new Date(sample.expectedDeliveryAt).toISOString().slice(0, 10) : ''
      );
      setDueDate(sample.dueDate ? new Date(sample.dueDate).toISOString().slice(0, 10) : '');
      setStatus(sample.status || 'DRAFT');
      setSampleReceived(Boolean(sample.sampleReceived));
      setReceivedAt(
        sample.receivedAt ? new Date(sample.receivedAt).toISOString().slice(0, 10) : ''
      );
      setDesignNotes(sample.designNotes || '');
      setBomId(sample.bomId || '');
      setError(null);

      // بنود المنتجات
      if (sample.items && sample.items.length > 0) {
        setSampleItems(
          sample.items.map((it) => ({
            productId: it.productId || '',
            productName: it.productName || '',
            productSearch: it.productName || '',
            quantity: it.quantity ? Number(it.quantity) : 1,
            size: it.size || '',
            color: it.color || '',
          }))
        );
      } else {
        setSampleItems([
          {
            productId: sample.productId || '',
            productName: sample.productName || '',
            productSearch: sample.productName || '',
            quantity: sample.plannedQuantity ? Number(sample.plannedQuantity) : 1,
            size: sample.size || '',
            color: sample.color || '',
          },
        ]);
      }
      setActiveItemDropdownIdx(null);

      // جدول الخامات (Task HZ-G)
      if (sample.components && sample.components.length > 0) {
        setSampleComponents(
          sample.components.map((c) => ({
            id: c.id,
            productId: c.productId || '',
            name: c.name || '',
            quantity: Number(c.quantity) || 1,
            unit: c.unit || 'قطعة',
            unitPrice: Number(c.unitPrice) || 0,
          }))
        );
      } else if (sample.id) {
        manufacturingApi
          .listSampleComponents(sample.id)
          .then((res) => {
            if (res && Array.isArray(res.components) && res.components.length > 0) {
              setSampleComponents(
                res.components.map((c) => ({
                  id: c.id,
                  productId: c.productId || '',
                  name: c.name || '',
                  quantity: Number(c.quantity) || 1,
                  unit: c.unit || 'قطعة',
                  unitPrice: Number(c.unitPrice) || 0,
                }))
              );
            } else {
              setSampleComponents([]);
            }
          })
          .catch(() => {
            setSampleComponents([]);
          });
      } else {
        setSampleComponents([]);
      }
      setActiveCompDropdownIdx(null);
    } else if (isOpen && !sample) {
      setActiveTab('products');
      setProductId('');
      setProductName('');
      setProductSearch('');
      setIsProductDropdownOpen(false);
      setBrandName('');
      setCustomerName('');
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
      setStatus('DRAFT');
      setSampleReceived(false);
      setReceivedAt('');
      setDesignNotes('');
      setBomId('');
      setError(null);
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
      setSampleComponents([]);
      setActiveItemDropdownIdx(null);
      setActiveCompDropdownIdx(null);
    }
  }, [sample, isOpen]);

  // ملء جدول الخامات تلقائيًا من BOM
  const populateFromBom = async (targetBomId: string, qty: number) => {
    try {
      const bomData = await manufacturingApi.getBomById(targetBomId);
      if (!bomData || !Array.isArray(bomData.components)) return;

      const baseQty = Number(bomData.baseQuantity) || 1;
      const orderQty = Math.max(1, Number(qty) || 1);
      const multiplier = orderQty / baseQty;

      const newRows: SampleComponentRow[] = bomData.components.map((c) => {
        const matchedProd = products.find(
          (p) =>
            p.id === c.rawMaterialId ||
            (c.rawMaterialName && p.name.trim().toLowerCase() === c.rawMaterialName.trim().toLowerCase())
        );
        const rawConsumption = Number(c.consumptionPerUnit) || 0;
        const calculatedQty = Math.round(rawConsumption * multiplier * 1000) / 1000;
        const unitCost =
          matchedProd?.cost !== undefined && matchedProd.cost !== null && Number(matchedProd.cost) > 0
            ? Number(matchedProd.cost)
            : 0;

        return {
          productId: matchedProd ? matchedProd.id : c.rawMaterialId || '',
          name: c.rawMaterialName || matchedProd?.name || 'خامة',
          quantity: calculatedQty > 0 ? calculatedQty : 1,
          unit: c.unit || 'قطعة',
          unitPrice: unitCost,
        };
      });

      setSampleComponents(newRows);
    } catch (err: any) {
      console.error('Failed to populate components from BOM', err);
    }
  };

  const handleBomChange = async (newBomId: string) => {
    setBomId(newBomId);
    if (!newBomId) return;

    if (sampleComponents.length > 0) {
      const ok = window.confirm('هل تريد استبدال بنود الخامات الحالية بمكونات قائمة BOM المختارة؟');
      if (!ok) return;
    }
    await populateFromBom(newBomId, plannedQuantity);
  };

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

  // إدارة جدول الخامات (Task HZ-G)
  const handleAddComponent = () => {
    setSampleComponents((prev) => [
      ...prev,
      {
        productId: '',
        name: '',
        quantity: 1,
        unit: 'قطعة',
        unitPrice: 0,
      },
    ]);
  };

  const handleRemoveComponent = (index: number) => {
    setSampleComponents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCompProductSelect = (index: number, p: ProductOption) => {
    const updated = [...sampleComponents];
    const unitPrice =
      p.cost !== undefined && p.cost !== null && Number(p.cost) > 0 ? Number(p.cost) : updated[index].unitPrice;
    updated[index] = {
      ...updated[index],
      productId: p.id,
      name: p.name,
      unitPrice,
    };
    setSampleComponents(updated);
    setActiveCompDropdownIdx(null);
  };

  const handleCompSearchChange = (index: number, text: string) => {
    const updated = [...sampleComponents];
    const matched = products.find((p) => p.name.trim().toLowerCase() === text.trim().toLowerCase());
    updated[index] = {
      ...updated[index],
      name: text,
      productId: matched ? matched.id : '',
      unitPrice:
        matched && matched.cost !== undefined && matched.cost !== null && Number(matched.cost) > 0
          ? Number(matched.cost)
          : updated[index].unitPrice,
    };
    setSampleComponents(updated);
    setActiveCompDropdownIdx(index);
  };

  const handleCompFieldChange = (
    index: number,
    field: 'quantity' | 'unit' | 'unitPrice',
    value: any
  ) => {
    const updated = [...sampleComponents];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setSampleComponents(updated);
  };

  const totalComponentsCost = useMemo(() => {
    return sampleComponents.reduce((acc, c) => {
      const q = Number(c.quantity) || 0;
      const p = Number(c.unitPrice) || 0;
      return acc + Math.round(q * p * 100) / 100;
    }, 0);
  }, [sampleComponents]);

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

  if (!isOpen || !sample) return null;

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

    // تحقق من بنود الخامات
    for (let i = 0; i < sampleComponents.length; i++) {
      const c = sampleComponents[i];
      if (!c.productId && !c.name.trim()) {
        setError(`اسم الخامة مطلوب للبند رقم ${i + 1} في جدول الخامات`);
        return;
      }
      if (Number(c.quantity) <= 0) {
        setError(`الكمية في جدول الخامات لازم تكون أكبر من صفر (البند رقم ${i + 1})`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const itemsPayload: SampleOrderItem[] = sampleItems.map((it, idx) => ({
        productId: it.productId || null,
        productName: it.productName.trim() || (products.find((p) => p.id === it.productId)?.name || 'منتج'),
        quantity: Math.max(1, Number(it.quantity) || 1),
        size: it.size ? it.size.trim().toUpperCase() : undefined,
        color: it.color ? it.color.trim().toUpperCase() : undefined,
        sortOrder: idx + 1,
      }));

      const componentsPayload: SampleComponentInput[] = sampleComponents.map((c, idx) => ({
        productId: c.productId || null,
        name: c.name.trim() || (products.find((p) => p.id === c.productId)?.name || 'خامة'),
        quantity: Number(c.quantity) || 1,
        unit: c.unit?.trim() || 'قطعة',
        unitPrice: Number(c.unitPrice) || 0,
        totalCost: Math.round((Number(c.quantity) || 0) * (Number(c.unitPrice) || 0) * 100) / 100,
        sortOrder: idx + 1,
      }));

      const payload: Partial<SampleOrder> & Record<string, any> = {
        productId: itemsPayload[0]?.productId || productId || undefined,
        productName: itemsPayload[0]?.productName || productName.trim(),
        items: itemsPayload,
        components: componentsPayload,
        customerName: customerName.trim() || undefined,
        brandName: brandName.trim() || undefined,
        plannedQuantity: Number(plannedQuantity) || 1,
        size: size.trim() || undefined,
        color: color.trim() || undefined,
        materialSource,
        bomId: bomId || undefined,
        fee: fee !== '' ? Number(fee) : undefined,
        totalAmount: totalAmount !== '' ? Number(totalAmount) : undefined,
        depositAmount: depositAmount !== '' ? Number(depositAmount) : 0,
        partnerFactoryId: partnerFactoryId || undefined,
        expectedDeliveryAt: expectedDeliveryAt || undefined,
        dueDate: dueDate || undefined,
        status,
        sampleReceived,
        receivedAt: sampleReceived ? (receivedAt ? new Date(receivedAt).toISOString() : new Date().toISOString()) : undefined,
        designNotes: designNotes.trim() || undefined,
      };

      await manufacturingApi.updateSampleOrder(sample.id, payload);
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error('Failed to update sample order', err);
      setError(err?.response?.data?.message || err?.message || 'تعذر تعديل أمر العينة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Shirt className="w-5 h-5 text-primary" />
              <span>
                تعديل أمر العينة: <span className="font-mono text-primary">{sample.sampleNumber}</span>
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              تعديل بيانات المنتج، العميل، التكاليف، والمصنع المنفذ
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (Task HZ-G) */}
        <div className="flex items-center gap-1 px-4 pt-2 border-b border-border/80 bg-muted/20">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'products'
                ? 'border-primary text-primary bg-background shadow-xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>المنتجات</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono">
              {sampleItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'materials'
                ? 'border-primary text-primary bg-background shadow-xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>الخامات</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-mono font-bold">
              {sampleComponents.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('costs')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'costs'
                ? 'border-primary text-primary bg-background shadow-xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>التكاليف</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('factory')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'factory'
                ? 'border-primary text-primary bg-background shadow-xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>المصنع والمواعيد</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: المنتجات */}
          {/* ========================================================================= */}
          {activeTab === 'products' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Combobox */}
                <div ref={productDropdownRef} className="relative md:col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                    <Shirt className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>المنتج التام (الأساسي) <span className="text-rose-500">*</span></span>
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
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
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

                {/* قسم منتجات العينة (Task HZ-E) */}
                <div className="md:col-span-2 p-3.5 rounded-xl border border-border/70 bg-muted/15 space-y-3">
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

                {/* Customer / Brand */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>اسم العميل</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="اسم العميل..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>اسم البراند التجاري</span>
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="مثال: Khemet, Nike..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Quantity, Size, Color */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1.5">الكمية والمقاس واللون</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min="1"
                      value={plannedQuantity}
                      onChange={(e) => setPlannedQuantity(parseInt(e.target.value, 10) || 1)}
                      placeholder="الكمية"
                      className="px-2 py-2 text-xs rounded-lg border border-border bg-background text-foreground text-center"
                    />
                    <input
                      type="text"
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      placeholder="المقاس (L)"
                      className="px-2 py-2 text-xs rounded-lg border border-border bg-background text-foreground text-center"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="اللون"
                      className="px-2 py-2 text-xs rounded-lg border border-border bg-background text-foreground text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: الخامات (جدول بنود الخامات الجديد - HZ-G) */}
          {/* ========================================================================= */}
          {activeTab === 'materials' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-primary" />
                    <span>جدول خامات ومستلزمات العينة</span>
                    <span className="text-[11px] font-mono text-muted-foreground">({sampleComponents.length})</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    اربط الأصناف بمنتجات المخزن أو اكتب اسم حر لخامات خارجية غير مسجلة
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* اختيار BOM أو سحب الخامات */}
                  <div className="flex items-center gap-1.5">
                    <select
                      value={bomId}
                      onChange={(e) => handleBomChange(e.target.value)}
                      className="px-2 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary outline-none max-w-[180px]"
                    >
                      <option value="">اختيار قائمة BOM...</option>
                      {boms.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} - {b.name}
                        </option>
                      ))}
                    </select>

                    {bomId && (
                      <button
                        type="button"
                        onClick={() => populateFromBom(bomId, plannedQuantity)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors"
                        title="إعادة ملء الخامات من BOM"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-primary" />
                        <span>سحب BOM</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddComponent}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة خامة</span>
                  </button>
                </div>
              </div>

              {sampleComponents.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-border/80 text-center space-y-2 bg-muted/5">
                  <Package className="w-8 h-8 text-muted-foreground/60 mx-auto" />
                  <p className="text-xs font-medium text-foreground">لا توجد خامات مضافة على العينة بعد</p>
                  <p className="text-[11px] text-muted-foreground">
                    اضغط «+ إضافة خامة» لإضافة بند يدوي، أو اختار قائمة BOM لملء الخامات تلقائيًا.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddComponent}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة أول خامة</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border/70 rounded-xl">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/70">
                      <tr>
                        <th className="py-2.5 px-3 min-w-[220px]">الصنف (منتج المخزن أو حر)</th>
                        <th className="py-2.5 px-2 w-28">الكمية</th>
                        <th className="py-2.5 px-2 w-28">الوحدة</th>
                        <th className="py-2.5 px-2 w-28">سعر الوحدة</th>
                        <th className="py-2.5 px-3 w-32">الإجمالي</th>
                        <th className="py-2.5 px-2 w-12 text-center">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 bg-card">
                      {sampleComponents.map((comp, idx) => {
                        const rowFilteredProducts = (() => {
                          const q = (comp.name || '').trim().toLowerCase();
                          if (!q) return products.slice(0, 8);
                          return products
                            .filter((p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)))
                            .slice(0, 8);
                        })();

                        const isDropdownOpen = activeCompDropdownIdx === idx;
                        const lineTotal =
                          Math.round((Number(comp.quantity) || 0) * (Number(comp.unitPrice) || 0) * 100) / 100;

                        return (
                          <tr key={idx} className="hover:bg-muted/20 transition-colors">
                            {/* الصنف (Combobox) */}
                            <td className="p-2 relative" ref={(el) => (compDropdownRefs.current[idx] = el)}>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={comp.name}
                                  onChange={(e) => handleCompSearchChange(idx, e.target.value)}
                                  onFocus={() => setActiveCompDropdownIdx(idx)}
                                  placeholder="ابحث عن منتج أو اكتب اسم..."
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary outline-none"
                                />
                              </div>

                              {isDropdownOpen && (
                                <div className="absolute z-40 top-full mt-1 right-2 left-2 bg-popover border border-border rounded-lg shadow-xl max-h-52 overflow-y-auto">
                                  {rowFilteredProducts.length === 0 ? (
                                    <div className="p-2 text-center text-[11px] text-muted-foreground">
                                      لا توجد نتائج — سيتم الحفظ كخامة حرة
                                    </div>
                                  ) : (
                                    rowFilteredProducts.map((p) => (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => handleCompProductSelect(idx, p)}
                                        className="w-full text-right px-3 py-1.5 text-xs flex items-center justify-between hover:bg-muted/70 transition-colors"
                                      >
                                        <div>
                                          <p className="font-medium">{p.name}</p>
                                          {p.sku && <p className="text-[10px] text-muted-foreground font-mono">كود: {p.sku}</p>}
                                        </div>
                                        {p.cost !== undefined && p.cost > 0 && (
                                          <span className="text-[10px] text-muted-foreground font-mono">
                                            {p.cost.toLocaleString()} ج.م
                                          </span>
                                        )}
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}

                              <div className="mt-1 flex items-center gap-1.5">
                                {comp.productId ? (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    مرتبط بالمخزن
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    غير مرتبط
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* الكمية */}
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.001"
                                min="0.001"
                                value={comp.quantity}
                                onChange={(e) => handleCompFieldChange(idx, 'quantity', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary outline-none tabular-nums"
                              />
                            </td>

                            {/* الوحدة */}
                            <td className="p-2">
                              <input
                                type="text"
                                value={comp.unit}
                                onChange={(e) => handleCompFieldChange(idx, 'unit', e.target.value)}
                                placeholder="متر / قطعة"
                                className="w-full px-2 py-1.5 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary outline-none"
                              />
                            </td>

                            {/* سعر الوحدة */}
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={comp.unitPrice}
                                onChange={(e) => handleCompFieldChange(idx, 'unitPrice', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary outline-none tabular-nums"
                              />
                            </td>

                            {/* الإجمالي */}
                            <td className="p-2 font-bold tabular-nums text-foreground">
                              {lineTotal.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                              ج.م
                            </td>

                            {/* حذف */}
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveComponent(idx)}
                                className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                title="حذف الخامة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Total Materials Cost Footer */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/70 text-xs">
                <span className="font-bold text-foreground">إجمالي تكلفة الخامات:</span>
                <span className="font-bold text-sm text-primary tabular-nums">
                  {totalComponentsCost.toLocaleString('en-EG', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  ج.م
                </span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: التكاليف */}
          {/* ========================================================================= */}
          {activeTab === 'costs' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Financials: Total, Fee, Deposit */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>إجمالي القيمة المطلوبة (ج.م)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>تكلفة إعداد العينة (ج.م)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>الدفعة المقدمة (ج.م)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Material Source */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">مصدر القماش والخامة</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMaterialSource('CUSTOMER')}
                      className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition ${
                        materialSource === 'CUSTOMER'
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      خامة العميل
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaterialSource('COMPANY')}
                      className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition ${
                        materialSource === 'COMPANY'
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      خامة من عندنا
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: المصنع والمواعيد */}
          {/* ========================================================================= */}
          {activeTab === 'factory' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Partner Factory */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>المصنع المنفذ للعينة</span>
                  </label>
                  <select
                    value={partnerFactoryId}
                    onChange={(e) => setPartnerFactoryId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">بدون مصنع (تنفيذ داخلي)</option>
                    {factories.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} {f.code ? `(${f.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">حالة العينة</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SampleOrderStatus)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="DRAFT">مسودة (Draft)</option>
                    <option value="IN_PROGRESS">قيد التنفيذ (In Progress)</option>
                    <option value="APPROVED">معتمدة جاهزة للتحويل (Approved)</option>
                    <option value="REJECTED">مرفوضة (Rejected)</option>
                    <option value="CANCELLED">ملغاة (Cancelled)</option>
                  </select>
                </div>

                {/* Expected Delivery & Due Date */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>تاريخ التسليم المتوقع</span>
                  </label>
                  <DateInput
                    
                    value={expectedDeliveryAt}
                    onChange={(e) => setExpectedDeliveryAt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>تاريخ الاستحقاق النهائي</span>
                  </label>
                  <DateInput
                    
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Sample Received Checkbox & Date */}
              <div className="p-3 bg-muted/40 rounded-lg border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={sampleReceived}
                    onChange={(e) => setSampleReceived(e.target.checked)}
                    className="w-4 h-4 rounded text-primary border-border focus:ring-primary/20"
                  />
                  <span>تم استلام العينة الفعلية من المصنع / الورشة</span>
                </label>
                {sampleReceived && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">تاريخ الاستلام:</span>
                    <DateInput
                      
                      value={receivedAt}
                      onChange={(e) => setReceivedAt(e.target.value)}
                      className="px-2 py-1 text-xs rounded border border-border bg-background text-foreground"
                    />
                  </div>
                )}
              </div>

              {/* Design Notes */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">ملاحظات ومواصفات العينة</label>
                <textarea
                  rows={3}
                  value={designNotes}
                  onChange={(e) => setDesignNotes(e.target.value)}
                  placeholder="تفاصيل التطريز، الطباعة، قياسات الباترون، أي مواصفات خاصة..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSampleModal;