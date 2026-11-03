import React from "react";
import {
  UserPlus,
  ChevronsUpDown,
  Search,
  Check,
  AlertCircle,
  Calendar,
  Receipt,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  PurchaseInvoiceSummary,
  SupplierPaymentFormData,
} from "./types";
import { DateInput } from '../../ui/DateInput';

interface PaymentSupplierInvoiceSectionProps {
  formData: SupplierPaymentFormData;
  setFormData: React.Dispatch<React.SetStateAction<SupplierPaymentFormData>>;
  suppliers: Supplier[];
  supplierInvoices: PurchaseInvoiceSummary[];
  selectedSupplier?: Supplier;
  selectedInvoice?: PurchaseInvoiceSummary;
  filteredSuppliers: Supplier[];
  supplierBalance: number;
  supplierSearchOpen: boolean;
  setSupplierSearchOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  supplierSearchQuery: string;
  setSupplierSearchQuery: (query: string) => void;
  supplierDropdownRef: React.RefObject<HTMLDivElement | null>;
  onOpenQuickSupplier: (initialName?: string) => void;
}

export const PaymentSupplierInvoiceSection: React.FC<
  PaymentSupplierInvoiceSectionProps
> = ({
  formData,
  setFormData,
  suppliers,
  supplierInvoices,
  selectedSupplier,
  selectedInvoice,
  filteredSuppliers,
  supplierBalance,
  supplierSearchOpen,
  setSupplierSearchOpen,
  supplierSearchQuery,
  setSupplierSearchQuery,
  supplierDropdownRef,
  onOpenQuickSupplier,
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
              <Label className="font-semibold text-sm">المورد المستفيد *</Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => onOpenQuickSupplier()}
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
                    اختر المورد المراد السداد له...
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
                              onOpenQuickSupplier();
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
                              onOpenQuickSupplier(supplierSearchQuery);
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
                            setFormData((prev) => ({
                              ...prev,
                              supplierId: s.id,
                              purchaseInvoiceId: "",
                            }));
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
                            {isSelected && (
                              <Check className="size-3.5 text-primary shrink-0" />
                            )}
                            <span className="truncate">{s.name}</span>
                            {s.phone && (
                              <span className="text-[11px] text-muted-foreground font-mono">
                                ({s.phone})
                              </span>
                            )}
                          </div>
                          {s.currentBalance !== undefined && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium shrink-0 tabular-nums ${
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
            {selectedSupplier && (
              <div className="flex items-center justify-between text-xs bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-amber-700 dark:text-amber-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="size-3.5" />
                  الرصيد المستحق للمورد في الحسابات:
                </span>
                <strong className="font-mono font-bold text-sm tabular-nums">
                  {formatCurrency(supplierBalance)}
                </strong>
              </div>
            )}
          </div>

          {/* Payment Date */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <Calendar className="size-3.5 text-primary" />
              تاريخ الصرف والسداد *
            </Label>
            <DateInput
              
              required
              className="h-11 rounded-xl font-mono"
              value={formData.paymentDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, paymentDate: e.target.value }))
              }
            />
          </div>
        </div>

        {/* Optional Invoice Allocation Dropdown */}
        <div className="space-y-1.5 pt-2 border-t border-border/50">
          <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Receipt className="size-3.5 text-primary" />
            تخصيص السداد مقابل فاتورة معينة (اختياري):
          </Label>
          <Select
            value={formData.purchaseInvoiceId || "GENERAL"}
            onValueChange={(val) => {
              if (val === "GENERAL") {
                setFormData((prev) => ({ ...prev, purchaseInvoiceId: "" }));
              } else {
                const inv = supplierInvoices.find((i) => i.id === val);
                setFormData((prev) => ({
                  ...prev,
                  purchaseInvoiceId: val,
                  amount: inv ? String(inv.remainingAmount) : prev.amount,
                }));
              }
            }}
            disabled={!formData.supplierId}
          >
            <SelectTrigger className="h-10 rounded-xl text-xs">
              <SelectValue placeholder="اختر الفاتورة..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GENERAL">
                سداد عام على الحساب (غير مخصص لفاتورة محددة)
              </SelectItem>
              {supplierInvoices.map((inv) => (
                <SelectItem key={inv.id} value={inv.id}>
                  <div className="flex items-center justify-between gap-4 w-full">
                    <span className="font-mono font-semibold">
                      {inv.invoiceNumber}
                    </span>
                    <span className="text-xs text-amber-600 font-mono tabular-nums">
                      متبقي: {formatCurrency(inv.remainingAmount)}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedInvoice && (
            <div className="flex justify-between items-center text-xs bg-muted/60 p-2 rounded-xl text-muted-foreground font-mono">
              <span className="tabular-nums">
                إجمالي الفاتورة: {formatCurrency(selectedInvoice.totalAmount)}
              </span>
              <span className="tabular-nums">
                سُدد سابقاً: {formatCurrency(selectedInvoice.paidAmount)}
              </span>
              <strong className="text-primary tabular-nums">
                المتبقي: {formatCurrency(selectedInvoice.remainingAmount)}
              </strong>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
