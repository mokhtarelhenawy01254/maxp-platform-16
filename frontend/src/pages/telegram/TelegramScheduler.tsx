import React, { useState, useEffect } from "react";
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
  IconButton,
  Switch,
  FormControlLabel,
  Autocomplete,
  Tabs,
  Tab,
  Tooltip,
  Alert
} from "@mui/material";
import {
  Add as AddIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Replay as RescheduleIcon
} from "@mui/icons-material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { apiClient } from "../../services/apiClient";
import { ar } from "date-fns/locale";

interface SchedulerFormData {
  userbotConfigId: string;
  chatIds: string[];
  message: string;
  scheduledTime: Date;
  recurring: boolean;
  recurringPattern: string;
}

interface UserbotConfig {
  id: string;
  label: string;
  clientPhone?: string;
}

interface TelegramDialog {
  id: string;
  name: string;
}

interface ScheduledMessage {
  id: string;
  userbotConfigId: string;
  chatId: string;
  message: string;
  scheduledTime: string | Date;
  status: string;
  recurring: boolean;
  recurringPattern?: string;
  error?: string;
}

const TelegramScheduler = () => {
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [userbots, setUserbots] = useState<UserbotConfig[]>([]);
  const [dialogs, setDialogs] = useState<TelegramDialog[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<SchedulerFormData>({
    userbotConfigId: "",
    chatIds: [],
    message: "",
    scheduledTime: new Date(Date.now() + 3600000),
    recurring: false,
    recurringPattern: "DAILY",
  });
  const [currentTab, setCurrentTab] = useState("ALL");

  useEffect(() => {
    fetchUserbots();
    fetchScheduledMessages();

    const interval = setInterval(() => {
      fetchScheduledMessages(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchUserbots = async () => {
    try {
      const response = await apiClient.get("/api/v1/telegram/userbots");
      setUserbots(response.data.data || []);
    } catch (error) {
      console.error("Error fetching userbots:", error);
    }
  };

  const fetchScheduledMessages = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await apiClient.get(
        "/api/v1/telegram-advanced/scheduled-messages",
      );
      setScheduledMessages(response.data.data || []);
    } catch (error) {
      console.error("Error fetching scheduled messages:", error);
      if (showLoading) setError("فشل تحميل الرسائل المجدولة");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchDialogs = async (userbotConfigId) => {
    if (!userbotConfigId) return;
    try {
      const response = await apiClient.get(
        `/api/v1/userbot/dialogs?userbotConfigId=${userbotConfigId}`,
      );
      setDialogs(response.data.data || []);
    } catch (error) {
      console.error("Error fetching dialogs:", error);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      userbotConfigId: userbots[0]?.id || "",
      chatIds: [],
      message: "",
      scheduledTime: new Date(Date.now() + 3600000),
      recurring: false,
      recurringPattern: "DAILY",
    });
    if (userbots[0]?.id) {
      fetchDialogs(userbots[0].id);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleUserbotChange = (userbotConfigId) => {
    setFormData({ ...formData, userbotConfigId, chatIds: [] });
    fetchDialogs(userbotConfigId);
  };

  const handleSchedule = async () => {
    // Clean chatIds to remove any duplicates or nulls
    const cleanChatIds = formData.chatIds.filter(id => id && id !== 'unknown');
    
    if (!formData.userbotConfigId || cleanChatIds.length === 0 || !formData.message) {
      setError("يرجى ملء جميع الحقول المطلوبة (محادثة واحدة على الأقل صالحة)");
      return;
    }

    if (formData.scheduledTime < new Date()) {
      setError("لا يمكن جدولة رسالة في وقت ماضٍ");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post(
        "/api/v1/telegram-advanced/scheduled-messages",
        { ...formData, chatIds: cleanChatIds },
      );
      fetchScheduledMessages();
      handleCloseDialog();
    } catch (error) {
      console.error("Error scheduling message:", error);
      setError("فشل جدولة الرسالة");
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = (msg) => {
    setFormData({
      userbotConfigId: msg.userbotConfigId || userbots[0]?.id || "",
      chatIds: [msg.chatId],
      message: msg.message || "",
      scheduledTime: new Date(Date.now() + 3600000),
      recurring: msg.recurring || false,
      recurringPattern: msg.recurringPattern || "DAILY",
    });
    if (msg.userbotConfigId) fetchDialogs(msg.userbotConfigId);
    setOpenDialog(true);
  };

  const handleCancel = async (messageId) => {
    if (!window.confirm("هل أنت متأكد من إلغاء هذه الرسالة المجدولة؟")) return;

    setLoading(true);
    try {
      await apiClient.post(
        `/api/v1/telegram-advanced/scheduled-messages/${messageId}/cancel`,
      );
      fetchScheduledMessages();
    } catch (error) {
      console.error("Error cancelling message:", error);
      setError("فشل إلغاء الرسالة");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "SENT":
        return "success";
      case "PENDING":
        return "warning";
      case "FAILED":
        return "error";
      case "CANCELLED":
        return "default";
      default:
        return "info";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "PENDING":
        return "قيد الانتظار";
      case "SENT":
        return "تم الإرسال";
      case "FAILED":
        return "فشل";
      case "CANCELLED":
        return "ملغي";
      default:
        return status;
    }
  };

  const getRecurringLabel = (pattern) => {
    switch (pattern) {
      case "DAILY":
        return "يومي";
      case "WEEKLY":
        return "أسبوعي";
      case "MONTHLY":
        return "شهري";
      default:
        return pattern;
    }
  };

  return (
    <Box sx={{ p: 3, direction: "rtl" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">⏰ جدولة الرسائل</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
          disabled={userbots.length === 0}
        >
          جدولة رسالة
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, val) => setCurrentTab(val)} aria-label="message status tabs">
          <Tab label="الكل" value="ALL" />
          <Tab label="قيد الانتظار" value="PENDING" />
          <Tab label="تم الإرسال" value="SENT" />
          <Tab label="فشل" value="FAILED" />
          <Tab label="ملغاة" value="CANCELLED" />
        </Tabs>
      </Box>

      <Box sx={{ display: "grid", gap: 2 }}>
        {scheduledMessages.filter(msg => currentTab === "ALL" || msg.status === currentTab).map((msg) => (
          <Card key={msg.id}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
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
                    <ScheduleIcon color="action" />
                    <Typography variant="h6">
                      {new Date(msg.scheduledTime).toLocaleString("ar-EG")}
                    </Typography>
                    <Chip
                      label={getStatusLabel(msg.status)}
                      color={getStatusColor(msg.status)}
                      size="small"
                    />
                    {msg.recurring && (
                      <Chip
                        label={`🔄 ${getRecurringLabel(msg.recurringPattern)}`}
                        size="small"
                        color="info"
                      />
                    )}
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    <strong>المحادثة:</strong> {msg.chatId}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {msg.message.substring(0, 150)}
                    {msg.message.length > 150 ? "..." : ""}
                  </Typography>
                  {msg.status === "FAILED" && msg.error && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {msg.error}
                    </Alert>
                  )}
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {(msg.status === "FAILED" || msg.status === "CANCELLED") && (
                    <Tooltip title="إعادة الجدولة">
                      <IconButton
                        color="primary"
                        onClick={() => handleReschedule(msg)}
                        disabled={loading}
                      >
                        <RescheduleIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {msg.status === "PENDING" && (
                    <Tooltip title="إلغاء الجدولة">
                      <IconButton
                        color="error"
                        onClick={() => handleCancel(msg.id)}
                        disabled={loading}
                      >
                        <CancelIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}

        {scheduledMessages.filter(msg => currentTab === "ALL" || msg.status === currentTab).length === 0 && !loading && (
          <Card>
            <CardContent>
              <Typography
                variant="body1"
                color="text.secondary"
                textAlign="center"
              >
                لا توجد رسائل مجدولة. انقر على "جدولة رسالة" للبدء.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>⏰ جدولة رسالة جديدة</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>اختر Userbot</InputLabel>
              <Select
                value={formData.userbotConfigId}
                onChange={(e) => handleUserbotChange(e.target.value)}
                label="اختر Userbot"
              >
                {userbots.map((bot) => (
                  <MenuItem key={bot.id} value={bot.id}>
                    {bot.label} ({bot.clientPhone || "غير متصل"})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              multiple
              fullWidth
              disabled={!formData.userbotConfigId}
              options={dialogs}
              getOptionLabel={(option) => option.name || ""}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  {option.name}
                </li>
              )}
              value={dialogs.filter(d => formData.chatIds.includes(d.id))}
              onChange={(event, newValue) => {
                setFormData({ ...formData, chatIds: newValue.map(v => v.id) });
              }}
              renderInput={(params) => (
                <TextField {...params} label="اختر المحادثات" required={formData.chatIds.length === 0} />
              )}
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
            />

            <LocalizationProvider
              dateAdapter={AdapterDateFns}
              adapterLocale={ar}
            >
              <DateTimePicker
                label="وقت الإرسال"
                value={formData.scheduledTime}
                onChange={(newValue) =>
                  setFormData({ ...formData, scheduledTime: newValue })
                }
                minDateTime={new Date()}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
            </LocalizationProvider>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.recurring}
                  onChange={(e) =>
                    setFormData({ ...formData, recurring: e.target.checked })
                  }
                />
              }
              label="رسالة متكررة"
            />

            {formData.recurring && (
              <FormControl fullWidth>
                <InputLabel>نمط التكرار</InputLabel>
                <Select
                  value={formData.recurringPattern}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recurringPattern: e.target.value,
                    })
                  }
                  label="نمط التكرار"
                >
                  <MenuItem value="DAILY">يومي</MenuItem>
                  <MenuItem value="WEEKLY">أسبوعي</MenuItem>
                  <MenuItem value="MONTHLY">شهري</MenuItem>
                </Select>
              </FormControl>
            )}

            <Alert severity="info">
              💡 سيتم إرسال الرسالة تلقائياً في الوقت المحدد
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button
            onClick={handleSchedule}
            variant="contained"
            startIcon={<ScheduleIcon />}
            disabled={loading}
          >
            {loading ? "جاري الجدولة..." : "جدولة"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TelegramScheduler;
