import { useTranslation } from 'react-i18next';
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, X, Upload, Clipboard, Trash2, Pencil, Image as ImageIcon, Package, Brush, RefreshCw, Search, ShoppingBag, TrendingUp } from 'lucide-react';
import { toast } from "sonner";
import { apiClient } from "../../services/apiClient";
import { uploadService } from "../../services/uploadService";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader, AdminDataCard, AdminEmptyState } from "@/components/Admin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface ProductVariant {
  id?: string;
  color: string;
  imageUrl?: string;
  _localFile?: File;
  _localPreview?: string;
}

interface ProductFormData {
  id?: string;
  name: string;
  price: string;
  stock: string;
  sku: string;
  description: string;
  mainImage: string;
  _mainImageFile?: File;
  _mainImagePreview?: string;
  variants: ProductVariant[];
}

interface ProductRecord {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku?: string | null;
  description?: string | null;
  mainImage?: string | null;
  images?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string } | null;
  variants?: Array<{
    id: string;
    name?: string | null;
    color?: string | null;
    size?: string | null;
    images?: string | null;
    sku?: string | null;
    price?: number | null;
    stock?: number | null;
  }>;
}

const EMPTY_FORM: ProductFormData = {
  name: "",
  price: "",
  stock: "0",
  sku: "",
  description: "",
  mainImage: "",
  variants: [],
};

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < breakpoint
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}



function ImageUploadArea({
  previewUrl,
  onFileSelect,
  onClear,
  label,
  size = 100,
}: {
  previewUrl?: string;
  onFileSelect: (file: File) => void;
  onClear?: () => void;
  label: string;
  size?: number;
}) {
  const { derivedTheme } = useTheme();
  const isDark = derivedTheme === "dark";
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = "";
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      <div
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer items-center justify-center overflow-hidden rounded-[10px] border-2 border-dashed transition-all hover:border-primary",
          previewUrl ? "border-primary" : isDark ? "border-white/15" : "border-black/12",
        )}
        style={{ width: size, height: size, backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={label}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            <Upload className="size-5 text-muted-foreground" />
            <span className="px-0.5 text-center text-[0.6rem] text-muted-foreground">
              {label}
            </span>
          </div>
        )}
      </div>
      {previewUrl && onClear && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="absolute -right-2 -top-2 bg-destructive text-white hover:bg-destructive/90"
          style={{ width: 22, height: 22 }}
        >
          <X className="size-3" />
        </Button>
      )}
    </div>
  );
}

function ProductFormDrawer({
  open,
  formData,
  onChange,
  onSave,
  onClose,
  saving,
}: {
  open: boolean;
  formData: ProductFormData;
  onChange: (data: ProductFormData) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const handleField = (field: keyof ProductFormData, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  const handleMainImageFile = async (file: File) => {
    const preview = URL.createObjectURL(file);
    onChange({
      ...formData,
      _mainImageFile: file,
      _mainImagePreview: preview,
    });
  };

  const clearMainImage = () => {
    if (formData._mainImagePreview) {
      URL.revokeObjectURL(formData._mainImagePreview);
    }
    onChange({
      ...formData,
      mainImage: "",
      _mainImageFile: undefined,
      _mainImagePreview: undefined,
    });
  };

  const addVariant = () => {
    onChange({
      ...formData,
      variants: [...formData.variants, { color: "", imageUrl: "" }],
    });
  };

  const updateVariant = (index: number, updates: Partial<ProductVariant>) => {
    const next = [...formData.variants];
    next[index] = { ...next[index], ...updates };
    onChange({ ...formData, variants: next });
  };

  const removeVariant = (index: number) => {
    const removed = formData.variants[index];
    if (removed?._localPreview) URL.revokeObjectURL(removed._localPreview);
    onChange({
      ...formData,
      variants: formData.variants.filter((_, i) => i !== index),
    });
  };

  const handleVariantFile = (index: number, file: File) => {
    const preview = URL.createObjectURL(file);
    updateVariant(index, {
      _localFile: file,
      _localPreview: preview,
    });
  };

  const isEditing = !!formData.id;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col p-0",
          isMobile ? "h-[92vh] rounded-t-[20px]" : "",
        )}
        style={{ maxWidth: isMobile ? "100%" : 460, width: isMobile ? "100%" : 460 }}
      >
        <SheetHeader className="border-b px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <Pencil className="size-5 text-primary" />
              ) : (
                <Plus className="size-5 text-primary" />
              )}
              <SheetTitle className="text-lg font-black">
                {isEditing
                  ? t("aiCatalog.editProduct")
                  : t("aiCatalog.addProduct")}
              </SheetTitle>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </SheetHeader>

        {saving && (
          <div className="h-1 w-full overflow-hidden bg-muted">
            <div className="h-full w-full animate-pulse bg-primary" />
          </div>
        )}

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div className="flex justify-center">
            <ImageUploadArea
              previewUrl={formData._mainImagePreview || formData.mainImage}
              onFileSelect={handleMainImageFile}
              onClear={clearMainImage}
              label={t("aiCatalog.imageUpload")}
              size={120}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t("aiCatalog.productName")} <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleField("name", e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium">
                {t("aiCatalog.price")} <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm">💲</span>
                <Input
                  value={formData.price}
                  onChange={(e) => handleField("price", e.target.value)}
                  type="number"
                  className="pl-8"
                  required
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium">
                {t("aiCatalog.stock")}
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm">📦</span>
                <Input
                  value={formData.stock}
                  onChange={(e) => handleField("stock", e.target.value)}
                  type="number"
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t("aiCatalog.sku")}
            </label>
            <Input
              value={formData.sku}
              onChange={(e) => handleField("sku", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t("aiCatalog.description")}
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleField("description", e.target.value)}
              rows={3}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="size-5 text-primary" />
              <span className="text-sm font-extrabold">
                {t("aiCatalog.variants")}
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={addVariant}>
              <Plus className="mr-1 size-3.5" />
              {t("aiCatalog.addVariant")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("aiCatalog.addVariantDesc")}
          </p>

          {formData.variants.map((variant, idx) => (
            <div
              key={idx}
              className="rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <ImageUploadArea
                  previewUrl={variant._localPreview || variant.imageUrl}
                  onFileSelect={(f) => handleVariantFile(idx, f)}
                  onClear={() =>
                    updateVariant(idx, {
                      imageUrl: "",
                      _localFile: undefined,
                      _localPreview: undefined,
                    })
                  }
                  label={t("aiCatalog.variantImage")}
                  size={64}
                />
                <div className="flex-1">
                  <Input
                    value={variant.color}
                    onChange={(e) =>
                      updateVariant(idx, { color: e.target.value })
                    }
                    placeholder={t("aiCatalog.variantColor")}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeVariant(idx)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <SheetFooter className="border-t px-6 py-4">
          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="flex-1"
            >
              {t("aiCatalog.cancel")}
            </Button>
            <Button
              onClick={onSave}
              disabled={saving || !formData.name.trim() || !formData.price}
              className="flex-[2] rounded-lg font-extrabold"
            >
              {saving ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                t("aiCatalog.save")
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function AgentCatalogPage() {
  const { t } = useTranslation();
  const { derivedTheme } = useTheme();
  const isDark = derivedTheme === "dark";
  const isMobile = useIsMobile();

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ProductRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page: page + 1,
        limit: rowsPerPage,
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const res = await apiClient.get<{
        success: boolean;
        data: ProductRecord[];
        totalProducts?: number;
        pagination?: { totalProducts?: number; totalCount?: number };
      }>("/products", { params });

      const data = res.data;
      setProducts(data.data || []);
      setTotalCount(
        data.pagination?.total ??
          data.pagination?.totalProducts ??
          data.pagination?.totalCount ??
          data.totalProducts ??
          (data.data?.length || 0)
      );
    } catch (err: any) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearch]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const stats = useMemo(() => {
    const total = totalCount;
    const outOfStock = products.filter((p) => p.stock <= 0).length;
    const avgPrice =
      products.length > 0
        ? (
            products.reduce((s, p) => s + (p.price || 0), 0) / products.length
          ).toFixed(0)
        : "0";
    return { total, outOfStock, avgPrice };
  }, [products, totalCount]);

  const openAddForm = () => {
    setFormData({ ...EMPTY_FORM });
    setDrawerOpen(true);
  };

  const openEditForm = (product: ProductRecord) => {
    let parsedImages: string[] = [];
    if (product.images) {
      try {
        parsedImages = JSON.parse(product.images);
      } catch {
        /* empty */
      }
    }
    const variants: ProductVariant[] = (product.variants || []).map((v) => {
      let img = "";
      if (v.images) {
        try {
          const vImgs = JSON.parse(v.images);
          img = Array.isArray(vImgs) ? vImgs[0] || "" : "";
        } catch {
          /* empty */
        }
      }
      return { id: v.id, color: v.color || v.name || "", imageUrl: img };
    });

    setFormData({
      id: product.id,
      name: product.name || "",
      price: String(product.price ?? ""),
      stock: String(product.stock ?? 0),
      sku: product.sku || "",
      description: product.description || "",
      mainImage: product.mainImage || parsedImages[0] || "",
      variants,
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let mainImageUrl = formData.mainImage || "";
      if (formData._mainImageFile) {
        const uploadRes = await uploadService.uploadProductImage(
          formData._mainImageFile
        );
        if (uploadRes.success && uploadRes.data?.url) {
          mainImageUrl = uploadRes.data.url;
        }
      }

      const processedVariants: Array<{
        id?: string;
        color: string;
        imageUrl: string;
      }> = [];
      for (const v of formData.variants) {
        let variantImg = v.imageUrl || "";
        if (v._localFile) {
          const vUpload = await uploadService.uploadProductImage(v._localFile);
          if (vUpload.success && vUpload.data?.url) {
            variantImg = vUpload.data.url;
          }
        }
        processedVariants.push({
          id: v.id,
          color: v.color,
          imageUrl: variantImg,
        });
      }

      const body: Record<string, unknown> = {
        name: formData.name.trim(),
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 0,
        sku: formData.sku.trim() || undefined,
        description: formData.description.trim() || undefined,
        mainImage: mainImageUrl || undefined,
        images: mainImageUrl ? [mainImageUrl] : [],
        isActive: true,
      };

      if (formData.id) {
        await apiClient.patch(`/products/${formData.id}`, body);

        for (const v of processedVariants) {
          const variantBody: Record<string, unknown> = {
            name: v.color,
            type: "color",
            images: v.imageUrl ? JSON.stringify([v.imageUrl]) : undefined,
          };
          if (v.id) {
            await apiClient.put(
              `/products/${formData.id}/variants/${v.id}`,
              variantBody
            );
          } else {
            await apiClient.post(
              `/products/${formData.id}/variants`,
              variantBody
            );
          }
        }
      } else {
        const createRes = await apiClient.post<{
          success: boolean;
          data: ProductRecord;
        }>("/products", body);

        const newId = createRes.data?.data?.id;
        if (newId && processedVariants.length > 0) {
          for (const v of processedVariants) {
            await apiClient.post(`/products/${newId}/variants`, {
              name: v.color,
              type: "color",
              images: v.imageUrl ? JSON.stringify([v.imageUrl]) : undefined,
            });
          }
        }
      }

      if (formData._mainImagePreview)
        URL.revokeObjectURL(formData._mainImagePreview);
      formData.variants.forEach((v) => {
        if (v._localPreview) URL.revokeObjectURL(v._localPreview);
      });

      setDrawerOpen(false);
      setFormData({ ...EMPTY_FORM });
      fetchProducts();
      toast.success(
        formData.id
          ? t("aiCatalog.editProduct") + " ✓"
          : t("aiCatalog.addProduct") + " ✓"
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err.message || "Error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/products/${deleteTarget.id}`);
      toast.success(t("aiCatalog.successDelete"));
      setDeleteTarget(null);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (product: ProductRecord) => {
    try {
      await apiClient.post(`/products/${product.id}/duplicate`);
      toast.success(t("aiCatalog.successDuplicate"));
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Error");
    }
  };

  return (
    <div
      className="min-h-[calc(100dvh-64px)] bg-background p-4 md:p-6"
      dir="rtl"
    >
      <AdminPageHeader
        title={t("aiCatalog.title")}
        subtitle={t("aiCatalog.subtitle")}
        icon={<ShoppingBag className="size-7" />}
        actions={isMobile ? <div className="flex items-center gap-2"><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={fetchProducts}>{loading ? <LoadingSpinner size="sm" /> : <RefreshCw className="size-5" />}</Button></TooltipTrigger><TooltipContent>Refresh</TooltipContent></Tooltip></TooltipProvider></div> : <>
          <div className="relative w-[260px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t("aiCatalog.search")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-8" />
          </div>
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button onClick={openAddForm} className="rounded-lg px-6 font-extrabold shadow-[0_4px_14px_rgba(99,102,241,0.25)]"><Plus className="mr-1 size-4" />{t("aiCatalog.addProduct")}</Button></TooltipTrigger><TooltipContent>{t("aiCatalog.addProduct")}</TooltipContent></Tooltip></TooltipProvider>
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={fetchProducts}>{loading ? <LoadingSpinner size="sm" /> : <RefreshCw className="size-5" />}</Button></TooltipTrigger><TooltipContent>Refresh</TooltipContent></Tooltip></TooltipProvider>
        </>}
      />

      {isMobile && (
        <div className="sticky top-0 z-10 -mx-4 mb-4 bg-background px-4 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t("aiCatalog.search")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-8" />
          </div>
        </div>
      )}

      {isMobile ? (
        <div className="mb-4 flex gap-3 overflow-x-auto px-0 scrollbar-none">
          <div className="flex shrink-0 items-center gap-3 rounded-xl border bg-card p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(99,102,241,0.1)", color: "rgb(99,102,241)" }}>
              <ShoppingBag className="size-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{t("aiCatalog.totalProducts")}</p>
              <p className="text-lg font-black">{stats.total}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-xl border bg-card p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "rgb(239,68,68)" }}>
              <Package className="size-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{t("aiCatalog.outOfStock")}</p>
              <p className="text-lg font-black">{stats.outOfStock}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-xl border bg-card p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "rgb(34,197,94)" }}>
              <TrendingUp className="size-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{t("aiCatalog.avgPrice")}</p>
              <p className="text-lg font-black">{stats.avgPrice}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <AdminDataCard icon={<ShoppingBag className="size-5" />} label={t("aiCatalog.totalProducts")} value={stats.total} accentColor="99,102,241" />
          <AdminDataCard icon={<Package className="size-5" />} label={t("aiCatalog.outOfStock")} value={stats.outOfStock} accentColor="239,68,68" />
          <AdminDataCard icon={<TrendingUp className="size-5" />} label={t("aiCatalog.avgPrice")} value={stats.avgPrice} accentColor="34,197,94" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="icon-xs" onClick={() => setError(null)}>
              <X className="size-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Products Content */}
      <div className="animate-in fade-in duration-800">
        {isMobile ? (
          <>
            {/* Loading skeletons for mobile */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3 rounded-xl border bg-card p-3">
                    <Skeleton className="size-20 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-5 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16">
                <ShoppingBag className="size-14 text-muted-foreground/50" />
                <p className="font-semibold text-muted-foreground">{t("aiCatalog.empty")}</p>
                <Button variant="outline" onClick={openAddForm}>
                  <Plus className="mr-1 size-4" />
                  {t("aiCatalog.addProduct")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {products.map((product) => {
                  let thumb = product.mainImage || "";
                  if (!thumb && product.images) {
                    try { const imgs = JSON.parse(product.images); thumb = Array.isArray(imgs) ? imgs[0] || "" : ""; } catch {}
                  }
                  const variantCount = product.variants?.length || 0;
                  return (
                    <div
                      key={product.id}
                      onClick={() => openEditForm(product)}
                      className="flex gap-3 rounded-xl border bg-card p-3 active:scale-[0.98] transition-transform cursor-pointer"
                    >
                      <div className="size-20 shrink-0 overflow-hidden rounded-lg">
                        {thumb ? (
                          <img src={thumb} alt={product.name} className="size-full object-cover" />
                        ) : (
                          <div className={cn("flex size-full items-center justify-center", isDark ? "bg-white/6" : "bg-black/4")}>
                            <ImageIcon className="size-6 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <p className="truncate text-sm font-bold">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sku || "—"}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-base font-black">{product.price?.toFixed(2)}</span>
                          <Badge variant={product.stock > 0 ? "outline" : "destructive"} className={cn("text-[0.7rem]", product.stock > 0 && "border-success text-success")}>
                            {product.stock}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {variantCount > 0 && (
                            <Badge variant="outline" className="text-[0.6rem]">
                              <Palette className="ml-0.5 size-3" />
                              {variantCount}
                            </Badge>
                          )}
                          <Button variant="ghost" size="icon-xs" onClick={() => openEditForm(product)}>
                            <Pencil className="size-3.5 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" onClick={() => handleDuplicate(product)}>
                            <Copy className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(product)}>
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mobile pagination */}
            {!loading && products.length > 0 && (
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <span className="text-xs text-muted-foreground">
                  {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, totalCount)} / {totalCount}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    السابق
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= Math.ceil(totalCount / rowsPerPage) - 1} onClick={() => setPage((p) => p + 1)}>
                    التالي
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className={cn("overflow-hidden rounded-xl border", isDark ? "border-white/8" : "border-black/6")}>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className={cn(isDark ? "bg-white/3" : "bg-black/2")}>
                      <TableHead className="w-[60px] font-extrabold">{t("aiCatalog.image")}</TableHead>
                      <TableHead className="font-extrabold">{t("aiCatalog.title")}</TableHead>
                      <TableHead className="font-extrabold">{t("aiCatalog.sku")}</TableHead>
                      <TableHead className="text-center font-extrabold">{t("aiCatalog.price")}</TableHead>
                      <TableHead className="text-center font-extrabold">{t("aiCatalog.stock")}</TableHead>
                      <TableHead className="text-center font-extrabold">{t("aiCatalog.variants")}</TableHead>
                      <TableHead className="w-[140px] text-center font-extrabold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={`skeleton-${i}`}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <ShoppingBag className="size-14 text-muted-foreground/50" />
                            <p className="font-semibold text-muted-foreground">{t("aiCatalog.empty")}</p>
                            <Button variant="outline" onClick={openAddForm}>
                              <Plus className="mr-1 size-4" />
                              {t("aiCatalog.addProduct")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map((product) => {
                        let thumb = product.mainImage || "";
                        if (!thumb && product.images) {
                          try { const imgs = JSON.parse(product.images); thumb = Array.isArray(imgs) ? imgs[0] || "" : ""; } catch {}
                        }
                        const variantCount = product.variants?.length || 0;
                        return (
                          <TableRow key={product.id} className="cursor-pointer transition-colors" onClick={() => openEditForm(product)}>
                            <TableCell>
                              <Avatar className="size-11 rounded-md">
                                <AvatarImage src={thumb || undefined} alt={product.name} />
                                <AvatarFallback className={cn("rounded-md", isDark ? "bg-white/6" : "bg-black/4")}>
                                  <ImageIcon className="size-5" />
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell><span className="max-w-[220px] truncate text-sm font-bold">{product.name}</span></TableCell>
                            <TableCell><code className="text-xs text-muted-foreground">{product.sku || "—"}</code></TableCell>
                            <TableCell className="text-center"><Badge variant="outline" className="font-bold text-xs">{product.price?.toFixed(2)}</Badge></TableCell>
                            <TableCell className="text-center">
                              <Badge variant={product.stock > 0 ? "outline" : "destructive"} className={cn("font-bold text-xs", product.stock > 0 && "border-success text-success")}>
                                {product.stock}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {variantCount > 0 ? (
                                <Badge variant="outline" className="text-[0.7rem]">
                                  <Palette className="mr-0.5 size-3.5" />
                                  {variantCount}
                                </Badge>
                              ) : <span className="text-xs text-muted-foreground/50">—</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon-sm" onClick={() => openEditForm(product)}>
                                    <Pencil className="size-3.5 text-primary" />
                                  </Button>
                                </TooltipTrigger><TooltipContent>{t("aiCatalog.editProduct")}</TooltipContent></Tooltip></TooltipProvider>
                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon-sm" onClick={() => handleDuplicate(product)}>
                                    <Copy className="size-3.5" />
                                  </Button>
                                </TooltipTrigger><TooltipContent>Duplicate</TooltipContent></Tooltip></TooltipProvider>
                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(product)}>
                                    <Trash2 className="size-3.5 text-destructive" />
                                  </Button>
                                </TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip></TooltipProvider>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {!loading && products.length > 0 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t("rowsPerPage") || "Rows per page:"}</span>
                    <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
                      {[5, 10, 25, 50].map((n) => (<option key={n} value={n}>{n}</option>))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>السابق</Button>
                    <span className="text-sm text-muted-foreground">
                      {t("pagination.page", "صفحة {{page}} من {{total}}", { page: page + 1, total: Math.max(1, Math.ceil(totalCount / rowsPerPage)) })}
                    </span>
                    <Button variant="outline" size="sm" disabled={page >= Math.ceil(totalCount / rowsPerPage) - 1} onClick={() => setPage((p) => p + 1)}>التالي</Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Form Drawer */}
      <ProductFormDrawer
        open={drawerOpen}
        formData={formData}
        onChange={setFormData}
        onSave={handleSave}
        onClose={() => {
          if (formData._mainImagePreview)
            URL.revokeObjectURL(formData._mainImagePreview);
          formData.variants.forEach((v) => {
            if (v._localPreview) URL.revokeObjectURL(v._localPreview);
          });
          setDrawerOpen(false);
        }}
        saving={saving}
      />

      {/* Delete Confirm Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="size-5 text-destructive" />
              <AlertDialogTitle className="font-black">
                {t("aiCatalog.deleteConfirm")}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              {deleteTarget?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              {t("aiCatalog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                <>
                  <Trash2 className="mr-1 size-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FAB for mobile */}
      {isMobile && (
        <button
          onClick={openAddForm}
          className="fixed bottom-6 left-6 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_32px_rgba(99,102,241,0.4)] transition-all active:scale-90 hover:scale-105"
        >
          <Plus className="size-6" />
        </button>
      )}
    </div>
  );
}
