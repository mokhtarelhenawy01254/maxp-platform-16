import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Send as SendIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { apiClient } from "../../services/apiClient";

// ===== TypeScript Interfaces =====

interface Userbot {
  id: string;
  label: string;
  clientPhone?: string;
  isConnected?: boolean;
}

interface Contact {
  id: string;
  telegramId: string;
  firstName: string;
  lastName?: string;
  username?: string;
}

interface BulkMessage {
  id: string;
  name: string;
  message: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";
  sentCount: number;
  failedCount: number;
  totalRecipients: number;
  createdAt: string;
}

interface BulkMessageLog {
  id: string;
  recipient: string;
  status: "SENT" | "FAILED";
  sentAt?: string;
  error?: string;
}

interface BulkMessageDetails {
  bulkMessage: BulkMessage;
  logs: BulkMessageLog[];
}

interface FormData {
  userbotConfigId: string;
  name: string;
  message: string;
  recipients: string[];
  delayBetweenMessages: number;
}

// ===== Helper Functions =====

// دالة لتعقيم المدخلات لمنع XSS
const sanitizeInput = (input: string): string => {
  if (typeof input !== "string") return "";
  const div = document.createElement("div");
  div.textContent = input;
  return div.innerHTML;
};

// دالة للحصول على لون الحالة
const getStatusColor = (
  status: string,
): "success" | "info" | "error" | "default" | "warning" => {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "IN_PROGRESS":
      return "info";
    case "FAILED":
      return "error";
    case "CANCELLED":
      return "default";
    default:
      return "warning";
  }
};

// دالة للحصول على نص الحالة بالعربية
const getStatusLabel = (status: string): string => {
  switch (status) {
    case "PENDING":
      return "قيد الانتظار";
    case "IN_PROGRESS":
      return "جاري الإرسال";
    case "COMPLETED":
      return "مكتمل";
    case "FAILED":
      return "فشل";
    case "CANCELLED":
      return "ملغي";
    default:
      return status;
  }
};

// ===== Main Component =====

const TelegramBulkMessages: React.FC = () => {
  // State
  const [bulkMessages, setBulkMessages] = useState<BulkMessage[]>([]);
  const [userbots, setUserbots] = useState<Userbot[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedBulkMessage, setSelectedBulkMessage] =
    useState<BulkMessageDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    userbotConfigId: "",
    name: "",
    message: "",
    recipients: [],
    delayBetweenMessages: 2000,
  });

  // Effects
  useEffect(() => {
    fetchUserbots();
    fetchBulkMessages();
    fetchContacts();

    // تحديث تلقائي كل 10 ثوانٍ للصفحة
    const refreshInterval = setInterval(() => {
      if (autoRefresh && !openDialog && !openDetailsDialog) {
        fetchBulkMessages();
      }
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, [autoRefresh, openDialog, openDetailsDialog]);

  // API Functions
  const fetchUserbots = async (): Promise<void> => {
    try {
      const response = await apiClient.get<{ data: Userbot[] }>(
        "/api/v1/telegram/userbots",
      );
      setUserbots(response.data.data || []);
    } catch (error) {
      console.error("Error fetching userbots:", error);
    }
  };

  const fetchBulkMessages = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ data: BulkMessage[] }>(
        "/api/v1/telegram-advanced/bulk-messages",
      );
      setBulkMessages(response.data.data || []);
    } catch (error) {
      console.error("Error fetching bulk messages:", error);
      setError("فشل تحميل الرسائل الجماعية");
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async (): Promise<void> => {
    try {
      const response = await apiClient.get<{ data: Contact[] }>(
        "/api/v1/telegram-advanced/contacts",
      );
      setContacts(response.data.data || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  // Event Handlers
  const handleOpenDialog = (): void => {
    setFormData({
      userbotConfigId: userbots[0]?.id || "",
      name: "",
      message: "",
      recipients: [],
      delayBetweenMessages: 2000,
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = (): void => {
    setOpenDialog(false);
  };

  const handleSend = async (): Promise<void> => {
    if (
      !formData.userbotConfigId ||
      !formData.message ||
      formData.recipients.length === 0
    ) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    // التحقق من أن المستخدم المحدد متصل
    const selectedUserbot = userbots.find(
      (bot: Userbot) => bot.id === formData.userbotConfigId,
    );
    if (!selectedUserbot || !selectedUserbot.clientPhone) {
      setError("يرجى اختيار حساب تيليجرام متصل");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/api/v1/telegram-advanced/bulk-messages", formData);
      setSuccess("تم إرسال الحملة بنجاح");
      fetchBulkMessages();
      handleCloseDialog();
    } catch (error: unknown) {
      console.error("Error sending bulk message:", error);
      const axiosError = error as { response?: { data?: { error?: string } } };
      setError(
        axiosError.response?.data?.error || "فشل إرسال الرسالة الجماعية",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (bulkMessage: BulkMessage): Promise<void> => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ data: BulkMessageDetails }>(
        `/api/v1/telegram-advanced/bulk-messages/${bulkMessage.id}`,
      );
      setSelectedBulkMessage(response.data.data);
      setOpenDetailsDialog(true);
    } catch (error) {
      console.error("Error fetching details:", error);
      setError("فشل تحميل التفاصيل");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bulkMessageId: string): Promise<void> => {
    if (!window.confirm("هل أنت متأكد من إلغاء هذه الحملة؟")) return;

    setLoading(true);
    try {
      await apiClient.post(
        `/api/v1/telegram-advanced/bulk-messages/${bulkMessageId}/cancel`,
      );
      fetchBulkMessages();
    } catch (error) {
      console.error("Error cancelling bulk message:", error);
      setError("فشل إلغاء الحملة");
    } finally {
      setLoading(false);
    }
  };

  // Render
  return (
    <Box sx={{ p: 3, direction: "rtl" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h4">📨 الرسائل الجماعية</Typography>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchBulkMessages} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={autoRefresh ? "on" : "off"}
              onChange={(e) => setAutoRefresh(e.target.value === "on")}
              size="small"
            >
              <MenuItem value="on">تحديث تلقائي</MenuItem>
              <MenuItem value="off">تحديث يدوي</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            disabled={
              userbots.length === 0 ||
              !userbots.some((bot: Userbot) => bot.clientPhone)
            }
          >
            حملة جديدة
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* Bulk Messages List */}
      <Box sx={{ display: "grid", gap: 2 }}>
        {loading && bulkMessages.length === 0
          ? [...Array(3)].map((_, index) => (
              <Card key={index}>
                <CardContent>
                  <Skeleton variant="rectangular" height={100} />
                </CardContent>
              </Card>
            ))
          : bulkMessages.map((bulk) => (
              <Card key={bulk.id}>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                      mb: 2,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <Typography variant="h6">
                          {sanitizeInput(bulk.name)}
                        </Typography>
                        <Chip
                          label={getStatusLabel(bulk.status)}
                          color={getStatusColor(bulk.status)}
                          size="small"
                        />
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        {sanitizeInput(bulk.message.substring(0, 100))}
                        {bulk.message.length > 100 ? "..." : ""}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        📊 {bulk.sentCount} / {bulk.totalRecipients} تم الإرسال
                        {bulk.failedCount > 0 &&
                          ` • ❌ ${bulk.failedCount} فشل`}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewDetails(bulk)}
                      >
                        التفاصيل
                      </Button>
                      {bulk.status === "IN_PROGRESS" && (
                        <Button
                          size="small"
                          color="error"
                          startIcon={<CancelIcon />}
                          onClick={() => handleCancel(bulk.id)}
                        >
                          إلغاء
                        </Button>
                      )}
                    </Box>
                  </Box>
                  {bulk.status === "IN_PROGRESS" && (
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(
                        (bulk.sentCount / bulk.totalRecipients) * 100,
                        100,
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            ))}

        {bulkMessages.length === 0 && !loading && (
          <Card>
            <CardContent>
              <Typography
                variant="body1"
                color="text.secondary"
                textAlign="center"
              >
                لا توجد حملات رسائل جماعية. انقر على "حملة جديدة" للبدء.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Create Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>📨 حملة رسائل جماعية جديدة</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <FormControl
              fullWidth
              error={!formData.userbotConfigId && error.includes("حساب")}
            >
              <InputLabel>اختر Userbot</InputLabel>
              <Select
                value={formData.userbotConfigId}
                onChange={(e) =>
                  setFormData({ ...formData, userbotConfigId: e.target.value })
                }
                label="اختر Userbot"
              >
                {userbots.map((bot: Userbot) => (
                  <MenuItem
                    key={bot.id}
                    value={bot.id}
                    disabled={!bot.clientPhone}
                  >
                    {bot.label} ({bot.clientPhone || "غير متصل"})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="اسم الحملة"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              fullWidth
              required
              error={!formData.name && error.includes("الحقول")}
            />

            <TextField
              label="الرسالة"
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              fullWidth
              required
              multiline
              rows={6}
              helperText={`${formData.message.length} حرف`}
              error={!formData.message && error.includes("الحقول")}
            />

            <FormControl
              fullWidth
              error={
                formData.recipients.length === 0 && error.includes("الحقول")
              }
            >
              <InputLabel>المستلمون</InputLabel>
              <Select
                multiple
                value={formData.recipients}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    recipients: e.target.value as string[],
                  })
                }
                label="المستلمون"
                renderValue={(selected: string[]) => `${selected.length} مستلم`}
              >
                {contacts.map((contact: Contact) => (
                  <MenuItem key={contact.id} value={contact.telegramId}>
                    {sanitizeInput(contact.firstName)}{" "}
                    {sanitizeInput(contact.lastName || "")}{" "}
                    {contact.username
                      ? `(@${sanitizeInput(contact.username)})`
                      : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="التأخير بين الرسائل (ميلي ثانية)"
              type="number"
              value={formData.delayBetweenMessages}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  delayBetweenMessages: Math.max(
                    2000,
                    parseInt(e.target.value) || 2000,
                  ),
                })
              }
              fullWidth
              inputProps={{ min: 2000 }}
              helperText="الحد الأدنى: 2000 (ثانيتين) لتجنب الحظر"
            />

            <Alert severity="warning">
              ⚠️ تأكد من عدم إرسال رسائل سبام. قد يؤدي الإرسال المفرط إلى حظر
              حسابك.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button
            onClick={handleSend}
            variant="contained"
            startIcon={<SendIcon />}
            disabled={loading || formData.recipients.length === 0}
          >
            {loading
              ? "جاري الإرسال..."
              : `إرسال (${formData.recipients.length})`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog
        open={openDetailsDialog}
        onClose={() => setOpenDetailsDialog(false)}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            تفاصيل الحملة
            <IconButton
              onClick={() => setOpenDetailsDialog(false)}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <LinearProgress />
            </Box>
          ) : (
            selectedBulkMessage && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {sanitizeInput(selectedBulkMessage.bulkMessage?.name || "")}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {sanitizeInput(
                    selectedBulkMessage.bulkMessage?.message || "",
                  )}
                </Typography>
                <Box
                  sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: "background.default",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    الإحصائيات:
                  </Typography>
                  <Typography variant="body2">
                    ✅ تم الإرسال: {selectedBulkMessage.bulkMessage?.sentCount}
                  </Typography>
                  <Typography variant="body2">
                    ❌ فشل: {selectedBulkMessage.bulkMessage?.failedCount}
                  </Typography>
                  <Typography variant="body2">
                    📊 الإجمالي:{" "}
                    {selectedBulkMessage.bulkMessage?.totalRecipients}
                  </Typography>
                  <Typography variant="body2">
                    📈 النسبة:{" "}
                    {selectedBulkMessage.bulkMessage?.totalRecipients
                      ? Math.round(
                          (selectedBulkMessage.bulkMessage.sentCount /
                            selectedBulkMessage.bulkMessage.totalRecipients) *
                            100,
                        )
                      : 0}
                    %
                  </Typography>
                </Box>
                <Typography variant="subtitle2" gutterBottom>
                  سجل الإرسال:
                </Typography>
                <List dense sx={{ maxHeight: 300, overflow: "auto" }}>
                  {selectedBulkMessage.logs
                    ?.slice(0, 20)
                    .map((log: BulkMessageLog) => (
                      <ListItem key={log.id}>
                        <ListItemText
                          primary={sanitizeInput(log.recipient)}
                          secondary={
                            log.status === "SENT"
                              ? `✅ تم الإرسال في ${log.sentAt ? new Date(log.sentAt).toLocaleString("ar-EG") : ""}`
                              : `❌ فشل: ${sanitizeInput(log.error || "خطأ غير معروف")}`
                          }
                        />
                      </ListItem>
                    ))}
                </List>
                {selectedBulkMessage.logs &&
                  selectedBulkMessage.logs.length > 20 && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      textAlign="center"
                    >
                      ... و {selectedBulkMessage.logs.length - 20} آخرين
                    </Typography>
                  )}
              </Box>
            )
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailsDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TelegramBulkMessages;
