import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  IconButton,
  Snackbar,
  Paper,
  Divider,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { apiClient } from "../services/apiClient";

const PaymentPage = () => {
  const { invoiceId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [walletNumbers, setWalletNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  useEffect(() => {
    fetchInvoiceData();
    fetchWalletNumbers();
  }, [invoiceId]);

  const fetchInvoiceData = async () => {
    try {
      const response = await apiClient.get(
        `/wallet-payment/invoice/${invoiceId}`,
      );
      if (response.data.success) {
        setInvoice(response.data.data);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error("خطأ في جلب الفاتورة:", error);
      setError("خطأ في جلب بيانات الفاتورة");
    }
  };

  const fetchWalletNumbers = async () => {
    try {
      const response = await apiClient.get("/wallet-payment/wallet-numbers");
      if (response.data.success) {
        setWalletNumbers(response.data.data);
      }
    } catch (error) {
      console.error("خطأ في جلب أرقام المحافظ:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, walletName) => {
    navigator.clipboard.writeText(text).then(() => {
      setSnackbar({
        open: true,
        message: `تم نسخ رقم ${walletName}`,
        severity: "success",
      });
    });
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSnackbar({
          open: true,
          message: "حجم الملف يجب أن يكون أقل من 5 ميجابايت",
          severity: "error",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const submitReceipt = async (walletNumberId) => {
    if (!selectedFile) {
      setSnackbar({
        open: true,
        message: "يرجى اختيار صورة الإيصال أولاً",
        severity: "warning",
      });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("receipt", selectedFile);
    formData.append("invoiceId", invoiceId);
    formData.append("walletNumberId", walletNumberId);

    try {
      const response = await apiClient.post(
        "/wallet-payment/submit-receipt",
        formData,
      );

      if (response.data.success) {
        setSubmitted(true);
        setSnackbar({
          open: true,
          message: "تم إرسال الإيصال بنجاح! سيتم مراجعته قريباً",
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: response.data.message,
          severity: "error",
        });
      }
    } catch (error) {
      console.error("خطأ في إرسال الإيصال:", error);
      setSnackbar({
        open: true,
        message: "خطأ في إرسال الإيصال",
        severity: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        className="bg-gray-50 dark:bg-gray-900"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3} className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Alert
          severity="error"
          sx={{ maxWidth: 600, mx: "auto" }}
          className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
        >
          {error}
        </Alert>
      </Box>
    );
  }

  if (submitted) {
    return (
      <Box
        p={3}
        maxWidth={600}
        mx="auto"
        className="min-h-screen bg-gray-50 dark:bg-gray-900"
      >
        <Card className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700">
          <CardContent sx={{ textAlign: "center", py: 4 }}>
            <CheckIcon
              sx={{ fontSize: 64, color: "success.main", mb: 2 }}
              className="text-green-600 dark:text-green-400"
            />
            <Typography
              variant="h5"
              gutterBottom
              className="text-gray-900 dark:text-white"
            >
              تم إرسال الإيصال بنجاح!
            </Typography>
            <Typography
              variant="body1"
              className="text-gray-600 dark:text-gray-400"
            >
              سيتم مراجعة إيصال الدفع وتأكيد الدفع خلال 24 ساعة
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      p={3}
      maxWidth={800}
      mx="auto"
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
    >
      <Typography
        variant="h4"
        gutterBottom
        textAlign="center"
        sx={{ mb: 4 }}
        className="text-gray-900 dark:text-white"
      >
        🧾 دفع الفاتورة
      </Typography>

      {/* تفاصيل الفاتورة */}
      <Card
        sx={{ mb: 3 }}
        className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700"
      >
        <CardContent>
          <Typography
            variant="h6"
            gutterBottom
            className="text-gray-900 dark:text-white font-semibold"
          >
            تفاصيل الفاتورة
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="body2"
                className="text-gray-600 dark:text-gray-400"
              >
                رقم الفاتورة
              </Typography>
              <Typography
                variant="body1"
                className="font-bold text-gray-900 dark:text-white"
              >
                {invoice?.invoiceNumber}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="body2"
                className="text-gray-600 dark:text-gray-400"
              >
                الشركة
              </Typography>
              <Typography
                variant="body1"
                className="font-bold text-gray-900 dark:text-white"
              >
                {invoice?.company?.name}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="body2"
                className="text-gray-600 dark:text-gray-400"
              >
                المبلغ المطلوب
              </Typography>
              <Typography
                variant="h6"
                className="font-bold text-blue-600 dark:text-blue-400"
              >
                {formatCurrency(invoice?.totalAmount)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="body2"
                className="text-gray-600 dark:text-gray-400"
              >
                تاريخ الاستحقاق
              </Typography>
              <Typography
                variant="body1"
                className="font-bold text-gray-900 dark:text-white"
              >
                {formatDate(invoice?.dueDate)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* أرقام المحافظ */}
      <Card
        sx={{ mb: 3 }}
        className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700"
      >
        <CardContent>
          <Typography
            variant="h6"
            gutterBottom
            className="text-gray-900 dark:text-white font-semibold"
          >
            💳 أرقام المحافظ المتاحة
          </Typography>
          <Typography
            variant="body2"
            sx={{ mb: 2 }}
            className="text-gray-600 dark:text-gray-400"
          >
            اختر رقم المحفظة المناسب وانسخه لإجراء التحويل
          </Typography>

          <Grid container spacing={2}>
            {walletNumbers.map((wallet) => (
              <Grid item xs={12} sm={6} key={wallet.id}>
                <Paper
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: "divider",
                    "&:hover": { borderColor: "primary.main" },
                  }}
                  className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography
                        variant="subtitle1"
                        className="font-bold text-gray-900 dark:text-white"
                      >
                        {wallet.icon} {wallet.name}
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{ fontFamily: "monospace" }}
                        className="text-gray-700 dark:text-gray-300"
                      >
                        {wallet.number}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={() =>
                        copyToClipboard(wallet.number, wallet.name)
                      }
                      size="small"
                      className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <CopyIcon />
                    </IconButton>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* رفع الإيصال */}
      <Card className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700">
        <CardContent>
          <Typography
            variant="h6"
            gutterBottom
            className="text-gray-900 dark:text-white font-semibold"
          >
            📸 رفع إيصال التحويل
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              sx={{ mb: 2 }}
              className="text-gray-600 dark:text-gray-400"
            >
              📝 التعليمات:
            </Typography>
            <Box component="ol" sx={{ pl: 2 }}>
              <Typography
                component="li"
                variant="body2"
                sx={{ mb: 1 }}
                className="text-gray-700 dark:text-gray-300"
              >
                انسخ رقم المحفظة المناسب
              </Typography>
              <Typography
                component="li"
                variant="body2"
                sx={{ mb: 1 }}
                className="text-gray-700 dark:text-gray-300"
              >
                حول المبلغ {formatCurrency(invoice?.totalAmount)} من تليفونك
              </Typography>
              <Typography
                component="li"
                variant="body2"
                sx={{ mb: 1 }}
                className="text-gray-700 dark:text-gray-300"
              >
                التقط صورة واضحة لإيصال التحويل
              </Typography>
              <Typography
                component="li"
                variant="body2"
                className="text-gray-700 dark:text-gray-300"
              >
                ارفع الصورة هنا واضغط إرسال
              </Typography>
            </Box>
          </Box>

          <Divider
            sx={{ my: 2 }}
            className="border-gray-200 dark:border-gray-600"
          />

          <input
            accept="image/*"
            style={{ display: "none" }}
            id="receipt-upload"
            type="file"
            onChange={handleFileSelect}
          />
          <label htmlFor="receipt-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadIcon />}
              fullWidth
              sx={{ mb: 2 }}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              اختر صورة الإيصال
            </Button>
          </label>

          {selectedFile && (
            <Alert
              severity="info"
              sx={{ mb: 2 }}
              className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200"
            >
              تم اختيار الملف: {selectedFile.name}
            </Alert>
          )}

          <Grid container spacing={2}>
            {walletNumbers.map((wallet) => (
              <Grid item xs={12} sm={6} key={wallet.id}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => submitReceipt(wallet.id)}
                  disabled={!selectedFile || uploading}
                  sx={{
                    backgroundColor: wallet.color,
                    "&:hover": {
                      backgroundColor: wallet.color,
                      opacity: 0.8,
                    },
                  }}
                >
                  {uploading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    `إرسال إيصال ${wallet.name}`
                  )}
                </Button>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PaymentPage;
