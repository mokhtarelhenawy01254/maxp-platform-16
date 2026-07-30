import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Percent, DollarSign } from 'lucide-react';
import { apiClient } from "../services/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VolumeDiscount {
  id: string;
  minQuantity: number;
  maxQuantity: number | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  isActive: boolean;
}

interface VolumeDiscountsProps {
  productId: string;
}

const VolumeDiscounts: React.FC<VolumeDiscountsProps> = ({ productId }) => {
  const { t } = useTranslation();
  const [discounts, setDiscounts] = useState<VolumeDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<VolumeDiscount | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    minQuantity: 2,
    maxQuantity: null as number | null,
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: 10,
    isActive: true,
  });

  useEffect(() => {
    if (productId) fetchDiscounts();
  }, [productId]);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/products/${productId}/volume-discounts`);
      if (response.data.success) setDiscounts(response.data.data);
    } catch (error: any) {
      console.error("Error fetching volume discounts:", error);
      setMessage({ type: "error", text: t("volumeDiscounts.fetchError") });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (discount?: VolumeDiscount) => {
    if (discount) {
      setEditingDiscount(discount);
      setFormData({
        minQuantity: discount.minQuantity,
        maxQuantity: discount.maxQuantity,
        discountType: discount.discountType,
        discountValue: discount.discountValue,
        isActive: discount.isActive,
      });
    } else {
      setEditingDiscount(null);
      setFormData({ minQuantity: 2, maxQuantity: null, discountType: "percentage", discountValue: 10, isActive: true });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDiscount(null);
  };

  const handleSave = async () => {
    try {
      if (editingDiscount) {
        await apiClient.put(`/products/${productId}/volume-discounts/${editingDiscount.id}`, formData);
        setMessage({ type: "success", text: t("volumeDiscounts.updateSuccess") });
      } else {
        await apiClient.post(`/products/${productId}/volume-discounts`, formData);
        setMessage({ type: "success", text: t("volumeDiscounts.createSuccess") });
      }
      handleCloseDialog();
      fetchDiscounts();
    } catch (error: any) {
      console.error("Error saving volume discount:", error);
      setMessage({ type: "error", text: error.response?.data?.message || t("volumeDiscounts.saveError") });
    }
  };

  const handleDelete = async (discountId: string) => {
    if (!window.confirm(t("volumeDiscounts.confirmDelete"))) return;
    try {
      await apiClient.delete(`/products/${productId}/volume-discounts/${discountId}`);
      setMessage({ type: "success", text: t("volumeDiscounts.deleteSuccess") });
      fetchDiscounts();
    } catch (error: any) {
      console.error("Error deleting volume discount:", error);
      setMessage({ type: "error", text: t("volumeDiscounts.deleteError") });
    }
  };

  const formatDiscount = (discount: VolumeDiscount) => {
    if (discount.discountType === "percentage") return `${discount.discountValue}%`;
    return `${discount.discountValue}${t("volumeDiscounts.preview.currency")}`;
  };

  const formatQuantityRange = (discount: VolumeDiscount) => {
    if (discount.maxQuantity) return `${discount.minQuantity} - ${discount.maxQuantity}`;
    return `${discount.minQuantity}+`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-base font-semibold mb-1">{t("volumeDiscounts.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("volumeDiscounts.description")}
          </p>
        </div>
        <Button size="sm" onClick={() => handleOpenDialog()}>
          <Plus className="size-4" /> {t("volumeDiscounts.addDiscount")}
        </Button>
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"} className="mb-2">
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent>
          <div className="rounded-xl border bg-card text-card-foreground">
            <Table size="small">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("volumeDiscounts.columns.quantityRange")}</TableHead>
                  <TableHead>{t("volumeDiscounts.columns.discountType")}</TableHead>
                  <TableHead>{t("volumeDiscounts.columns.discountValue")}</TableHead>
                  <TableHead>{t("volumeDiscounts.columns.status")}</TableHead>
                  <TableHead className="text-center">{t("volumeDiscounts.columns.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      <div className="py-3">
                        <Percent className="size-12 text-muted-foreground mb-1 mx-auto" />
                        <p className="text-sm text-muted-foreground">
                          {t("volumeDiscounts.emptyState")}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  discounts.map((discount) => (
                    <TableRow key={discount.id}>
                      <TableCell>{formatQuantityRange(discount)} {t("volumeDiscounts.preview.pieces")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          {discount.discountType === "percentage" ? <Percent className="size-3" /> : <DollarSign className="size-3" />}
                          {discount.discountType === "percentage" ? t("volumeDiscounts.type.percentage") : t("volumeDiscounts.type.fixed")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-bold text-green-600">{formatDiscount(discount)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={discount.isActive ? "default" : "secondary"}>
                          {discount.isActive ? t("volumeDiscounts.status.active") : t("volumeDiscounts.status.inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(discount)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(discount.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {discounts.length > 0 && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
              <p className="text-xs text-muted-foreground mb-1">{t("volumeDiscounts.preview.title")}:</p>
              <p className="text-sm">
                {t("volumeDiscounts.tip.description")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>
            {editingDiscount ? t("volumeDiscounts.editDiscount") : t("volumeDiscounts.addNewDiscount")}
          </DialogTitle>
          <div className="flex flex-col gap-4 py-4">
            <div className="space-y-1">
              <Label>{t("volumeDiscounts.label.minQuantity")}</Label>
              <Input
                type="number"
                value={formData.minQuantity}
                onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 1 })}
                min={1}
              />
            </div>

            <div className="space-y-1">
              <Label>{t("volumeDiscounts.label.maxQuantity")}</Label>
              <Input
                type="number"
                value={formData.maxQuantity || ""}
                onChange={(e) => setFormData({ ...formData, maxQuantity: e.target.value ? parseInt(e.target.value) : null })}
                min={formData.minQuantity}
              />
            </div>

            <div className="space-y-1">
              <Label>{t("volumeDiscounts.label.discountType")}</Label>
              <Select
                value={formData.discountType}
                onValueChange={(value) => setFormData({ ...formData, discountType: value as "percentage" | "fixed" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    <div className="flex items-center gap-1">
                      <Percent className="size-4" /> {t("volumeDiscounts.type.percentage")}
                    </div>
                  </SelectItem>
                  <SelectItem value="fixed">
                    <div className="flex items-center gap-1">
                      <DollarSign className="size-4" /> {t("volumeDiscounts.type.fixed")}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>
                {formData.discountType === "percentage" ? t("volumeDiscounts.label.discountValuePercentage") : t("volumeDiscounts.label.discountValueFixed")}
              </Label>
              <Input
                type="number"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                min={0}
                max={formData.discountType === "percentage" ? 100 : undefined}
                step={formData.discountType === "percentage" ? 1 : 5}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>{t("volumeDiscounts.label.enableDiscount")}</Label>
            </div>

            <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded">
              <p className="text-xs text-muted-foreground mb-1">{t("volumeDiscounts.preview.title")}:</p>
              <p className="text-sm font-medium">
                {t("volumeDiscounts.preview.buy")} {formData.minQuantity}
                {formData.maxQuantity ? ` - ${formData.maxQuantity}` : "+"} {t("volumeDiscounts.preview.pieces")}{t("volumeDiscounts.preview.customerGets")}
                {t("volumeDiscounts.preview.discount")} {formData.discountValue}{formData.discountType === "percentage" ? "%" : t("volumeDiscounts.preview.currency")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>{t("common.cancel")}</Button>
            <Button onClick={handleSave}>{editingDiscount ? t("volumeDiscounts.actions.update") : t("volumeDiscounts.actions.add")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VolumeDiscounts;
