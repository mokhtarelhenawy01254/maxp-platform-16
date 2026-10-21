import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PackageCheck, AlertCircle, Loader2 } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { companyAwareApi } from "../../services/companyAwareApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface PurchaseOrderItemData {
  id: string;
  productId?: string | null;
  variantId?: string | null;
  productName: string;
  quantity: number | string;
  receivedQuantity: number | string;
  unitPrice: number | string;
  notes?: string | null;
  product?: {
    id: string;
    name: string;
    sku?: string | null;
    stock?: number;
  } | null;
}

export interface PurchaseOrderData {
  id: string;
  orderNumber: string;
  status: string;
  purchaseOrderItems: PurchaseOrderItemData[];
}

interface Warehouse {
  id: string;
  name: string;
  code?: string;
  isDefault?: boolean;
}

interface ItemRowState {
  itemId: string;
  variantId?: string | null;
  productName: string;
  sku?: string | null;
  ordered: number;
  receivedBefore: number;
  remaining: number;
  receivedNow: string;
  updateInventory: boolean;
  warehouseId: string;
}

interface ReceiveItemsDialogProps {
  open: boolean;
  onClose: () => void;
  order: PurchaseOrderData | null;
  onSuccess: (updatedOrder?: unknown) => void;
}

export const ReceiveItemsDialog: React.FC<ReceiveItemsDialogProps> = ({
  open,
  onClose,
  order,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [defaultWarehouseId, setDefaultWarehouseId] = useState<string>("");
  const [receivedDate, setReceivedDate] = useState<string>(
    new Date().toISOString().split("T")[0] ?? "",
  );
  const [rows, setRows] = useState<ItemRowState[]>([]);

  // Fetch warehouses using existing companyAwareApi
  useEffect(() => {
    if (!open) return;
    const fetchWarehouses = async () => {
      setLoadingWarehouses(true);
      try {
        const res = await companyAwareApi.get<{
          success?: boolean;
          data?: Warehouse[];
        }>("/warehouses");
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? (res.data as unknown as Warehouse[])
          : [];
        setWarehouses(list);
        if (list.length > 0 && !defaultWarehouseId) {
          const def = list.find((w) => w.isDefault) || list[0];
          if (def) {
            setDefaultWarehouseId(def.id);
          }
        }
      } catch (err) {
        console.error("Error fetching warehouses for receiving:", err);
      } finally {
        setLoadingWarehouses(false);
      }
    };
    fetchWarehouses();
  }, [open]);

  // Initialize rows from order items
  useEffect(() => {
    if (!open || !order) {
      setRows([]);
      setErrorMessage(null);
      return;
    }
    const initialRows: ItemRowState[] = order.purchaseOrderItems.map((item) => {
      const ordered = parseFloat(String(item.quantity)) || 0;
      const receivedBefore = parseFloat(String(item.receivedQuantity)) || 0;
      const remaining = Math.max(0, ordered - receivedBefore);
      const variantId =
        item.variantId ||
        (item.notes || "").match(/\[variantId:([^\]]+)\]/)?.[1] ||
        null;
      return {
        itemId: item.id,
        variantId,
        productName: item.productName || item.product?.name || "صنف",
        sku: item.product?.sku || null,
        ordered,
        receivedBefore,
        remaining,
        receivedNow: remaining > 0 ? String(remaining) : "0",
        updateInventory: Boolean(item.productId || variantId),
        warehouseId: defaultWarehouseId,
      };
    });
    setRows(initialRows);
    setErrorMessage(null);
  }, [open, order, defaultWarehouseId]);

  const handleRowChange = (
    index: number,
    field: keyof ItemRowState,
    value: unknown,
  ) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value } as ItemRowState;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setErrorMessage(null);

    // Validation: ensure quantities are valid and not all 0
    let totalReceiveNow = 0;
    for (const row of rows) {
      const qty = parseFloat(row.receivedNow);
      if (isNaN(qty) || qty < 0) {
        setErrorMessage(
          t(
            "procurement.receiveItemsDialog.invalidQuantity",
            "يرجى إدخال كميات استلام صحيحة",
          ),
        );
        return;
      }
      if (qty > row.remaining) {
        setErrorMessage(
          `${t(
            "procurement.receiveItemsDialog.maxQuantityError",
            "لا يمكن استلام كمية أكبر من المتبقي",
          )} (${row.productName})`,
        );
        return;
      }
      totalReceiveNow += qty;
    }

    if (totalReceiveNow <= 0) {
      setErrorMessage(
        t(
          "procurement.receiveItemsDialog.noItemsError",
          "يرجى إدخال كمية استلام لصنف واحد على الأقل",
        ),
      );
      return;
    }

    const payloadItems = rows
      .filter((r) => parseFloat(r.receivedNow) > 0)
      .map((r) => ({
        itemId: r.itemId,
        variantId: r.variantId || undefined,
        receivedQuantity: parseFloat(r.receivedNow),
        updateInventory: r.updateInventory,
        warehouseId: r.warehouseId || defaultWarehouseId || undefined,
      }));

    const payload = {
      items: payloadItems,
      warehouseId: defaultWarehouseId || undefined,
      receivedDate: receivedDate || new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      const res = await apiClient.post<{ order?: unknown }>(
        `/procurement/purchase-orders/${order.id}/receive`,
        payload,
      );
      onSuccess(res.data?.order);
      onClose();
    } catch (err: unknown) {
      console.error("Error receiving items:", err);
      const errResp = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        errResp.response?.data?.message ||
        errResp.message ||
        "حدث خطأ أثناء حفظ الاستلام";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <PackageCheck className="size-5 text-primary" />
            {t("procurement.receiveItemsDialog.title", "استلام أصناف أمر الشراء")}
            {order && (
              <span className="text-sm font-mono font-normal text-muted-foreground">
                ({order.orderNumber})
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {t(
              "procurement.receiveItemsDialog.description",
              "حدد الكميات المستلمة والمخزن لتحديث أرصدة المخزون تلقائياً",
            )}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/40 rounded-xl border border-border/60">
            <div>
              <Label className="text-xs text-muted-foreground">
                {t("procurement.receiveItemsDialog.receivedDate", "تاريخ الاستلام")}
              </Label>
              <Input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="h-9 mt-1"
                required
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                {t(
                  "procurement.receiveItemsDialog.defaultWarehouse",
                  "المخزن الافتراضي للاستلام",
                )}
              </Label>
              <Select
                value={defaultWarehouseId}
                onValueChange={(val) => {
                  const safeVal = val || "";
                  setDefaultWarehouseId(safeVal);
                  setRows((prev) =>
                    prev.map((r) => ({ ...r, warehouseId: r.warehouseId || safeVal })),
                  );
                }}
                disabled={loadingWarehouses || warehouses.length === 0}
              >
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue
                    placeholder={
                      loadingWarehouses
                        ? "جاري تحميل المخازن..."
                        : t(
                            "procurement.receiveItemsDialog.selectWarehouse",
                            "اختر المخزن",
                          )
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} {w.code ? `(${w.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-muted/60 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-2.5 text-start font-semibold">
                      {t("procurement.receiveItemsDialog.columnProduct", "الصنف")}
                    </th>
                    <th className="p-2.5 text-center font-semibold w-16">
                      {t("procurement.receiveItemsDialog.columnOrdered", "المطلوب")}
                    </th>
                    <th className="p-2.5 text-center font-semibold w-20">
                      {t(
                        "procurement.receiveItemsDialog.columnReceivedBefore",
                        "المستلم سابقاً",
                      )}
                    </th>
                    <th className="p-2.5 text-center font-semibold w-24">
                      {t(
                        "procurement.receiveItemsDialog.columnReceiveNow",
                        "كمية الاستلام الآن",
                      )}
                    </th>
                    <th className="p-2.5 text-center font-semibold w-24">
                      {t(
                        "procurement.receiveItemsDialog.columnUpdateInventory",
                        "تحديث المخزون",
                      )}
                    </th>
                    <th className="p-2.5 text-start font-semibold min-w-[140px]">
                      {t("procurement.receiveItemsDialog.columnWarehouse", "المخزن")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rows.map((row, idx) => (
                    <tr key={row.itemId} className="hover:bg-muted/20">
                      <td className="p-2.5">
                        <div className="font-semibold text-foreground">
                          {row.productName}
                        </div>
                        {row.sku && (
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {row.sku}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-mono font-medium">
                        {row.ordered}
                      </td>
                      <td className="p-2.5 text-center font-mono text-muted-foreground">
                        {row.receivedBefore}
                      </td>
                      <td className="p-2.5">
                        <Input
                          type="number"
                          min="0"
                          max={row.remaining}
                          step="any"
                          value={row.receivedNow}
                          disabled={row.remaining <= 0}
                          onChange={(e) =>
                            handleRowChange(idx, "receivedNow", e.target.value)
                          }
                          className="h-8 text-center font-mono rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <div className="text-[10px] text-muted-foreground text-center mt-0.5">
                          متبقي: {row.remaining}
                        </div>
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex justify-center items-center">
                          <Checkbox
                            checked={row.updateInventory}
                            onCheckedChange={(checked) =>
                              handleRowChange(
                                idx,
                                "updateInventory",
                                Boolean(checked),
                              )
                            }
                          />
                        </div>
                      </td>
                      <td className="p-2.5">
                        <Select
                          value={row.warehouseId || defaultWarehouseId}
                          disabled={!row.updateInventory || warehouses.length === 0}
                          onValueChange={(val) =>
                            handleRowChange(idx, "warehouseId", val || "")
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="اختر مخزن" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.map((w) => (
                              <SelectItem key={w.id} value={w.id}>
                                {w.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              {t("procurement.receiveItemsDialog.cancelBtn", "إلغاء")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin me-2" />
                  جاري الحفظ...
                </>
              ) : (
                t(
                  "procurement.receiveItemsDialog.submitBtn",
                  "تأكيد وحفظ الاستلام",
                )
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiveItemsDialog;
