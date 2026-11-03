import React from "react";
import { CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "../../../utils/currency";
import { PAYMENT_METHODS } from "./constants";
import {
  Supplier,
  PurchaseInvoiceSummary,
  SupplierPaymentFormData,
} from "./types";
import { DateInput } from '../../ui/DateInput';

interface PaymentMethodSectionProps {
  formData: SupplierPaymentFormData;
  setFormData: React.Dispatch<React.SetStateAction<SupplierPaymentFormData>>;
  selectedSupplier?: Supplier;
  selectedInvoice?: PurchaseInvoiceSummary;
  supplierBalance: number;
}

export const PaymentMethodSection: React.FC<PaymentMethodSectionProps> = ({
  formData,
  setFormData,
  selectedSupplier,
  selectedInvoice,
  supplierBalance,
}) => {
  return (
    <Card className="border border-border/70 shadow-2xs bg-card" size="sm">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <CreditCard className="size-4 text-primary" />
          المبلغ وطريقة الصرف
        </h3>

        {/* Amount Input and Quick Buttons */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">قيمة المبلغ المنصرف (ج.م) *</Label>
          <Input
            type="number"
            min="1"
            step="any"
            required
            placeholder="0.00"
            value={formData.amount}
            onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
            className="h-12 text-xl font-bold font-mono text-primary rounded-xl tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          {/* Quick Amount Helper Buttons */}
          {selectedSupplier && supplierBalance > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, amount: String(supplierBalance) }))
                }
                className="text-xs rounded-lg h-7 font-mono tabular-nums"
              >
                سداد الرصيد كاملاً ({formatCurrency(supplierBalance)})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    amount: String(Math.round(supplierBalance / 2)),
                  }))
                }
                className="text-xs rounded-lg h-7 font-mono tabular-nums"
              >
                سداد 50% ({formatCurrency(Math.round(supplierBalance / 2))})
              </Button>
              {selectedInvoice && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      amount: String(selectedInvoice.remainingAmount),
                    }))
                  }
                  className="text-xs rounded-lg h-7 font-mono text-primary tabular-nums"
                >
                  متبقي الفاتورة ({formatCurrency(selectedInvoice.remainingAmount)})
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Payment Method Selector Grid */}
        <div className="space-y-2 pt-2">
          <Label className="text-xs font-semibold text-muted-foreground">طريقة الدفع:</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              const isSelected = formData.paymentMethod === method.value;
              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, paymentMethod: method.value }))
                  }
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all text-start ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary shadow-xs font-bold"
                      : "border-border/80 bg-background/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{method.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conditional fields based on Payment Method */}
        {(formData.paymentMethod === "BANK_TRANSFER" ||
          formData.paymentMethod === "INSTAPAY") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-border/60 animate-in fade-in-0 duration-150">
            <div className="space-y-1">
              <Label className="text-xs">اسم البنك / جهة التحويل</Label>
              <Input
                placeholder="مثال: البنك الأهلي المصري / CIB"
                value={formData.bankName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bankName: e.target.value }))
                }
                className="h-9 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">رقم الحوالة / المرجع الإلكتروني</Label>
              <Input
                placeholder="مثال: TRX-8921820"
                value={formData.referenceNumber}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, referenceNumber: e.target.value }))
                }
                className="h-9 text-xs rounded-lg font-mono"
              />
            </div>
          </div>
        )}

        {formData.paymentMethod === "CHECK" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-muted/30 border border-border/60 animate-in fade-in-0 duration-150">
            <div className="space-y-1">
              <Label className="text-xs">رقم الشيك *</Label>
              <Input
                required
                placeholder="0001234"
                value={formData.checkNumber}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, checkNumber: e.target.value }))
                }
                className="h-9 text-xs rounded-lg font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">تاريخ استحقاق الشيك</Label>
              <DateInput
                
                value={formData.checkDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, checkDate: e.target.value }))
                }
                className="h-9 text-xs rounded-lg font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">البنك المسحوب عليه</Label>
              <Input
                placeholder="اسم البنك"
                value={formData.bankName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bankName: e.target.value }))
                }
                className="h-9 text-xs rounded-lg"
              />
            </div>
          </div>
        )}

        {/* General Reference / Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <Label className="text-xs">رقم الإيصال الورقي / المرجع (اختياري)</Label>
            <Input
              placeholder="رقم سند القبض لدى المورد أو رقم الإيصال"
              value={formData.referenceNumber}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, referenceNumber: e.target.value }))
              }
              className="h-9 text-xs rounded-lg"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ملاحظات السداد</Label>
            <Input
              placeholder="أي تفاصيل خاصة بالحساب أو التسليم"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              className="h-9 text-xs rounded-lg"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
