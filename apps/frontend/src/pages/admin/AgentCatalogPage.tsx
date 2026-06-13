/**
 * AgentCatalogPage
 *
 * Simplified product catalog management for the AI agent.
 * Provides a quick way for merchants to add/edit/delete products
 * that the bot can use for customer interactions — without needing
 * the full product management page complexity.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  Fade,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Add as AddIcon,
  Close as CloseIcon,
  CloudUpload as UploadIcon,
  ContentCopy as DuplicateIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Image as ImageIcon,
  Inventory2 as StockIcon,
  Palette as ColorIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  ShoppingBag as CatalogIcon,
  TrendingUp as PriceIcon,
} from "@mui/icons-material";
import { apiClient } from "../../services/apiClient";
import { uploadService } from "../../services/uploadService";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Stats Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        background: isDark
          ? `linear-gradient(135deg, rgba(${color},0.12) 0%, rgba(${color},0.04) 100%)`
          : `linear-gradient(135deg, rgba(${color},0.08) 0%, rgba(${color},0.02) 100%)`,
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: `0 8px 24px rgba(${color},0.15)`,
        },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar
          sx={{
            bgcolor: `rgba(${color},0.15)`,
            color: `rgb(${color})`,
            width: 44,
            height: 44,
          }}
        >
          {icon}
        </Avatar>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={900}>
            {value}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

// ─── Image Upload Button ──────────────────────────────────────────────────────

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
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    // Reset so re-selecting the same file works
    e.target.value = "";
  };

  return (
    <Box sx={{ position: "relative", width: size, height: size }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: "none" }}
      />
      <Box
        onClick={() => inputRef.current?.click()}
        sx={{
          width: size,
          height: size,
          borderRadius: 2.5,
          border: "2px dashed",
          borderColor: previewUrl
            ? "primary.main"
            : isDark
              ? "rgba(255,255,255,0.15)"
              : "rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          cursor: "pointer",
          transition: "all 0.2s",
          bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          "&:hover": {
            borderColor: "primary.main",
            bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          },
        }}
      >
        {previewUrl ? (
          <Box
            component="img"
            src={previewUrl}
            alt={label}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Stack alignItems="center" spacing={0.5}>
            <UploadIcon sx={{ fontSize: 20, color: "text.secondary" }} />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.6rem", textAlign: "center", px: 0.5 }}
            >
              {label}
            </Typography>
          </Stack>
        )}
      </Box>
      {previewUrl && onClear && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          sx={{
            position: "absolute",
            top: -8,
            right: -8,
            bgcolor: "error.main",
            color: "white",
            width: 22,
            height: 22,
            "&:hover": { bgcolor: "error.dark" },
          }}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      )}
    </Box>
  );
}

// ─── Product Form Drawer ──────────────────────────────────────────────────────

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
    <Drawer
      anchor={isMobile ? "bottom" : "right"}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: isMobile ? "100%" : 460,
          maxHeight: isMobile ? "92vh" : "100vh",
          borderRadius: isMobile ? "20px 20px 0 0" : 0,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack direction="row" spacing={1} alignItems="center">
            {isEditing ? (
              <EditIcon color="primary" />
            ) : (
              <AddIcon color="primary" />
            )}
            <Typography variant="h6" fontWeight={900}>
              {isEditing
                ? t("aiCatalog.editProduct")
                : t("aiCatalog.addProduct")}
            </Typography>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      {saving && <LinearProgress />}

      {/* Form Body */}
      <Box sx={{ p: 3, overflowY: "auto", flex: 1 }}>
        <Stack spacing={2.5}>
          {/* Main Image */}
          <Stack alignItems="center">
            <ImageUploadArea
              previewUrl={formData._mainImagePreview || formData.mainImage}
              onFileSelect={handleMainImageFile}
              onClear={clearMainImage}
              label={t("aiCatalog.imageUpload")}
              size={120}
            />
          </Stack>

          {/* Name */}
          <TextField
            label={t("aiCatalog.productName")}
            value={formData.name}
            onChange={(e) => handleField("name", e.target.value)}
            fullWidth
            required
            size="small"
            autoFocus
          />

          {/* Price + Stock */}
          <Stack direction="row" spacing={2}>
            <TextField
              label={t("aiCatalog.price")}
              value={formData.price}
              onChange={(e) => handleField("price", e.target.value)}
              type="number"
              fullWidth
              required
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">💲</InputAdornment>
                ),
              }}
            />
            <TextField
              label={t("aiCatalog.stock")}
              value={formData.stock}
              onChange={(e) => handleField("stock", e.target.value)}
              type="number"
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">📦</InputAdornment>
                ),
              }}
            />
          </Stack>

          {/* SKU */}
          <TextField
            label={t("aiCatalog.sku")}
            value={formData.sku}
            onChange={(e) => handleField("sku", e.target.value)}
            fullWidth
            size="small"
          />

          {/* Description */}
          <TextField
            label={t("aiCatalog.description")}
            value={formData.description}
            onChange={(e) => handleField("description", e.target.value)}
            fullWidth
            multiline
            minRows={3}
            maxRows={6}
            size="small"
          />

          {/* Variants Section */}
          <Divider />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <ColorIcon color="primary" sx={{ fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={800}>
                {t("aiCatalog.variants")}
              </Typography>
            </Stack>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={addVariant}
              sx={{ textTransform: "none" }}
            >
              {t("aiCatalog.addVariant")}
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {t("aiCatalog.addVariantDesc")}
          </Typography>

          {formData.variants.map((variant, idx) => (
            <Paper
              key={idx}
              elevation={0}
              sx={{
                p: 1.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
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
                <TextField
                  label={t("aiCatalog.variantColor")}
                  value={variant.color}
                  onChange={(e) =>
                    updateVariant(idx, { color: e.target.value })
                  }
                  fullWidth
                  size="small"
                  placeholder=""
                />
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => removeVariant(idx)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack direction="row" spacing={1.5}>
          <Button
            onClick={onClose}
            disabled={saving}
            sx={{ flex: 1, textTransform: "none" }}
          >
            {t("aiCatalog.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={onSave}
            disabled={saving || !formData.name.trim() || !formData.price}
            startIcon={
              saving ? <CircularProgress size={16} /> : undefined
            }
            sx={{
              flex: 2,
              textTransform: "none",
              fontWeight: 800,
              borderRadius: 2,
            }}
          >
            {saving
              ? "..."
              : t("aiCatalog.save")}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentCatalogPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Data
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & search
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Form
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<ProductRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // ── Debounce search ──
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Fetch products ──
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

  // ── Stats ──
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

  // ── Open form for add/edit ──
  const openAddForm = () => {
    setFormData({ ...EMPTY_FORM });
    setDrawerOpen(true);
  };

  const openEditForm = (product: ProductRecord) => {
    // Parse images
    let parsedImages: string[] = [];
    if (product.images) {
      try {
        parsedImages = JSON.parse(product.images);
      } catch {
        /* empty */
      }
    }

    // Parse variants into our simplified form
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

  // ── Save (create or update) ──
  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Upload main image if local file exists
      let mainImageUrl = formData.mainImage || "";
      if (formData._mainImageFile) {
        const uploadRes = await uploadService.uploadProductImage(
          formData._mainImageFile
        );
        if (uploadRes.success && uploadRes.data?.url) {
          mainImageUrl = uploadRes.data.url;
        }
      }

      // 2. Upload variant images
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

      // 3. Build body
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
        // Update existing
        await apiClient.patch(`/products/${formData.id}`, body);

        // Handle variants: create new, update existing
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
        // Create new
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

      // Clean up blob URLs
      if (formData._mainImagePreview)
        URL.revokeObjectURL(formData._mainImagePreview);
      formData.variants.forEach((v) => {
        if (v._localPreview) URL.revokeObjectURL(v._localPreview);
      });

      setDrawerOpen(false);
      setFormData({ ...EMPTY_FORM });
      fetchProducts();
      setSnackbar({
        open: true,
        message: formData.id
          ? t("aiCatalog.editProduct") + " ✓"
          : t("aiCatalog.addProduct") + " ✓",
        severity: "success",
      });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || err.message || "Error",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/products/${deleteTarget.id}`);
      setSnackbar({
        open: true,
        message: t("aiCatalog.successDelete"),
        severity: "success",
      });
      setDeleteTarget(null);
      fetchProducts();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || "Error",
        severity: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ── Duplicate ──
  const handleDuplicate = async (product: ProductRecord) => {
    try {
      await apiClient.post(`/products/${product.id}/duplicate`);
      setSnackbar({
        open: true,
        message: t("aiCatalog.successDuplicate"),
        severity: "success",
      });
      fetchProducts();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || "Error",
        severity: "error",
      });
    }
  };

  return (
    <Box
      sx={{
        direction: "rtl",
        minHeight: "calc(100vh - 64px)",
        bgcolor: "background.default",
        p: { xs: 2, md: 3 },
      }}
    >
      {/* ── Header ── */}
      <Fade in timeout={400}>
        <Box>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ md: "center" }}
            sx={{ mb: 3 }}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <CatalogIcon color="primary" sx={{ fontSize: 28 }} />
                <Typography variant="h4" fontWeight={900}>
                  {t("aiCatalog.title")}
                </Typography>
              </Stack>
              <Typography color="text.secondary">
                {t("aiCatalog.subtitle")}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <TextField
                size="small"
                placeholder={t("aiCatalog.search")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: { xs: "100%", md: 260 } }}
              />
              <Tooltip title={t("aiCatalog.addProduct")}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openAddForm}
                  sx={{
                    textTransform: "none",
                    fontWeight: 800,
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    boxShadow: "0 4px 14px rgba(99,102,241,0.25)",
                  }}
                >
                  {t("aiCatalog.addProduct")}
                </Button>
              </Tooltip>
              <Tooltip title="Refresh">
                <IconButton color="primary" onClick={fetchProducts}>
                  {loading ? (
                    <CircularProgress size={20} />
                  ) : (
                    <RefreshIcon />
                  )}
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>
      </Fade>

      {/* ── Stats ── */}
      <Fade in timeout={600}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(3, 1fr)",
            },
            gap: 2,
            mb: 3,
          }}
        >
          <StatCard
            icon={<CatalogIcon />}
            label={t("aiCatalog.totalProducts")}
            value={stats.total}
            color="99,102,241"
          />
          <StatCard
            icon={<StockIcon />}
            label={t("aiCatalog.outOfStock")}
            value={stats.outOfStock}
            color="239,68,68"
          />
          <StatCard
            icon={<PriceIcon />}
            label={t("aiCatalog.avgPrice")}
            value={stats.avgPrice}
            color="34,197,94"
          />
        </Box>
      </Fade>

      {/* ── Error ── */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ── Products Table ── */}
      <Fade in timeout={800}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: isDark
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(0,0,0,0.02)",
                  }}
                >
                  <TableCell sx={{ fontWeight: 800, width: 60 }}>
                    {t("aiCatalog.image")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>
                    {t("aiCatalog.title")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>
                    {t("aiCatalog.sku")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="center">
                    {t("aiCatalog.price")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="center">
                    {t("aiCatalog.stock")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="center">
                    {t("aiCatalog.variants")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 140 }} align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton
                            animation="wave"
                            height={24}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                      <Stack alignItems="center" spacing={2}>
                        <CatalogIcon
                          sx={{ fontSize: 56, color: "text.disabled" }}
                        />
                        <Typography color="text.secondary" fontWeight={600}>
                          {t("aiCatalog.empty")}
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={openAddForm}
                          sx={{ textTransform: "none" }}
                        >
                          {t("aiCatalog.addProduct")}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => {
                    let thumb = product.mainImage || "";
                    if (!thumb && product.images) {
                      try {
                        const imgs = JSON.parse(product.images);
                        thumb = Array.isArray(imgs) ? imgs[0] || "" : "";
                      } catch {
                        /* empty */
                      }
                    }
                    const variantCount = product.variants?.length || 0;

                    return (
                      <TableRow
                        key={product.id}
                        hover
                        sx={{
                          "&:last-child td": { borderBottom: 0 },
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onClick={() => openEditForm(product)}
                      >
                        {/* Image */}
                        <TableCell>
                          <Avatar
                            variant="rounded"
                            src={thumb}
                            sx={{
                              width: 44,
                              height: 44,
                              bgcolor: isDark
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(0,0,0,0.04)",
                            }}
                          >
                            <ImageIcon sx={{ fontSize: 20 }} />
                          </Avatar>
                        </TableCell>
                        {/* Name */}
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            noWrap
                            sx={{ maxWidth: 220 }}
                          >
                            {product.name}
                          </Typography>
                        </TableCell>
                        {/* SKU */}
                        <TableCell>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontFamily: "monospace" }}
                          >
                            {product.sku || "—"}
                          </Typography>
                        </TableCell>
                        {/* Price */}
                        <TableCell align="center">
                          <Chip
                            label={`${product.price?.toFixed(2)}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                          />
                        </TableCell>
                        {/* Stock */}
                        <TableCell align="center">
                          <Chip
                            label={product.stock}
                            size="small"
                            color={product.stock > 0 ? "success" : "error"}
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                          />
                        </TableCell>
                        {/* Variants */}
                        <TableCell align="center">
                          {variantCount > 0 ? (
                            <Chip
                              icon={<ColorIcon sx={{ fontSize: 14 }} />}
                              label={variantCount}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: "0.7rem" }}
                            />
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        {/* Actions */}
                        <TableCell align="center">
                          <Stack
                            direction="row"
                            spacing={0.5}
                            justifyContent="center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Tooltip title={t("aiCatalog.editProduct")}>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => openEditForm(product)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Duplicate">
                              <IconButton
                                size="small"
                                onClick={() => handleDuplicate(product)}
                              >
                                <DuplicateIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setDeleteTarget(product)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {!loading && products.length > 0 && (
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage=""
              sx={{ borderTop: "1px solid", borderColor: "divider" }}
            />
          )}
        </Paper>
      </Fade>

      {/* ── Form Drawer ── */}
      <ProductFormDrawer
        open={drawerOpen}
        formData={formData}
        onChange={setFormData}
        onSave={handleSave}
        onClose={() => {
          // cleanup blob URLs
          if (formData._mainImagePreview)
            URL.revokeObjectURL(formData._mainImagePreview);
          formData.variants.forEach((v) => {
            if (v._localPreview) URL.revokeObjectURL(v._localPreview);
          });
          setDrawerOpen(false);
        }}
        saving={saving}
      />

      {/* ── Delete Confirm Dialog ── */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={900}>
          <Stack direction="row" spacing={1} alignItems="center">
            <DeleteIcon color="error" />
            <Typography fontWeight={900}>{t("aiCatalog.deleteConfirm")}</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {deleteTarget?.name}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
          >
            {t("aiCatalog.cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={
              deleting ? <CircularProgress size={16} /> : <DeleteIcon />
            }
          >
            {deleting ? "..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: "100%", fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
