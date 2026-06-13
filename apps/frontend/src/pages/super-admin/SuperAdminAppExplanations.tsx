import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayCircleOutline as VideoIcon,
  TextSnippet as TextIcon,
} from "@mui/icons-material";
import { apiClient } from "../../services/apiClient";

interface AppExplanation {
  id: string;
  title: string;
  content: string;
  slug: string;
  targetRoute: string;
  videoUrl: string | null;
  isActive: boolean;
  order: number;
  createdAt: string;
}

// Common route options for the dropdown
const ROUTE_OPTIONS = [
  { value: "/company-dashboard", label: "لوحة التحكم الرئيسية" },
  { value: "/products", label: "المنتجات" },
  { value: "/orders", label: "الطلبات" },
  { value: "/customers", label: "العملاء" },
  { value: "/conversations", label: "المحادثات" },
  { value: "/broadcast", label: "الحملات والرسائل" },
  { value: "/invoices", label: "الفواتير" },
  { value: "/settings", label: "الإعدادات" },
  { value: "/facebook-inbox", label: "رسائل فيسبوك" },
  { value: "/affiliate", label: "المسوقين" },
  { value: "/coupons", label: "الكوبونات" },
  { value: "/marketplace", label: "متجر التطبيقات" },
  { value: "/wallet", label: "المحفظة" },
  { value: "/analytics", label: "التحليلات" },
  { value: "/hr", label: "الموارد البشرية" },
  { value: "/attendance", label: "الحضور والانصراف" },
  { value: "/tasks", label: "المهام" },
];

const SuperAdminAppExplanations: React.FC = () => {
  const [explanations, setExplanations] = useState<AppExplanation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [useCustomRoute, setUseCustomRoute] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    slug: "",
    targetRoute: "",
    videoUrl: "",
    isActive: true,
    order: 0,
  });

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchExplanations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/app-explanations/admin");
      const data = res.data as any;
      if (data.success) {
        setExplanations(data.explanations);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "فشل في جلب الشروحات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplanations();
  }, []);

  const getRouteLabel = (route: string) => {
    const found = ROUTE_OPTIONS.find((r) => r.value === route);
    return found ? found.label : route || "—";
  };

  const handleOpenDialog = (exp?: AppExplanation) => {
    if (exp) {
      setEditMode(true);
      setCurrentId(exp.id);
      const isCustom = !ROUTE_OPTIONS.find((r) => r.value === exp.targetRoute);
      setUseCustomRoute(isCustom && exp.targetRoute !== "");
      setFormData({
        title: exp.title,
        content: exp.content,
        slug: exp.slug,
        targetRoute: exp.targetRoute,
        videoUrl: exp.videoUrl || "",
        isActive: exp.isActive,
        order: exp.order,
      });
    } else {
      setEditMode(false);
      setCurrentId(null);
      setUseCustomRoute(false);
      setFormData({
        title: "",
        content: "",
        slug: "",
        targetRoute: "",
        videoUrl: "",
        isActive: true,
        order: 0,
      });
    }
    setSubmitError(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
          ? parseInt(value) || 0
          : value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setSubmitLoading(true);
      setSubmitError(null);

      if (editMode && currentId) {
        await apiClient.put(`/app-explanations/admin/${currentId}`, formData);
      } else {
        await apiClient.post("/app-explanations/admin", formData);
      }

      setOpenDialog(false);
      fetchExplanations();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.response?.data?.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الشرح؟")) return;
    try {
      await apiClient.delete(`/app-explanations/admin/${id}`);
      fetchExplanations();
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء الحذف");
    }
  };

  if (loading && explanations.length === 0) {
    return (
      <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, direction: "rtl" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            شرح التطبيقات
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            أضف شروحات وفيديوهات تظهر للتاجر في الشريط العلوي بناءً على الصفحة
            التي يزورها
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ height: "fit-content" }}
        >
          إضافة شرح جديد
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>العنوان</TableCell>
              <TableCell>يظهر في صفحة</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الترتيب</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {explanations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  لا توجد شروحات مضافة بعد
                </TableCell>
              </TableRow>
            ) : (
              explanations.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell>{exp.title}</TableCell>
                  <TableCell>
                    <Chip
                      label={getRouteLabel(exp.targetRoute)}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {exp.videoUrl ? (
                      <Chip
                        icon={<VideoIcon />}
                        label="فيديو"
                        size="small"
                        color="error"
                        variant="outlined"
                      />
                    ) : (
                      <Chip
                        icon={<TextIcon />}
                        label="نص"
                        size="small"
                        color="default"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>{exp.order}</TableCell>
                  <TableCell>
                    <Chip
                      label={exp.isActive ? "نشط" : "غير نشط"}
                      size="small"
                      color={exp.isActive ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(exp)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(exp.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>
          {editMode ? "تعديل الشرح" : "إضافة شرح جديد"}
        </DialogTitle>
        <DialogContent dividers>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          <Box
            sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}
          >
            <TextField
              label="العنوان (يظهر كزر في الشريط العلوي للتاجر)"
              name="title"
              value={formData.title}
              onChange={handleChange}
              fullWidth
              required
              placeholder="مثال: كيفية إنشاء منتج بسيط"
            />
            <TextField
              label="الرابط التعريفي (slug) بالانجليزية وبدون مسافات"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              fullWidth
              required
              placeholder="مثال: create-simple-product"
            />

            {/* Target Route Selection */}
            <Box>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  يظهر في أي صفحة؟
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={useCustomRoute}
                      onChange={(e) => {
                        setUseCustomRoute(e.target.checked);
                        if (!e.target.checked) {
                          setFormData((prev) => ({
                            ...prev,
                            targetRoute: "",
                          }));
                        }
                      }}
                    />
                  }
                  label="مسار مخصص"
                />
              </Box>
              {useCustomRoute ? (
                <TextField
                  label="المسار المخصص (مثال: /products/add)"
                  name="targetRoute"
                  value={formData.targetRoute}
                  onChange={handleChange}
                  fullWidth
                  placeholder="/products/add"
                  helperText="اكتب المسار بالضبط كما يظهر في شريط العنوان"
                />
              ) : (
                <FormControl fullWidth>
                  <InputLabel>اختر الصفحة</InputLabel>
                  <Select
                    value={formData.targetRoute}
                    label="اختر الصفحة"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        targetRoute: e.target.value as string,
                      }))
                    }
                  >
                    <MenuItem value="">
                      <em>— كل الصفحات —</em>
                    </MenuItem>
                    {ROUTE_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label} ({opt.value})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>

            <TextField
              label="رابط الفيديو (اختياري - يوتيوب أو أي رابط)"
              name="videoUrl"
              value={formData.videoUrl}
              onChange={handleChange}
              fullWidth
              placeholder="https://www.youtube.com/watch?v=..."
              helperText="إذا أضفت رابط فيديو، سيظهر أيقونة فيديو بجانب الزر. إذا تركته فارغاً سيظهر كشرح نصي."
            />

            <TextField
              label="الترتيب"
              name="order"
              type="number"
              value={formData.order}
              onChange={handleChange}
              fullWidth
            />

            <TextField
              label="محتوى الشرح (نص أو HTML)"
              name="content"
              value={formData.content}
              onChange={handleChange}
              multiline
              rows={6}
              fullWidth
              required
              helperText="يظهر عند الضغط على الزر إذا لم يكن هناك فيديو، أو كنص مرافق تحت الفيديو."
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={handleChange}
                  name="isActive"
                  color="primary"
                />
              }
              label="مفعّل ويظهر للتاجر"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={
              submitLoading ||
              !formData.title ||
              !formData.slug ||
              !formData.content
            }
          >
            {submitLoading ? <CircularProgress size={24} /> : "حفظ"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminAppExplanations;
