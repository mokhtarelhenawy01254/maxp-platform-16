import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle2, Factory, Shirt, Check, Plus, Trash2, Layers, Package } from 'lucide-react';
import {
  manufacturingApi,
  BillOfMaterials,
  VariantRequirementResolution,
  WarehouseOption,
  ProductionOrder,
  ProductionOrderType,
  ProductOption,
} from '../manufacturingApi';
import { WizardVariantMatrixStep } from './wizard/WizardVariantMatrixStep';
import { WizardRequirementsPreviewStep, WizardMaterialItem } from './wizard/WizardRequirementsPreviewStep';
import { DateInput } from '../../../components/ui/DateInput';

interface NewOrderWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (order: ProductionOrder) => void;
}

export interface OrderProductRow {
  rowId: string;
  productId: string;
  productSearch: string;
  bomId: string;
  matrix: Record<string, number>;
}

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const DEFAULT_COLORS = ['أسود', 'رمادي ميلانج', 'أبيض', 'كحلي'];

export const NewOrderWizardModal: React.FC<NewOrderWizardModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [customerOrders, setCustomerOrders] = useState<Array<{ id: string; orderNumber: string; brandName?: string | null }>>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-Product Rows State (Task HZ-I)
  const [rows, setRows] = useState<OrderProductRow[]>([
    { rowId: 'row-1', productId: '', productSearch: '', bomId: '', matrix: {} },
  ]);
  const [activeRowIdx, setActiveRowIdx] = useState<number>(0);
  const [openDropdownRowId, setOpenDropdownRowId] = useState<string | null>(null);
  const dropdownContainerRef = useRef<HTMLDivElement | null>(null);

  // Common Order Fields
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>('');
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Contract Manufacturing (Wave 1) Form State
  const [orderType, setOrderType] = useState<ProductionOrderType>('FULL_PACKAGE');
  const [customerId, setCustomerId] = useState<string>('');
  const [brandName, setBrandName] = useState<string>('');
  const [customerCountry, setCustomerCountry] = useState<string>('');
  const [salePricePerUnit, setSalePricePerUnit] = useState<number | ''>('');
  const [customerOrderId, setCustomerOrderId] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<string>('');

  // Resolved materials & editable table state (H4/H5) for single order path
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<VariantRequirementResolution | null>(null);
  const [materials, setMaterials] = useState<WizardMaterialItem[]>([]);
  const [lastResolvedQty, setLastResolvedQty] = useState<number>(0);
  const [hasUserModifiedMaterials, setHasUserModifiedMaterials] = useState<boolean>(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(e.target as Node)) {
        setOpenDropdownRowId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setActiveRowIdx(0);
      setOpenDropdownRowId(null);
      setCustomerId('');
      setBrandName('');
      setCustomerCountry('');
      setSalePricePerUnit('');
      setCustomerOrderId('');
      setDeliveryAddress('');
      setDeliveryMethod('');
      setDueDate('');
      setNotes('');
      setError(null);
      setResolved(null);
      setMaterials([]);
      setLastResolvedQty(0);
      setHasUserModifiedMaterials(false);

      setLoading(true);
      setProductsLoading(true);
      Promise.all([
        manufacturingApi.listBoms({ isActive: true }).catch(() => []),
        manufacturingApi.getWarehouses().catch(() => []),
        manufacturingApi.getCustomersList().catch(() => []),
        manufacturingApi.listCustomerOrders().catch(() => ({ items: [] })),
        manufacturingApi.getProducts().catch(() => []),
      ]).then(([bomsList, whList, custList, coList, prodList]) => {
        setBoms(bomsList);
        setWarehouses(whList);
        setCustomers(custList);
        setCustomerOrders(coList.items || []);
        const prods = Array.isArray(prodList) ? prodList : [];
        setProducts(prods);
        setProductsLoading(false);

        let initialBomId = '';
        let initialProdId = '';
        let initialProdName = '';
        if (bomsList.length > 0) {
          const firstBom = bomsList[0];
          initialBomId = firstBom.id;
          if (firstBom.productId) {
            initialProdId = firstBom.productId;
            const matched = prods.find((p) => p.id === firstBom.productId);
            if (matched) initialProdName = matched.name;
          }
        }

        setRows([
          {
            rowId: 'row-1',
            productId: initialProdId,
            productSearch: initialProdName,
            bomId: initialBomId,
            matrix: {},
          },
        ]);

        if (whList.length > 0) {
          setSourceWarehouseId(whList[0].id);
          if (whList.length > 1) {
            setTargetWarehouseId(whList[1].id);
          } else {
            setTargetWarehouseId(whList[0].id);
          }
        }
        setLoading(false);
      });
    }
  }, [isOpen]);

  // Calculations
  const totalPlannedQty = useMemo(() => {
    return rows.reduce((sum, r) => {
      const rSum = Object.values(r.matrix).reduce((s, q) => s + (q || 0), 0);
      return sum + rSum;
    }, 0);
  }, [rows]);

  const activeRow = rows[activeRowIdx] || rows[0];
  const activeBom = useMemo(() => {
    return boms.find((b) => b.id === activeRow?.bomId) || null;
  }, [boms, activeRow?.bomId]);

  const activeRowPlannedQty = useMemo(() => {
    if (!activeRow) return 0;
    return Object.values(activeRow.matrix).reduce((s, q) => s + (q || 0), 0);
  }, [activeRow]);

  const getVariantListForRow = (row: OrderProductRow) => {
    const list: Array<{ size: string; color: string; plannedQuantity: number; sku?: string }> = [];
    const b = boms.find((x) => x.id === row.bomId);
    Object.entries(row.matrix).forEach(([key, qty]) => {
      if (qty > 0) {
        const [size, color] = key.split('_');
        list.push({
          size,
          color,
          plannedQuantity: qty,
          sku: b ? `${b.code}-${size}-${color}` : undefined,
        });
      }
    });
    return list;
  };

  const getMatrixQty = (size: string, color: string) => {
    return activeRow?.matrix[`${size}_${color}`] || 0;
  };

  const setMatrixQty = (size: string, color: string, qty: number) => {
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== activeRowIdx) return r;
        return {
          ...r,
          matrix: {
            ...r.matrix,
            [`${size}_${color}`]: Math.max(0, qty),
          },
        };
      })
    );
  };

  const handleNextToStep2 = () => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.productId) {
        setError(`يرجى اختيار المنتج التام للبند رقم ${i + 1}`);
        return;
      }
      if (!r.bomId) {
        setError(`يرجى اختيار قائمة المكونات (BOM) للبند رقم ${i + 1}`);
        return;
      }
    }
    setError(null);
    setStep(2);
  };

  const handleNextToStep3 = async () => {
    if (totalPlannedQty <= 0) {
      setError('يرجى إدخال كمية مخططة واحدة على الأقل في مصفوفة المقاسات والألوان');
      return;
    }

    // Ensure all rows have planned quantity > 0
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rQty = Object.values(r.matrix).reduce((s, q) => s + (q || 0), 0);
      if (rQty <= 0) {
        const prod = products.find((p) => p.id === r.productId);
        setError(`المنتج "${prod?.name || r.productSearch || `رقم ${i + 1}`}" لا يحتوي على كميات مخططة. يرجى إدخال المقاسات`);
        setActiveRowIdx(i);
        return;
      }
    }

    setError(null);

    // If single order, resolve requirements exactly as before
    if (rows.length === 1) {
      setResolving(true);
      try {
        const singleVariants = getVariantListForRow(rows[0]);
        const res = await manufacturingApi.resolveVariantRequirements(rows[0].bomId, singleVariants);
        setResolved(res);

        const buildBomItem = (m: any, idx: number): WizardMaterialItem => {
          const matchedProd = products.find((p) => p.id === m.rawMaterialId);
          return {
            key: `bom_${m.rawMaterialId}_${idx}`,
            productId: matchedProd ? matchedProd.id : (products.some((p) => p.id === m.rawMaterialId) ? m.rawMaterialId : null),
            rawMaterialId: m.rawMaterialId,
            name: m.rawMaterialName || matchedProd?.name || m.rawMaterialId || 'خامة',
            plannedQuantity: m.totalRequiredQuantity,
            unit: m.unit || 'PIECE',
            unitCost: matchedProd?.cost || 0,
            source: 'BOM',
            sortOrder: idx + 1,
          };
        };

        if (materials.length === 0) {
          const initialMats = (res.aggregatedMaterials || []).map(buildBomItem);
          setMaterials(initialMats);
          setLastResolvedQty(totalPlannedQty);
          setHasUserModifiedMaterials(false);
        } else if (totalPlannedQty !== lastResolvedQty) {
          let shouldRecalc = true;
          if (hasUserModifiedMaterials) {
            shouldRecalc = window.confirm(
              'تم تعديل كميات المقاسات. هل ترغب في إعادة احتساب كميات بنود الـ BOM تلقائياً مع الإبقاء على البنود اليدوية؟'
            );
          }

          if (shouldRecalc) {
            const manualItems = materials.filter((m) => m.source === 'MANUAL');
            const updatedBomItems = (res.aggregatedMaterials || []).map((m, idx) => {
              const existingBomItem = materials.find((item) => item.source === 'BOM' && item.rawMaterialId === m.rawMaterialId);
              const matchedProd = products.find((p) => p.id === m.rawMaterialId);
              return {
                key: existingBomItem?.key || `bom_${m.rawMaterialId}_${idx}`,
                productId: existingBomItem?.productId || (matchedProd ? matchedProd.id : null),
                rawMaterialId: m.rawMaterialId,
                name: existingBomItem?.name || m.rawMaterialName || matchedProd?.name || m.rawMaterialId || 'خامة',
                plannedQuantity: m.totalRequiredQuantity,
                unit: existingBomItem?.unit || m.unit || 'PIECE',
                unitCost: existingBomItem?.unitCost !== undefined ? existingBomItem.unitCost : (matchedProd?.cost || 0),
                source: 'BOM' as const,
                sortOrder: idx + 1,
              };
            });

            const combined = [...updatedBomItems, ...manualItems].map((item, idx) => ({
              ...item,
              sortOrder: idx + 1,
            }));
            setMaterials(combined);
            setLastResolvedQty(totalPlannedQty);
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'فشل احتساب احتياجات الخامات');
        setResolving(false);
        return;
      } finally {
        setResolving(false);
      }
    }

    setStep(3);
  };

  const handleCreateOrder = async () => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.productId) {
        setError(`اختر المنتج التام للبند رقم ${i + 1} قبل إنشاء الأمر`);
        return;
      }
      if (!r.bomId) {
        setError(`اختر قائمة المكونات (BOM) للبند رقم ${i + 1} قبل إنشاء الأمر`);
        return;
      }
      const rSum = Object.values(r.matrix).reduce((s, q) => s + (q || 0), 0);
      if (rSum <= 0) {
        setError(`البند رقم ${i + 1} لا يحتوي على كميات مقاسات مدخلة`);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      if (rows.length === 1) {
        // Single Order: Exact legacy path (مسار الأمر الواحد القديم بالحرف)
        const row = rows[0];
        const singlePlannedQty = Object.values(row.matrix).reduce((s, q) => s + (q || 0), 0);
        const singleVariantList = getVariantListForRow(row);
        const b = boms.find((x) => x.id === row.bomId);

        const newOrder = await manufacturingApi.createOrder({
          bomId: row.bomId,
          productId: row.productId,
          plannedQuantity: singlePlannedQty,
          sourceWarehouseId: sourceWarehouseId || null,
          targetWarehouseId: targetWarehouseId || null,
          dueDate: dueDate || null,
          notes: notes || null,
          variantMatrix: singleVariantList,
          materials: materials.map((m, idx) => ({
            productId: m.productId || null,
            name: m.name,
            plannedQuantity: Number(m.plannedQuantity) || 0,
            unit: m.unit || 'PIECE',
            unitCost: Number(m.unitCost) || 0,
            source: m.source,
            sortOrder: idx + 1,
          })),
          stages: b?.standardStages || [],
          orderType,
          customerId: customerId || null,
          customerOrderId: customerOrderId || null,
          brandName: brandName.trim() || null,
          customerCountry: customerCountry.trim() || null,
          salePricePerUnit: salePricePerUnit !== '' ? Number(salePricePerUnit) : null,
          deliveryAddress: deliveryAddress.trim() || null,
          deliveryMethod: deliveryMethod.trim() || null,
        });

        alert('تم إنشاء أمر الإنتاج بنجاح');
        onCreated(newOrder);
        onClose();
      } else {
        // Multi-Product Order: createOrderBatch (أمر أب + أوامر فرعية)
        const batchItems = rows.map((r) => {
          const b = boms.find((x) => x.id === r.bomId);
          return {
            bomId: r.bomId,
            productId: r.productId,
            variantMatrix: getVariantListForRow(r),
            dueDate: dueDate || null,
            notes: notes || null,
            stages: b?.standardStages || [],
          };
        });

        const batchRes = await manufacturingApi.createOrderBatch({
          items: batchItems,
          customerId: customerId || null,
          customerOrderId: customerOrderId || null,
          brandName: brandName.trim() || null,
          orderType,
          sourceWarehouseId: sourceWarehouseId || null,
          targetWarehouseId: targetWarehouseId || null,
          startDate: null,
          dueDate: dueDate || null,
          notes: notes || null,
          customerCountry: customerCountry.trim() || null,
          salePricePerUnit: salePricePerUnit !== '' ? Number(salePricePerUnit) : null,
          deliveryAddress: deliveryAddress.trim() || null,
          deliveryMethod: deliveryMethod.trim() || null,
        });

        alert(`تم إنشاء ${batchRes.count || rows.length} أمر إنتاج بنجاح`);
        onCreated(batchRes.parent);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'فشل إنشاء أمر الإنتاج');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-xl bg-card border border-border/70 shadow-2xl overflow-hidden text-foreground">
        {/* Header */}
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Factory className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">معالج إنشاء أمر إنتاج جديد (Production Order Wizard)</h2>
              <p className="text-[11px] text-muted-foreground">
                دعم أكثر من منتج تام في أمر الإنتاج مع مصفوفة مقاسات مستقلة لكل منتج
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Steps Navigation */}
        <div className="px-5 py-3 border-b border-border/60 bg-muted/10 flex items-center justify-between text-xs shrink-0">
          <div className={`flex items-center gap-1.5 font-medium ${step >= 1 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</span>
            <span>منتجات الأمر والمواصفات</span>
          </div>
          <div className="h-0.5 w-12 bg-border/60" />
          <div className={`flex items-center gap-1.5 font-medium ${step >= 2 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</span>
            <span>مصفوفة المقاس واللون</span>
          </div>
          <div className="h-0.5 w-12 bg-border/60" />
          <div className={`flex items-center gap-1.5 font-medium ${step === 3 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>3</span>
            <span>المتطلبات والاعتماد</span>
          </div>
        </div>

        {/* Wizard Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-xs space-y-4" ref={dropdownContainerRef}>
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          {/* STEP 1: Finished Products & Specifications */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Product Rows Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span>منتجات الأمر (Finished Products)</span>
                    {rows.length > 1 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 font-mono">
                        {rows.length} منتجات تامة
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newRowId = `row-${Date.now()}-${rows.length + 1}`;
                      setRows((prev) => [
                        ...prev,
                        {
                          rowId: newRowId,
                          productId: '',
                          productSearch: '',
                          bomId: boms.length > 0 ? boms[0].id : '',
                          matrix: {},
                        },
                      ]);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة منتج</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {rows.map((row, idx) => {
                    const rowSelectedProd = products.find((p) => p.id === row.productId) || null;
                    const rowSelectedBom = boms.find((b) => b.id === row.bomId) || null;
                    const isDropdownOpen = openDropdownRowId === row.rowId;

                    const rowFilteredProducts = (() => {
                      const q = row.productSearch.trim().toLowerCase();
                      if (!q) return products.slice(0, 8);
                      return products
                        .filter((p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)))
                        .slice(0, 8);
                    })();

                    return (
                      <div
                        key={row.rowId}
                        className="p-3 rounded-xl border border-border/80 bg-muted/10 space-y-3 relative transition-all"
                      >
                        {rows.length > 1 && (
                          <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                            <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              <span>المنتج رقم {idx + 1}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (rows.length <= 1) return;
                                setRows((prev) => prev.filter((r) => r.rowId !== row.rowId));
                                if (activeRowIdx >= rows.length - 1) {
                                  setActiveRowIdx(Math.max(0, rows.length - 2));
                                }
                              }}
                              className="text-destructive hover:text-destructive/80 p-1 rounded hover:bg-destructive/10 transition"
                              title="حذف هذا المنتج من أمر الإنتاج"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Product Picker */}
                          <div className="relative">
                            <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                              <Shirt className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>المنتج التام <span className="text-rose-500">*</span></span>
                            </label>
                            <input
                              type="text"
                              value={row.productSearch}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRows((prev) =>
                                  prev.map((r) => (r.rowId === row.rowId ? { ...r, productSearch: val, productId: '' } : r))
                                );
                                setOpenDropdownRowId(row.rowId);
                              }}
                              onFocus={() => setOpenDropdownRowId(row.rowId)}
                              placeholder="ابحث واختر المنتج التام..."
                              className="w-full p-2.5 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                            />

                            {/* Dropdown list */}
                            {isDropdownOpen && (
                              <div className="absolute z-40 top-full mt-1 right-0 left-0 bg-popover border border-border rounded-lg shadow-xl max-h-56 overflow-y-auto">
                                {productsLoading ? (
                                  <div className="p-3 text-center text-xs text-muted-foreground">جاري تحميل المنتجات...</div>
                                ) : rowFilteredProducts.length === 0 ? (
                                  <div className="p-3 text-center text-xs text-muted-foreground">
                                    {products.length === 0 ? 'لا توجد منتجات مسجلة' : 'لا توجد نتائج مطابقة'}
                                  </div>
                                ) : (
                                  rowFilteredProducts.map((p) => {
                                    const isSelected = p.id === row.productId;
                                    return (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                          setRows((prev) =>
                                            prev.map((r) =>
                                              r.rowId === row.rowId
                                                ? {
                                                    ...r,
                                                    productId: p.id,
                                                    productSearch: p.name,
                                                  }
                                                : r
                                            )
                                          );
                                          setOpenDropdownRowId(null);
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

                            {rowSelectedProd && (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                                المنتج المختار: {rowSelectedProd.name} {rowSelectedProd.sku ? `(كود: ${rowSelectedProd.sku})` : ''}
                              </p>
                            )}
                          </div>

                          {/* BOM Selector */}
                          <div>
                            <label className="block text-xs font-bold text-foreground mb-1">
                              قائمة المكونات (BOM) <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={row.bomId}
                              onChange={(e) => {
                                const newBomId = e.target.value;
                                setRows((prev) =>
                                  prev.map((r) => {
                                    if (r.rowId !== row.rowId) return r;
                                    const b = boms.find((x) => x.id === newBomId);
                                    let newProdId = r.productId;
                                    let newProdSearch = r.productSearch;
                                    if (b?.productId && !r.productId) {
                                      newProdId = b.productId;
                                      const matched = products.find((p) => p.id === b.productId);
                                      if (matched) newProdSearch = matched.name;
                                    }
                                    return {
                                      ...r,
                                      bomId: newBomId,
                                      productId: newProdId,
                                      productSearch: newProdSearch,
                                    };
                                  })
                                );
                              }}
                              className="w-full p-2.5 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                            >
                              <option value="">-- اختر قائمة مكونات معتمدة --</option>
                              {boms.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.code} — {b.name} (v{b.version})
                                </option>
                              ))}
                            </select>

                            {rowSelectedBom && (
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                                <span>هالك: <strong className="text-foreground">{rowSelectedBom.wasteMarginPercent}%</strong></span>
                                <span>عمالة: <strong className="text-foreground">{rowSelectedBom.laborCostPerUnit} ج.م</strong></span>
                                <span>MOH: <strong className="text-foreground">{rowSelectedBom.overheadCostPerUnit} ج.م</strong></span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Warehouses Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">مستودع صرف الخامات</label>
                  <select
                    value={sourceWarehouseId}
                    onChange={(e) => setSourceWarehouseId(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none"
                  >
                    <option value="">-- المستودع الافتراضي --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">مستودع استلام الإنتاج التام</label>
                  <select
                    value={targetWarehouseId}
                    onChange={(e) => setTargetWarehouseId(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none"
                  >
                    <option value="">-- المستودع الافتراضي --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contract Manufacturing Section */}
              <div className="p-3 rounded-xl bg-card border border-border/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="font-bold text-foreground text-xs">بيانات التعاقد والتصنيع للغير (مشتركة للأمر)</span>
                  <span className="text-[10px] text-muted-foreground">Contract Manufacturing</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">نمط وأسلوب التصنيع</label>
                    <select
                      value={orderType}
                      onChange={(e) => setOrderType(e.target.value as ProductionOrderType)}
                      className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none font-medium"
                    >
                      <option value="FULL_PACKAGE">حزمة كاملة (Full Package — قماش وتصنيع)</option>
                      <option value="CMT">تشغيل للغير (CMT — قص وخياطة فقط)</option>
                      <option value="CUSTOMER_MATERIALS">تشغيل بخامات العميل</option>
                      <option value="OUTSOURCED">تشغيل خارجي لدى الغير</option>
                      <option value="SAMPLE">عينة / بروتوتايب (Sample)</option>
                      <option value="REWORK">إعادة تشغيل (Rework)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">اختيار العميل من النظام</label>
                    <select
                      value={customerId}
                      onChange={(e) => {
                        setCustomerId(e.target.value);
                        const cust = customers.find((c) => c.id === e.target.value);
                        if (cust && !brandName) setBrandName(cust.name);
                      }}
                      className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none"
                    >
                      <option value="">-- أمر إنتاج داخلي / بدون عميل --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">اسم البراند / العلامة التجارية</label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="Brand X..."
                      className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">دولة العميل / التصدير</label>
                    <input
                      type="text"
                      value={customerCountry}
                      onChange={(e) => setCustomerCountry(e.target.value)}
                      placeholder="مصر، السعودية..."
                      className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">سعر بيع القطعة للعميل (ج.م)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={salePricePerUnit}
                      onChange={(e) => setSalePricePerUnit(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                      placeholder="150..."
                      className="w-full p-2 text-xs font-mono font-bold rounded-lg border border-border bg-background focus:outline-none tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">ربط بأمر عميل أب قائم (Customer Order)</label>
                    <select
                      value={customerOrderId}
                      onChange={(e) => setCustomerOrderId(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none"
                    >
                      <option value="">-- بدون ربط بأمر عميل أب --</option>
                      {customerOrders.map((co) => (
                        <option key={co.id} value={co.id}>
                          {co.orderNumber} {co.brandName ? `(${co.brandName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">طريقة التسليم والشحن</label>
                    <input
                      type="text"
                      value={deliveryMethod}
                      onChange={(e) => setDeliveryMethod(e.target.value)}
                      placeholder="استلام من المصنع، شحن بوسطة، شحن جوي..."
                      className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">عنوان ومكان التسليم</label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="عنوان مقر العميل، المستودع، أو منفذ الشحن..."
                    className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none"
                  />
                </div>
              </div>

              {/* Dates & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">تاريخ التسليم المستهدف</label>
                  <DateInput
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">ملاحظات التشغيل والطلب</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="تشغيل لصالح الموسم الشتوي، أوردر عاجل..."
                    className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Size x Color Matrix (Tabs for Multiple Products) */}
          {step === 2 && (
            <div className="space-y-3">
              {rows.length > 1 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-muted-foreground">
                    اختر المنتج لإدخال وتعديل مصفوفة المقاسات والألوان الخاصة به:
                  </div>
                  <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/60 overflow-x-auto">
                    {rows.map((r, idx) => {
                      const prod = products.find((p) => p.id === r.productId);
                      const rowTotal = Object.values(r.matrix).reduce((s, q) => s + (q || 0), 0);
                      const isCurrent = idx === activeRowIdx;
                      return (
                        <button
                          key={r.rowId}
                          type="button"
                          onClick={() => setActiveRowIdx(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition shrink-0 ${
                            isCurrent
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                        >
                          <span>{prod?.name || r.productSearch || `منتج ${idx + 1}`}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                              isCurrent ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {rowTotal} قطعة
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <WizardVariantMatrixStep
                selectedBom={activeBom}
                totalPlannedQty={activeRowPlannedQty}
                sizes={DEFAULT_SIZES}
                colors={DEFAULT_COLORS}
                getMatrixQty={getMatrixQty}
                setMatrixQty={setMatrixQty}
              />

              {rows.length > 1 && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between text-xs">
                  <span className="font-semibold text-purple-900 dark:text-purple-300">
                    إجمالي الكمية المخططة لجميع المنتجات ({rows.length} منتجات):
                  </span>
                  <span className="font-mono font-bold text-sm text-purple-700 dark:text-purple-300">
                    {totalPlannedQty} قطعة
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Requirements & Confirmation */}
          {step === 3 && (
            <div>
              {rows.length === 1 ? (
                <WizardRequirementsPreviewStep
                  selectedBom={activeBom}
                  totalPlannedQty={totalPlannedQty}
                  variantCount={getVariantListForRow(rows[0]).length}
                  resolved={resolved}
                  materials={materials}
                  onChangeMaterials={(mats) => {
                    setMaterials(mats);
                    setHasUserModifiedMaterials(true);
                  }}
                  products={products}
                />
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-purple-950 dark:text-purple-200">
                        ملخص أمر الإنتاج المجمع بأكثر من منتج تام
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-600 text-white">
                        إجمالي {totalPlannedQty} قطعة
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-900/80 dark:text-purple-300/80">
                      سيتم إنشاء أمر إنتاج رئيسي تجميعي بالإضافة إلى {rows.length} أوامر فرعية، بحيث يحصل كل منتج تام على أمر إنتاج مستقل بـ BOM ومصفوفة المقاسات الخاصة به.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {rows.map((r, idx) => {
                      const prod = products.find((p) => p.id === r.productId);
                      const b = boms.find((x) => x.id === r.bomId);
                      const rowTotal = Object.values(r.matrix).reduce((s, q) => s + (q || 0), 0);
                      const vList = getVariantListForRow(r);

                      return (
                        <div key={r.rowId} className="p-3.5 rounded-xl border border-border bg-card space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-sm text-foreground">{prod?.name || r.productSearch}</span>
                              {prod?.sku && <span className="font-mono text-[11px] text-muted-foreground">({prod.sku})</span>}
                            </div>
                            <span className="font-mono font-bold text-xs text-primary">{rowTotal} قطعة</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground bg-muted/20 p-2 rounded-lg">
                            <div>قائمة المكونات: <strong className="text-foreground">{b?.name} ({b?.code})</strong></div>
                            <div>عدد تشكيلات المقاس واللون: <strong className="text-foreground">{vList.length} تشكيلة</strong></div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {vList.map((v, vIdx) => (
                              <span
                                key={vIdx}
                                className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-muted/50 border border-border/70 text-foreground"
                              >
                                {v.size} / {v.color}: <strong>{v.plannedQuantity}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 border-t border-border/60 flex items-center justify-between bg-muted/20 shrink-0">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition text-xs font-semibold"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>الخطوة السابقة</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition text-xs font-medium"
            >
              إلغاء
            </button>

            {step === 1 && (
              <button
                type="button"
                onClick={handleNextToStep2}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition shadow-sm"
              >
                <span>متابعة لمصفوفة المقاسات</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                disabled={totalPlannedQty <= 0 || resolving}
                onClick={handleNextToStep3}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
              >
                <span>{resolving ? 'جارٍ احتساب الخامات...' : 'معاينة واعتماد الأمر'}</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                disabled={loading}
                onClick={handleCreateOrder}
                className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition shadow-md disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {loading
                    ? 'جارٍ إنشاء أمر التشغيل...'
                    : rows.length > 1
                    ? `اعتماد وإنشاء ${rows.length} أوامر إنتاج`
                    : 'اعتماد وإنشاء أمر الإنتاج'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewOrderWizardModal;
