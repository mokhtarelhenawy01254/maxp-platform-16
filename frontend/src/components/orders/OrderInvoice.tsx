import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
  Print as PrintIcon,
} from "@mui/icons-material";

interface OrderInvoiceProps {
  orderId?: string;
  invoiceId?: string;
}

interface InvoiceSettings {
  showCompanyLogo: boolean;
  showTaxBreakdown: boolean;
  showPaymentMethod: boolean;
  showOrderItems: boolean;
  pdfPageSize: string;
  pdfOrientation: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

interface InvoiceOrderItem {
  id?: string;
  productName: string;
  quantity: number;
  price: number | string;
  total?: number | string;
  totalPrice?: number | string;
  variantName?: string | null;
  productColor?: string | null;
  productSize?: string | null;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string | null;
  subtotal: number | string;
  tax: number | string;
  taxRate?: number;
  shipping: number | string;
  discount: number | string;
  totalAmount: number | string;
  currency: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  city?: string | null;
  governorate?: string | null;
  companyName: string;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyAddress?: string | null;
  companyLogo?: string | null;
  paymentMethod?: string | null;
  paymentStatus: string;
  notes?: string | null;
  terms?: string | null;
  printCount: number;
  order?: {
    orderNumber?: string;
    status?: string;
    orderItems?: InvoiceOrderItem[];
  };
}

interface ApiErrorShape {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

type PaymentStatusColor = "default" | "success" | "warning" | "error" | "info";

const defaultSettings: InvoiceSettings = {
  showCompanyLogo: true,
  showTaxBreakdown: true,
  showPaymentMethod: true,
  showOrderItems: true,
  pdfPageSize: "A4",
  pdfOrientation: "portrait",
  primaryColor: "#4F46E5",
  secondaryColor: "#6B7280",
  fontFamily: "Arial",
};

const pageWidths: Record<string, { portrait: string; landscape: string }> = {
  A4: { portrait: "210mm", landscape: "297mm" },
  A5: { portrait: "148mm", landscape: "210mm" },
  LETTER: { portrait: "216mm", landscape: "279mm" },
  Letter: { portrait: "216mm", landscape: "279mm" },
  Legal: { portrait: "216mm", landscape: "356mm" },
};

const parseNumber = (value: number | string | null | undefined) =>
  Number(value || 0);

const getErrorMessage = (error: unknown, fallback: string) => {
  const typedError = error as ApiErrorShape;
  return typedError.response?.data?.message || typedError.message || fallback;
};

const OrderInvoice: React.FC<OrderInvoiceProps> = ({ orderId, invoiceId }) => {
  const params = useParams();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [settings, setSettings] = useState<InvoiceSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);

  const finalOrderId = orderId || params["orderId"];
  const finalInvoiceId = invoiceId || params["invoiceId"];

  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let response;
      if (finalInvoiceId) {
        response = await apiClient.get(`/order-invoices/${finalInvoiceId}`);
      } else if (finalOrderId) {
        response = await apiClient.get(`/order-invoices/order/${finalOrderId}`);
      } else {
        throw new Error("يجب تحديد رقم الطلب أو رقم الفاتورة");
      }

      setInvoice(response.data.data);
    } catch (err: unknown) {
      console.error("Error fetching invoice:", err);
      setError(getErrorMessage(err, "خطأ في جلب الفاتورة"));
    } finally {
      setLoading(false);
    }
  }, [finalInvoiceId, finalOrderId]);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await apiClient.get("/order-invoice-settings");
      if (response.data?.success && response.data?.data) {
        setSettings((prev) => ({
          ...prev,
          ...response.data.data,
        }));
      }
    } catch (err) {
      console.warn("Could not load invoice settings, using defaults.", err);
    }
  }, []);

  useEffect(() => {
    void fetchInvoice();
  }, [fetchInvoice]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldPrint = urlParams.get("print") === "true";

    if (shouldPrint && invoice && !loading) {
      setTimeout(() => {
        window.print();
      }, 1200);
    }
  }, [invoice, loading]);

  const handlePrint = async () => {
    if (!invoice) {
      return;
    }

    try {
      setPrinting(true);
      await apiClient.post(`/order-invoices/${invoice.id}/print`);
      window.print();
    } catch (err: unknown) {
      console.error("Error printing invoice:", err);
    } finally {
      setPrinting(false);
    }
  };

  const handleEmail = async () => {
    if (!invoice) {
      return;
    }

    try {
      await apiClient.post(`/order-invoices/${invoice.id}/email`);
      alert("تم إرسال الفاتورة بنجاح");
    } catch (err: unknown) {
      console.error("Error emailing invoice:", err);
      alert("خطأ في إرسال الفاتورة");
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string = "EGP") => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const getPaymentStatusColor = (status: string): PaymentStatusColor => {
    const colors: Record<string, PaymentStatusColor> = {
      PAID: "success",
      COMPLETED: "success",
      PENDING: "warning",
      CANCELLED: "error",
      REFUNDED: "info",
      PARTIALLY_PAID: "warning",
    };
    return colors[status] || "default";
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PAID: "مدفوعة",
      COMPLETED: "مدفوعة",
      PENDING: "قيد الانتظار",
      CANCELLED: "ملغاة",
      REFUNDED: "مستردة",
      PARTIALLY_PAID: "مدفوعة جزئياً",
    };
    return labels[status] || status;
  };

  const getItemTotal = (item: InvoiceOrderItem) => {
    const explicitTotal = item.total ?? item.totalPrice;
    if (explicitTotal !== undefined && explicitTotal !== null) {
      return parseNumber(explicitTotal);
    }

    return parseNumber(item.price) * parseNumber(item.quantity);
  };

  const normalizedPageSize = settings.pdfPageSize || "A4";
  const normalizedOrientation =
    settings.pdfOrientation === "landscape" ? "landscape" : "portrait";
  const maxWidth =
    pageWidths[normalizedPageSize]?.[normalizedOrientation] ||
    pageWidths["A4"]![normalizedOrientation];
  const primaryColor = settings.primaryColor || defaultSettings.primaryColor;
  const secondaryColor =
    settings.secondaryColor || defaultSettings.secondaryColor;
  const showCompanyLogo = settings.showCompanyLogo !== false;
  const showTaxBreakdown = settings.showTaxBreakdown !== false;
  const showPaymentMethod = settings.showPaymentMethod !== false;
  const showOrderItems = settings.showOrderItems !== false;

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

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          رجوع
        </Button>
      </Box>
    );
  }

  if (!invoice) {
    return (
      <Box p={3}>
        <Alert severity="warning">الفاتورة غير موجودة</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          رجوع
        </Button>
      </Box>
    );
  }

  return (
    <Box
      dir="rtl"
      sx={{
        minHeight: "100vh",
        bgcolor: "#f8fafc",
        px: { xs: 2, md: 3 },
        py: 3,
        fontFamily: settings.fontFamily || defaultSettings.fontFamily,
      }}
    >
      <Box
        className="no-print"
        sx={{ mb: 3, display: "flex", gap: 2, flexWrap: "wrap" }}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
        >
          رجوع
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          disabled={printing}
        >
          طباعة
        </Button>
        <Button
          variant="outlined"
          startIcon={<EmailIcon />}
          onClick={handleEmail}
        >
          إرسال بالبريد
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handlePrint}
        >
          تحميل PDF
        </Button>
      </Box>

      <Paper
        ref={printRef}
        sx={{
          p: { xs: 2.5, md: 4 },
          maxWidth,
          mx: "auto",
          borderRadius: 3,
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
          fontFamily: settings.fontFamily || defaultSettings.fontFamily,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 3,
            flexWrap: "wrap",
            alignItems: "flex-start",
            pb: 3,
            borderBottom: `3px solid ${primaryColor}`,
          }}
        >
          <Box sx={{ minWidth: 220 }}>
            {showCompanyLogo && invoice.companyLogo && (
              <Box
                component="img"
                src={invoice.companyLogo}
                alt={invoice.companyName}
                sx={{ maxHeight: 84, mb: 2 }}
              />
            )}
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{ color: primaryColor }}
            >
              {invoice.companyName}
            </Typography>
            {invoice.companyAddress && (
              <Typography sx={{ color: secondaryColor, mt: 1 }}>
                {invoice.companyAddress}
              </Typography>
            )}
            {invoice.companyPhone && (
              <Typography sx={{ color: secondaryColor }}>
                هاتف: {invoice.companyPhone}
              </Typography>
            )}
            {invoice.companyEmail && (
              <Typography sx={{ color: secondaryColor }}>
                بريد: {invoice.companyEmail}
              </Typography>
            )}
          </Box>

          <Box sx={{ minWidth: 220, textAlign: "left" }}>
            <Typography
              variant="h4"
              fontWeight="bold"
              sx={{ color: primaryColor }}
            >
              فاتورة
            </Typography>
            <Typography variant="h6" sx={{ mt: 1 }}>
              {invoice.invoiceNumber}
            </Typography>
            <Box sx={{ mt: 2, display: "grid", gap: 1 }}>
              <Typography variant="body2">
                <strong>تاريخ الإصدار:</strong> {formatDate(invoice.issueDate)}
              </Typography>
              {invoice.dueDate && (
                <Typography variant="body2">
                  <strong>تاريخ الاستحقاق:</strong>{" "}
                  {formatDate(invoice.dueDate)}
                </Typography>
              )}
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={getPaymentStatusLabel(invoice.paymentStatus)}
                  color={getPaymentStatusColor(invoice.paymentStatus)}
                  size="small"
                />
              </Box>
            </Box>
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ my: 3 }}>
          <Grid item xs={12} md={6}>
            <Typography
              variant="subtitle2"
              sx={{ color: secondaryColor }}
              gutterBottom
            >
              الفاتورة إلى
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {invoice.customerName}
            </Typography>
            {invoice.customerPhone && (
              <Typography variant="body2">
                هاتف: {invoice.customerPhone}
              </Typography>
            )}
            {invoice.customerEmail && (
              <Typography variant="body2">
                بريد: {invoice.customerEmail}
              </Typography>
            )}
            {invoice.customerAddress && (
              <Typography variant="body2">
                العنوان: {invoice.customerAddress}
              </Typography>
            )}
            {invoice.city && (
              <Typography variant="body2">المدينة: {invoice.city}</Typography>
            )}
            {invoice.governorate && (
              <Typography variant="body2">
                المحافظة: {invoice.governorate}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} md={6} textAlign="left">
            <Typography
              variant="subtitle2"
              sx={{ color: secondaryColor }}
              gutterBottom
            >
              معلومات الطلب
            </Typography>
            <Typography variant="body2">
              <strong>رقم الطلب:</strong> {invoice.order?.orderNumber || "-"}
            </Typography>
            <Typography variant="body2">
              <strong>حالة الطلب:</strong> {invoice.order?.status || "-"}
            </Typography>
            {showPaymentMethod && invoice.paymentMethod && (
              <Typography variant="body2">
                <strong>طريقة الدفع:</strong> {invoice.paymentMethod}
              </Typography>
            )}
          </Grid>
        </Grid>

        {showOrderItems && (
          <TableContainer sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: `${primaryColor}15` }}>
                  <TableCell>
                    <strong>#</strong>
                  </TableCell>
                  <TableCell>
                    <strong>المنتج</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>الكمية</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>السعر</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>الإجمالي</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoice.order?.orderItems?.map((item, index: number) => (
                  <TableRow key={item.id || `${item.productName}-${index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {item.productName}
                      </Typography>
                      {(item.variantName ||
                        item.productColor ||
                        item.productSize) && (
                        <Typography
                          variant="caption"
                          sx={{ color: secondaryColor }}
                        >
                          {[
                            item.variantName,
                            item.productColor,
                            item.productSize,
                          ]
                            .filter(Boolean)
                            .join(" / ")}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">{item.quantity}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(
                        parseNumber(item.price),
                        invoice.currency,
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(getItemTotal(item), invoice.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Grid container justifyContent="flex-end">
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                bgcolor: "#f8fafc",
                border: "1px solid #e2e8f0",
                p: 2.5,
                borderRadius: 2,
              }}
            >
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>المجموع الفرعي:</Typography>
                <Typography fontWeight="medium">
                  {formatCurrency(
                    parseNumber(invoice.subtotal),
                    invoice.currency,
                  )}
                </Typography>
              </Box>

              {parseNumber(invoice.discount) > 0 && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>الخصم:</Typography>
                  <Typography color="error.main" fontWeight="medium">
                    -{" "}
                    {formatCurrency(
                      parseNumber(invoice.discount),
                      invoice.currency,
                    )}
                  </Typography>
                </Box>
              )}

              {showTaxBreakdown && parseNumber(invoice.tax) > 0 && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>الضريبة ({invoice.taxRate || 0}%):</Typography>
                  <Typography fontWeight="medium">
                    {formatCurrency(parseNumber(invoice.tax), invoice.currency)}
                  </Typography>
                </Box>
              )}

              {parseNumber(invoice.shipping) > 0 && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>الشحن:</Typography>
                  <Typography fontWeight="medium">
                    {formatCurrency(
                      parseNumber(invoice.shipping),
                      invoice.currency,
                    )}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 1.5 }} />

              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6" fontWeight="bold">
                  الإجمالي:
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{ color: primaryColor }}
                >
                  {formatCurrency(
                    parseNumber(invoice.totalAmount),
                    invoice.currency,
                  )}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {(invoice.notes || invoice.terms) && (
          <Box sx={{ mt: 4 }}>
            {invoice.notes && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  ملاحظات
                </Typography>
                <Typography variant="body2" sx={{ color: secondaryColor }}>
                  {invoice.notes}
                </Typography>
              </Box>
            )}

            {invoice.terms && (
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  الشروط والأحكام
                </Typography>
                <Typography variant="body2" sx={{ color: secondaryColor }}>
                  {invoice.terms}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        <Box
          sx={{
            mt: 4,
            pt: 3,
            borderTop: "1px solid #e2e8f0",
            textAlign: "center",
          }}
        >
          <Typography variant="body2" sx={{ color: secondaryColor }}>
            شكراً لتعاملكم معنا
          </Typography>
          {invoice.printCount > 0 && (
            <Typography
              variant="caption"
              sx={{ mt: 1, display: "block", color: secondaryColor }}
            >
              تم طباعة هذه الفاتورة {invoice.printCount} مرة
            </Typography>
          )}
        </Box>
      </Paper>

      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }

            body {
              margin: 0;
              padding: 0;
              background: #ffffff !important;
            }

            @page {
              size: ${normalizedPageSize} ${normalizedOrientation};
              margin: 1cm;
            }
          }
        `}
      </style>
    </Box>
  );
};

export default OrderInvoice;
