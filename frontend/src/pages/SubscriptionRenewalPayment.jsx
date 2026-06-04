import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  IconButton,
  TextField,
  Stepper,
  Step,
  StepLabel,
  Divider,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  ArrowBack as BackIcon,
} from "@mui/icons-material";
import { useAuth } from "../hooks/useAuthSimple";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/apiClient";

const SubscriptionRenewalPayment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [walletNumbers, setWalletNumbers] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [subscription, setSubscription] = useState(null);

  const steps = ["اختيار المحفظة", "رفع الإيصال", "تأكيد الإرسال"];

  useEffect(() => {
    fetchWalletNumbers();
    fetchSubscription();
  }, []);

  const fetchWalletNumbers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/wallet-payment/wallet-numbers");
      if (response.data.success) {
        setWalletNumbers(response.data.data);
      }
    } catch (error) {
      console.error("خطأ في جلب أرقام المحافظ:", error);
      showSnackbar("خطأ في جلب أرقام المحافظ", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      // بيانات وهمية للاشتراك
      const mockSubscription = {
        id: "mock-subscription",
        price: 7500,
        currency: "EGP",
      };
      setSubscription(mockSubscription);
    } catch (error) {
      console.error("خطأ في جلب الاشتراك:", error);
    }
  };

  const copyToClipboard = (text, walletName) => {
    navigator.clipboard.writeText(text).then(() => {
      showSnackbar(`تم نسخ رقم ${walletName}`, "success");
    });
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
    setTimeout(() => setSnackbar({ ...snackbar, open: false }), 3000);
  };

  const handleWalletSelect = (wallet) => {
    setSelectedWallet(wallet);
    setActiveStep(1);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showSnackbar("حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت", "error");
        return;
      }
      if (!file.type.startsWith("image/")) {
        showSnackbar("يرجى اختيار ملف صورة فقط", "error");
        return;
      }
      setReceiptFile(file);
      setActiveStep(2);
    }
  };

  const handleSubmitReceipt = async () => {
    if (!receiptFile || !selectedWallet) {
      showSnackbar("يرجى اختيار المحفظة ورفع الإيصال", "error");
      return;
    }

    try {
      setUploadLoading(true);

      const formData = new FormData();
      formData.append("receipt", receiptFile);
      formData.append("walletNumberId", selectedWallet.id);
      formData.append("subscriptionId", subscription?.id || "renewal");
      formData.append("amount", subscription?.price || 7500);
      formData.append("purpose", "subscription_renewal");

      const response = await apiClient.post(
        "/wallet-payment/submit-receipt",
        formData,
      );

      if (response.data.success) {
        showSnackbar("تم إرسال الإيصال بنجاح! سيتم مراجعته قريباً", "success");
        setTimeout(() => {
          navigate("/subscription");
        }, 2000);
      } else {
        showSnackbar(response.data.message || "خطأ في إرسال الإيصال", "error");
      }
    } catch (error) {
      console.error("خطأ في رفع الإيصال:", error);
      showSnackbar("خطأ في إرسال الإيصال", "error");
    } finally {
      setUploadLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3} maxWidth={900} mx="auto">
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate("/subscription")} sx={{ mr: 2 }}>
          <BackIcon />
        </IconButton>
        <Typography variant="h4">💳 دفع تجديد الاشتراك</Typography>
      </Box>

      {/* Stepper */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* معلومات المبلغ */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            💰 تفاصيل الدفع
          </Typography>
          <Typography variant="h5" color="primary" fontWeight="bold">
            المبلغ المطلوب: {formatCurrency(subscription?.price || 7500)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            رسوم تجديد الاشتراك الشهري
          </Typography>
        </CardContent>
      </Card>

      {/* Step 1: اختيار المحفظة */}
      {activeStep >= 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              1️⃣ اختر رقم المحفظة للتحويل
            </Typography>

            <Grid container spacing={2}>
              {walletNumbers.map((wallet) => (
                <Grid item xs={12} sm={6} key={wallet.id}>
                  <Paper
                    sx={{
                      p: 2,
                      border: selectedWallet?.id === wallet.id ? 2 : 1,
                      borderColor:
                        selectedWallet?.id === wallet.id
                          ? "primary.main"
                          : "divider",
                      cursor: "pointer",
                      "&:hover": { borderColor: "primary.main" },
                    }}
                    onClick={() => handleWalletSelect(wallet)}
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {wallet.icon} {wallet.name}
                        </Typography>
                        <Typography
                          variant="h6"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {wallet.number}
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(wallet.number, wallet.name);
                          }}
                          color="primary"
                          size="small"
                        >
                          <CopyIcon />
                        </IconButton>
                        {selectedWallet?.id === wallet.id && (
                          <CheckIcon color="success" sx={{ ml: 1 }} />
                        )}
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Step 2: رفع الإيصال */}
      {activeStep >= 1 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              2️⃣ ارفع صورة إيصال التحويل
            </Typography>

            {selectedWallet && (
              <Alert severity="info" sx={{ mb: 2 }}>
                تم اختيار: {selectedWallet.icon} {selectedWallet.name} -{" "}
                {selectedWallet.number}
              </Alert>
            )}

            <Box
              sx={{
                border: "2px dashed",
                borderColor: receiptFile ? "success.main" : "grey.300",
                borderRadius: 2,
                p: 3,
                textAlign: "center",
                backgroundColor: receiptFile ? "success.50" : "grey.50",
              }}
            >
              <input
                accept="image/*"
                style={{ display: "none" }}
                id="receipt-upload"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="receipt-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={receiptFile ? <CheckIcon /> : <UploadIcon />}
                  size="large"
                  color={receiptFile ? "success" : "primary"}
                >
                  {receiptFile ? "تم رفع الإيصال" : "اختر صورة الإيصال"}
                </Button>
              </label>

              {receiptFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {receiptFile.name}
                </Typography>
              )}

              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                الحد الأقصى: 5 ميجابايت | الصيغ المدعومة: JPG, PNG, GIF
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Step 3: تأكيد الإرسال */}
      {activeStep >= 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              3️⃣ تأكيد وإرسال
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" gutterBottom>
                <strong>المحفظة المختارة:</strong> {selectedWallet?.name} -{" "}
                {selectedWallet?.number}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>المبلغ:</strong>{" "}
                {formatCurrency(subscription?.price || 7500)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>الإيصال:</strong> {receiptFile?.name}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box textAlign="center">
              <Button
                variant="contained"
                size="large"
                onClick={handleSubmitReceipt}
                disabled={uploadLoading || !receiptFile || !selectedWallet}
                sx={{ px: 4, py: 1.5 }}
              >
                {uploadLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    جاري الإرسال...
                  </>
                ) : (
                  "إرسال الإيصال للمراجعة"
                )}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Snackbar */}
      {snackbar.open && (
        <Alert
          severity={snackbar.severity}
          sx={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 1000,
          }}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      )}
    </Box>
  );
};

export default SubscriptionRenewalPayment;
