import React from "react";
import {
  UserPlus,
  ChevronsUpDown,
  Search,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "../../../utils/currency";
import {
  Supplier,
  PurchaseOrderSummary,
  PurchaseInvoiceFormData,
} from "./types";
import { DateInput } from '../../ui/DateInput';

export interface InvoiceSupplierSectionProps {
  formData: PurchaseInvoiceFormData;
  setFormData: React.Dispatch<React.SetStateAction<PurchaseInvoiceFormData>>;
  selectedSupplier?: Supplier;
  suppliers: Supplier[];
  filteredSuppliers: Supplier[];
  supplierOrders: PurchaseOrderSummary[];
  supplierSearchOpen: boolean;
  setSupplierSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  supplierSearchQuery: string;
  setSupplierSearchQuery: (val: string) => void;
  supplierDropdownRef: React.RefObject<HTMLDivElement>;
  setIsQuickSupplierOpen: (open: boolean) => void;
  setQuickSupplierName: (name: string) => void;
  handleSelectPurchaseOrder: (poId: string) => void;
  t: (key: string, fallback: string) => string;
}

export const InvoiceSupplierSection: React.FC<InvoiceSupplierSectionProps> = ({
  formData,
  setFormData,
  selectedSupplier,
  suppliers,
  filteredSuppliers,
  supplierOrders,
  supplierSearchOpen,
  setSupplierSearchOpen,
  supplierSearchQuery,
  setSupplierSearchQuery,
  supplierDropdownRef,
  setIsQuickSupplierOpen,
  setQuickSupplierName,
  handleSelectPurchaseOrder,
  t,
}) => {
  return (
    <Card
      className="border border-border/70 shadow-2xs relative z-30 overflow-visible bg-card"
      size="sm"
    >
      <CardContent className="p-4 sm:p-5 space-y-4 overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Searchable Combobox for Supplier */}
          <div className="space-y-1.5 relative" ref={supplierDropdownRef}>
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-sm">
                {t("procurement.purchaseInvoiceForm.supplierLabel", "المورد *")}
              </Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => setIsQuickSupplierOpen(true)}
                className="p-0 h-auto text-xs text-primary font-medium flex items-center gap-1"
              >
                <UserPlus className="size-3.5" />
                + مورد جديد
              </Button>
            </div>

            {/* Trigger Input */}
            <div
              onClick={() => setSupplierSearchOpen((prev) => !prev)}
              className="flex items-center justify-between h-11 px-3.5 py-2 rounded-xl border border-input bg-background/80 hover:bg-accent/40 cursor-pointer transition-colors shadow-xs"
            >
              <div className="flex items-center gap-2 truncate">
                {selectedSupplier ? (
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold text-foreground text-sm">
                      {selectedSupplier.name}
                    </span>
                    {selectedSupplier.phone && (
                      <span className="text-xs text-muted-foreground font-mono">
                        ({selectedSupplier.phone})
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t(
                      "procurement.purchaseInvoiceForm.supplierPlaceholder",
                      "ابحث عن مورد بالاسم أو الهاتف...",
                    )}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="size-4 text-muted-foreground shrink-0" />
            </div>

            {/* Dropdown Menu with Instant Search */}
            {supplierSearchOpen && (
              <div className="absolute top-full start-0 min-w-full sm:min-w-[380px] md:min-w-[420px] max-w-[calc(100vw-2rem)] z-50 mt-1.5 rounded-xl border border-border bg-white dark:bg-zinc-900 shadow-2xl p-2 space-y-2 text-popover-foreground animate-in fade-in-0 zoom-in-95">
                <div className="relative">
                  <Search className="absolute end-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="اكتب اسم أو رقم هاتف المورد..."
                    value={supplierSearchQuery}
                    onChange={(e) => setSupplierSearchQuery(e.target.value)}
                    className="pe-9 h-9 text-xs rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1 overscroll-contain">
                  {filteredSuppliers.length === 0 ? (
                    <div className="text-center py-4 text-xs text-muted-foreground">
                      {suppliers.length === 0 ? (
                        <>
                          <p>لا يوجد أي مورد مسجل حالياً.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSupplierSearchOpen(false);
                              setIsQuickSupplierOpen(true);
                            }}
                            className="block mx-auto mt-2 text-primary font-semibold hover:underline"
                          >
                            + إضافة مورد جديد الآن
                          </button>
                        </>
                      ) : (
                        <>
                          <p>لا يوجد مورد مطابق للبحث.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSupplierSearchOpen(false);
                              setQuickSupplierName(supplierSearchQuery);
                              setIsQuickSupplierOpen(true);
                            }}
                            className="block mx-auto mt-2 text-primary font-semibold hover:underline"
                          >
                            + إضافة &quot;{supplierSearchQuery}&quot; كمورد جديد
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    filteredSuppliers.map((s) => {
                      const isSelected = s.id === formData.supplierId;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, supplierId: s.id }));
                            setSupplierSearchOpen(false);
                            setSupplierSearchQuery("");
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors text-start ${
                            isSelected
                              ? "bg-primary/10 text-primary font-semibold"
                              : "hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                            <span className="truncate">{s.name}</span>
                            {s.phone && (
                              <span className="text-[11px] text-muted-foreground font-mono">
                                ({s.phone})
                              </span>
                            )}
                          </div>
                          {s.currentBalance !== undefined && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium shrink-0 ${
                                Number(s.currentBalance) > 0
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              رصيد: {formatCurrency(s.currentBalance)}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Supplier Balance Info Banner */}
            {selectedSupplier && selectedSupplier.currentBalance !== undefined && (
              <div className="flex items-center justify-between text-xs bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-amber-700 dark:text-amber-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="size-3.5" />
                  الرصيد الحالي للمورد في الحسابات:
                </span>
                <strong className="font-mono font-bold text-sm tabular-nums">
                  {formatCurrency(selectedSupplier.currentBalance)}
                </strong>
              </div>
            )}
          </div>

          {/* Supplier Paper Invoice Reference */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {t(
                "procurement.purchaseInvoiceForm.invoiceNumberLabel",
                "رقم مرجع الفاتورة / الفاتورة الورقية",
              )}
            </Label>
            <Input
              className="h-11 rounded-xl"
              placeholder={t(
                "procurement.purchaseInvoiceForm.invoiceNumberPlaceholder",
                "مثال: INV-2024-001 (اختياري)",
              )}
              value={formData.referenceNumber}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, referenceNumber: e.target.value }))
              }
            />
          </div>

          {/* Linked Purchase Order (Optional) */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {t(
                "procurement.purchaseInvoiceForm.purchaseOrderLabel",
                "أمر الشراء المرتبط (اختياري)",
              )}
            </Label>
            <Select
              value={formData.purchaseOrderId}
              onValueChange={handleSelectPurchaseOrder}
              disabled={!formData.supplierId || supplierOrders.length === 0}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue
                  placeholder={
                    !formData.supplierId
                      ? "اختر المورد أولاً"
                      : supplierOrders.length === 0
                      ? "لا توجد أوامر شراء مفتوحة"
                      : t(
                          "procurement.purchaseInvoiceForm.purchaseOrderPlaceholder",
                          "اختر أمر شراء للاستيراد التلقائي",
                        )
                  }
                >
                  {supplierOrders.find((o) => o.id === formData.purchaseOrderId)?.orderNumber}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {supplierOrders.map((order) => (
                  <SelectItem key={order.id} value={order.id}>
                    <div className="flex items-center justify-between gap-3 w-full">
                      <span className="font-medium">{order.orderNumber}</span>
                      <span className="text-xs text-muted-foreground font-mono tabular-nums">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Invoice & Due Dates */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {t("procurement.purchaseInvoiceForm.invoiceDateLabel", "تاريخ الفاتورة")}
              </Label>
              <DateInput
                
                className="h-11 rounded-xl text-xs"
                value={formData.invoiceDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, invoiceDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {t("procurement.purchaseInvoiceForm.dueDateLabel", "تاريخ الاستحقاق")}
              </Label>
              <DateInput
                
                className="h-11 rounded-xl text-xs"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
