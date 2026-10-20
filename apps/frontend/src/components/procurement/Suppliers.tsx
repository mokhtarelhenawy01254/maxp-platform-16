import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Eye,
  Star,
  AlertCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { formatCurrency } from "../../lib/formatCurrency";
import {
  ProcurementMobileCard,
  ProcurementMobileState,
} from "./ProcurementMobileCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  country?: string;
  taxNumber?: string;
  commercialRegister?: string;
  paymentTerms?: string;
  creditLimit?: number;
  currentBalance: number;
  rating?: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    purchaseOrders: number;
    purchaseInvoices: number;
  };
}

const StarRating: React.FC<{
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: number;
}> = ({ value, onChange, readonly, size = 16 }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={readonly ? "cursor-default" : "cursor-pointer"}
        >
          <Star
            size={size}
            className={star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
          />
        </button>
      ))}
    </div>
  );
};

const Suppliers: React.FC = () => {
  const { t, i18n } = useTranslation();
  const tr = (key: string) => String(t(key as any));
  const isRtl = i18n.language === "ar";
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    supplierId: string | null;
  }>({ open: false, supplierId: null });
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    mobile: "",
    address: "",
    city: "",
    country: "Egypt",
    taxNumber: "",
    commercialRegister: "",
    paymentTerms: "",
    creditLimit: "",
    rating: 0,
    notes: "",
    isActive: true,
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<{
        suppliers: Supplier[];
        pagination: { totalPages: number };
      }>("/procurement/suppliers", {
        params: { page, limit: 20, search: searchTerm },
      });
      setSuppliers(response.data.suppliers);
      setTotalPages(response.data.pagination.totalPages);
    } catch (err: any) {
      console.error("Error fetching suppliers:", err);
      setError(err?.response?.data?.message || t("procurement.suppliers.fetchError", "تعذر تحميل قائمة الموردين"));
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, t]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setSelectedSupplier(supplier);
      setFormData({
        name: supplier.name,
        contactPerson: supplier.contactPerson || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        mobile: supplier.mobile || "",
        address: supplier.address || "",
        city: supplier.city || "",
        country: supplier.country || "Egypt",
        taxNumber: supplier.taxNumber || "",
        commercialRegister: supplier.commercialRegister || "",
        paymentTerms: supplier.paymentTerms || "",
        creditLimit: supplier.creditLimit?.toString() || "",
        rating: supplier.rating || 0,
        notes: supplier.notes || "",
        isActive: supplier.isActive,
      });
    } else {
      setSelectedSupplier(null);
      setFormData({
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        mobile: "",
        address: "",
        city: "",
        country: "Egypt",
        taxNumber: "",
        commercialRegister: "",
        paymentTerms: "",
        creditLimit: "",
        rating: 0,
        notes: "",
        isActive: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSupplier(null);
  };

  const handleSubmit = async () => {
    try {
      if (selectedSupplier) {
        await apiClient.put(
          `/procurement/suppliers/${selectedSupplier.id}`,
          formData,
        );
      } else {
        await apiClient.post("/procurement/suppliers", formData);
      }
      fetchSuppliers();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving supplier:", error);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmDialog({ open: true, supplierId: id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmDialog.supplierId) return;
    try {
      await apiClient.delete(`/procurement/suppliers/${deleteConfirmDialog.supplierId}`);
      fetchSuppliers();
    } catch (error) {
      console.error("Error deleting supplier:", error);
    } finally {
      setDeleteConfirmDialog({ open: false, supplierId: null });
    }
  };

  const handleViewDetails = (supplier: Supplier) => {
    navigate(`/procurement/suppliers/${supplier.id}`);
  };

  return (
    <div className="p-3" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
        <h1 className="text-2xl font-bold">{t("procurement.suppliers.title")}</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="size-4" /> {t("procurement.suppliers.addNew")}
        </Button>
      </div>

      {error && (
        <div className="flex items-center justify-between p-3.5 mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchSuppliers} className="h-7 text-xs">
            إعادة المحاولة
          </Button>
        </div>
      )}

      <div className="rounded-xl border bg-card text-card-foreground mb-3">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={tr("procurement.suppliers.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-8"
            />
          </div>
        </div>
      </div>

      <div className="hidden md:block rounded-xl border bg-card text-card-foreground">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">{t("procurement.suppliers.columnName")}</TableHead>
              <TableHead className="text-start">{t("procurement.suppliers.columnContact")}</TableHead>
              <TableHead className="text-start">{t("procurement.suppliers.columnPhone")}</TableHead>
              <TableHead className="text-start">{t("procurement.suppliers.columnEmail")}</TableHead>
              <TableHead className="text-end">{t("procurement.suppliers.columnBalance")}</TableHead>
              <TableHead className="text-center">{t("procurement.suppliers.columnRating")}</TableHead>
              <TableHead className="text-center">{t("procurement.suppliers.columnStatus")}</TableHead>
              <TableHead className="text-center">{t("procurement.suppliers.columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "لا توجد نتائج مطابقة لبحثك" : "لا يوجد موردون مسجلون حالياً"}
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium text-start">{supplier.name}</TableCell>
                  <TableCell className="text-start">{supplier.contactPerson || "-"}</TableCell>
                  <TableCell className="text-start">{supplier.phone || supplier.mobile || "-"}</TableCell>
                  <TableCell className="text-start">{supplier.email || "-"}</TableCell>
                  <TableCell className="text-end tabular-nums font-medium">
                    {formatCurrency(supplier.currentBalance, { locale: i18n.language })}
                  </TableCell>
                  <TableCell>
                    <StarRating value={supplier.rating || 0} readonly />
                  </TableCell>
                  <TableCell>
                    <Badge variant={supplier.isActive ? "default" : "secondary"}>
                      {supplier.isActive
                        ? t("procurement.suppliers.statusActive")
                        : t("procurement.suppliers.statusInactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(supplier)}
                        title={tr("procurement.suppliers.viewDetails")}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(supplier)}
                        title={tr("common.edit")}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(supplier.id)}
                        title={tr("common.delete")}
                      >
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

      <div className="grid md:hidden gap-2">
        {loading ? (
          <ProcurementMobileState>{t("common.loading")}</ProcurementMobileState>
        ) : suppliers.length === 0 ? (
          <ProcurementMobileState>{t("common.noData")}</ProcurementMobileState>
        ) : (
          suppliers.map((supplier) => (
            <ProcurementMobileCard
              key={supplier.id}
              eyebrow={supplier.contactPerson || t("procurement.suppliers.columnContact")}
              title={supplier.name}
              subtitle={supplier.email || supplier.phone || supplier.mobile || "-"}
              status={
                <Badge variant={supplier.isActive ? "default" : "secondary"}>
                  {supplier.isActive
                    ? t("procurement.suppliers.statusActive")
                    : t("procurement.suppliers.statusInactive")}
                </Badge>
              }
              fields={[
                {
                  label: t("procurement.suppliers.columnPhone"),
                  value: supplier.phone || supplier.mobile || "-",
                },
                {
                  label: t("procurement.suppliers.columnBalance"),
                  value: formatCurrency(supplier.currentBalance, { locale: i18n.language }),
                  emphasis: true,
                },
                {
                  label: t("procurement.suppliers.columnRating"),
                  value: <StarRating value={supplier.rating || 0} readonly />,
                },
                {
                  label: t("procurement.suppliers.labelCity"),
                  value: supplier.city || supplier.country || "-",
                },
              ]}
              actions={
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewDetails(supplier)}
                    title={tr("procurement.suppliers.viewDetails")}
                  >
                    <Eye className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(supplier)}
                    title={tr("common.edit")}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(supplier.id)}
                    title={tr("common.delete")}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              }
            />
          ))
        )}
      </div>

      <div className="flex justify-center mt-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            {t("common.previous")}
          </Button>
          <span className="text-sm px-3">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t("common.next")}
          </Button>
        </div>
      </div>

      <Dialog open={openDialog} onOpenChange={(open) => setOpenDialog(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>
            {selectedSupplier
              ? t("procurement.suppliers.editTitle")
              : t("procurement.suppliers.addNew")}
          </DialogTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-1">
              <Label>{t("procurement.suppliers.labelName")}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("procurement.suppliers.labelContact")}</Label>
              <Input
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("procurement.suppliers.labelEmail")}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("procurement.suppliers.labelPhone")}</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("procurement.suppliers.labelMobile")}</Label>
              <Input
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("procurement.suppliers.labelCity")}</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("procurement.suppliers.labelCountry")}</Label>
              <Input
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("procurement.suppliers.labelTaxNumber")}</Label>
              <Input
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("procurement.suppliers.labelCommercialRegister")}</Label>
              <Input
                value={formData.commercialRegister}
                onChange={(e) => setFormData({ ...formData, commercialRegister: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("procurement.suppliers.labelCreditLimit")}</Label>
              <Input
                type="number"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
              />
            </div>
            <div className="space-y-1 col-span-full">
              <Label>{t("procurement.suppliers.labelAddress")}</Label>
              <Textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-1 col-span-full">
              <Label>{t("procurement.suppliers.labelPaymentTerms")}</Label>
              <Textarea
                rows={2}
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              />
            </div>
            <div className="space-y-1 col-span-full">
              <Label>{t("procurement.suppliers.labelNotes")}</Label>
              <Textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="col-span-full">
              <Label className="mb-1 block">{t("procurement.suppliers.labelRating")}</Label>
              <StarRating
                value={formData.rating}
                onChange={(value) => setFormData({ ...formData, rating: value })}
              />
            </div>
            <div className="col-span-full">
              <Label>{t("procurement.suppliers.labelStatus")}</Label>
              <Select
                value={formData.isActive ? "true" : "false"}
                onValueChange={(value) =>
                  setFormData({ ...formData, isActive: value === "true" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">{t("procurement.suppliers.statusActive")}</SelectItem>
                  <SelectItem value="false">{t("procurement.suppliers.statusInactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>{t("common.cancel")}</Button>
            <Button onClick={handleSubmit}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openViewDialog} onOpenChange={(open) => setOpenViewDialog(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>{t("procurement.suppliers.viewTitle")}</DialogTitle>
          {selectedSupplier && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("procurement.suppliers.columnName")}</p>
                <p className="text-sm">{selectedSupplier.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("procurement.suppliers.columnContact")}</p>
                <p className="text-sm">{selectedSupplier.contactPerson || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("procurement.suppliers.columnEmail")}</p>
                <p className="text-sm">{selectedSupplier.email || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("procurement.suppliers.columnPhone")}</p>
                <p className="text-sm">{selectedSupplier.phone || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("procurement.suppliers.columnBalance")}</p>
                <p className="text-sm font-medium tabular-nums">{formatCurrency(selectedSupplier.currentBalance, { locale: i18n.language })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("procurement.suppliers.columnRating")}</p>
                <StarRating value={selectedSupplier.rating || 0} readonly />
              </div>
              <div className="col-span-full">
                <p className="text-xs text-muted-foreground">{t("procurement.suppliers.labelAddress")}</p>
                <p className="text-sm">{selectedSupplier.address || "-"}</p>
              </div>
              <div className="col-span-full">
                <p className="text-xs text-muted-foreground">{t("procurement.suppliers.labelNotes")}</p>
                <p className="text-sm">{selectedSupplier.notes || "-"}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenViewDialog(false)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmDialog.open}
        title={t("procurement.suppliers.deleteConfirm", "تأكيد حذف المورد")}
        content={t("procurement.suppliers.deleteConfirm", "هل أنت متأكد من حذف هذا المورد؟")}
        confirmColor="error"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmDialog({ open: false, supplierId: null })}
      />
    </div>
  );
};

export default Suppliers;
