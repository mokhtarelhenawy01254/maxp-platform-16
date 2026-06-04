import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Percent as PercentIcon,
  AttachMoney as MoneyIcon,
} from "@mui/icons-material";
import { apiClient } from "../services/apiClient";

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
  const [discounts, setDiscounts] = useState<VolumeDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<VolumeDiscount | null>(
    null,
  );
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    minQuantity: 2,
    maxQuantity: null as number | null,
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: 10,
    isActive: true,
  });

  useEffect(() => {
    if (productId) {
      fetchDiscounts();
    }
  }, [productId]);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/products/${productId}/volume-discounts`,
      );

      if (response.data.success) {
        setDiscounts(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching volume discounts:", error);
      setMessage({
        type: "error",
        text: "فشل في جلب خصومات الكميات",
      });
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
      setFormData({
        minQuantity: 2,
        maxQuantity: null,
        discountType: "percentage",
        discountValue: 10,
        isActive: true,
      });
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
        // Update
        await apiClient.put(
          `/products/${productId}/volume-discounts/${editingDiscount.id}`,
          formData,
        );
        setMessage({ type: "success", text: "تم تحديث الخصم بنجاح" });
      } else {
        // Create
        await apiClient.post(
          `/products/${productId}/volume-discounts`,
          formData,
        );
        setMessage({ type: "success", text: "تم إضافة الخصم بنجاح" });
      }

      handleCloseDialog();
      fetchDiscounts();
    } catch (error: any) {
      console.error("Error saving volume discount:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "فشل في حفظ الخصم",
      });
    }
  };

  const handleDelete = async (discountId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الخصم؟")) {
      return;
    }

    try {
      await apiClient.delete(
        `/products/${productId}/volume-discounts/${discountId}`,
      );
      setMessage({ type: "success", text: "تم حذف الخصم بنجاح" });
      fetchDiscounts();
    } catch (error: any) {
      console.error("Error deleting volume discount:", error);
      setMessage({
        type: "error",
        text: "فشل في حذف الخصم",
      });
    }
  };

  const formatDiscount = (discount: VolumeDiscount) => {
    if (discount.discountType === "percentage") {
      return `${discount.discountValue}%`;
    } else {
      return `${discount.discountValue} جنيه`;
    }
  };

  const formatQuantityRange = (discount: VolumeDiscount) => {
    if (discount.maxQuantity) {
      return `${discount.minQuantity} - ${discount.maxQuantity}`;
    } else {
      return `${discount.minQuantity}+`;
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h6" gutterBottom>
            💰 خصومات الكميات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            قم بإضافة خصومات تلقائية عند شراء كميات معينة من المنتج
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          إضافة خصم
        </Button>
      </Box>

      {message && (
        <Alert
          severity={message.type}
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>نطاق الكمية</TableCell>
                  <TableCell>نوع الخصم</TableCell>
                  <TableCell>قيمة الخصم</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {discounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Box py={3}>
                        <PercentIcon
                          sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          لا توجد خصومات كميات. قم بإضافة خصم لتحفيز العملاء على
                          الشراء بكميات أكبر
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  discounts.map((discount) => (
                    <TableRow key={discount.id}>
                      <TableCell>
                        {formatQuantityRange(discount)} قطعة
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={
                            discount.discountType === "percentage" ? (
                              <PercentIcon />
                            ) : (
                              <MoneyIcon />
                            )
                          }
                          label={
                            discount.discountType === "percentage"
                              ? "نسبة مئوية"
                              : "مبلغ ثابت"
                          }
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color="success.main"
                        >
                          {formatDiscount(discount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={discount.isActive ? "نشط" : "معطل"}
                          color={discount.isActive ? "success" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(discount)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(discount.id)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {discounts.length > 0 && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "info.light", borderRadius: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                gutterBottom
                display="block"
              >
                💡 نصيحة:
              </Typography>
              <Typography variant="body2">
                تأكد من عدم تداخل نطاقات الكميات. سيتم تطبيق الخصم تلقائياً عند
                إضافة المنتج للسلة.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingDiscount ? "تعديل خصم الكمية" : "إضافة خصم كمية جديد"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              label="الحد الأدنى للكمية"
              type="number"
              fullWidth
              required
              value={formData.minQuantity}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  minQuantity: parseInt(e.target.value) || 1,
                })
              }
              InputProps={{ inputProps: { min: 1 } }}
              helperText="الكمية التي يبدأ عندها الخصم"
            />

            <TextField
              label="الحد الأقصى للكمية (اختياري)"
              type="number"
              fullWidth
              value={formData.maxQuantity || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxQuantity: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              InputProps={{ inputProps: { min: formData.minQuantity } }}
              helperText="اتركه فارغاً لعدم وجود حد أقصى"
            />

            <FormControl fullWidth required>
              <InputLabel>نوع الخصم</InputLabel>
              <Select
                value={formData.discountType}
                label="نوع الخصم"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discountType: e.target.value as "percentage" | "fixed",
                  })
                }
              >
                <MenuItem value="percentage">
                  <Box display="flex" alignItems="center" gap={1}>
                    <PercentIcon fontSize="small" />
                    نسبة مئوية
                  </Box>
                </MenuItem>
                <MenuItem value="fixed">
                  <Box display="flex" alignItems="center" gap={1}>
                    <MoneyIcon fontSize="small" />
                    مبلغ ثابت
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              label={
                formData.discountType === "percentage"
                  ? "نسبة الخصم (%)"
                  : "مبلغ الخصم (جنيه)"
              }
              type="number"
              fullWidth
              required
              value={formData.discountValue}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  discountValue: parseFloat(e.target.value) || 0,
                })
              }
              InputProps={{
                inputProps: {
                  min: 0,
                  max: formData.discountType === "percentage" ? 100 : undefined,
                  step: formData.discountType === "percentage" ? 1 : 5,
                },
              }}
              helperText={
                formData.discountType === "percentage"
                  ? "النسبة المئوية للخصم (0-100)"
                  : "المبلغ الذي سيتم خصمه من السعر"
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
              }
              label="تفعيل الخصم"
            />

            {/* Preview */}
            <Box sx={{ p: 2, bgcolor: "success.light", borderRadius: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                gutterBottom
                display="block"
              >
                معاينة:
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                عند شراء {formData.minQuantity}
                {formData.maxQuantity ? ` - ${formData.maxQuantity}` : "+"}{" "}
                قطعة، سيحصل العميل على خصم {formData.discountValue}
                {formData.discountType === "percentage" ? "%" : " جنيه"}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button onClick={handleSave} variant="contained">
            {editingDiscount ? "تحديث" : "إضافة"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VolumeDiscounts;
