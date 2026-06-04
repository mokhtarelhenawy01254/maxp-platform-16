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
  IconButton,
  Autocomplete,
  Alert,
  LinearProgress,
  Tooltip,
  Collapse,
  Divider,
  FormControlLabel,
  Switch,
  Badge,
} from "@mui/material";
import {
  Add as AddIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Campaign as CampaignIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  CheckCircle as SentIcon,
  Error as FailedIcon,
  HourglassEmpty as PendingIcon,
} from "@mui/icons-material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { ar } from "date-fns/locale";
import { apiClient } from "../../services/apiClient";
import { format } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────
interface Campaign {
  id: string;
  name: string;
  description?: string;
  message: string;
  scheduledTime: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  totalCount: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  cancelledCount: number;
  createdAt: string;
}

interface CampaignMessage {
  id: string;
  chatId: string;
  status: string;
  error?: string;
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

const STATUS_COLORS: Record<string, "default" | "warning" | "success" | "error" | "info"> = {
  PENDING: "warning",
  RUNNING: "info",
  COMPLETED: "success",
  FAILED: "error",
  CANCELLED: "default",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "⏳ قيد الانتظار",
  RUNNING: "🔄 جاري الإرسال",
  COMPLETED: "✅ مكتملة",
  FAILED: "❌ فاشلة",
  CANCELLED: "🚫 ملغاة",
};

// ── Component ──────────────────────────────────────────────────────────────
const TelegramCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [userbots, setUserbots] = useState<UserbotConfig[]>([]);
  const [dialogs, setDialogs] = useState<TelegramDialog[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [campaignMessages, setCampaignMessages] = useState<Record<string, CampaignMessage[]>>({});

  const [formData, setFormData] = useState({
    userbotConfigId: "",
    name: "",
    description: "",
    message: "",
    chatIds: [] as string[],
    scheduledTime: new Date(Date.now() + 3600000),
    recurring: false,
    recurringPattern: "DAILY",
  });

  // ── Data Fetching ─────────────────────────────────────────────────────
  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/v1/telegram-advanced/campaigns");
      const body = (res as { data?: { data?: Campaign[] } }).data;
      setCampaigns(Array.isArray(body?.data) ? body!.data! : []);
    } catch {
      // silent
    }
  }, []);

  const fetchUserbots = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/v1/telegram/userbots");
      const body = (res as { data?: { data?: UserbotConfig[] } }).data;
      setUserbots(Array.isArray(body?.data) ? body!.data! : []);
    } catch {
      // silent
    }
  }, []);

  const fetchDialogs = useCallback(async (userbotConfigId: string) => {
    if (!userbotConfigId) return;
    try {
      const res = await apiClient.get(
        `/api/v1/userbot/dialogs?userbotConfigId=${userbotConfigId}`
      );
      const body = (res as { data?: { data?: TelegramDialog[] } }).data;
      setDialogs(Array.isArray(body?.data) ? body!.data! : []);
    } catch {
      setDialogs([]);
    }
  }, []);

  const fetchCampaignMessages = useCallback(async (campaignId: string) => {
    try {
      const res = await apiClient.get(
        `/api/v1/telegram-advanced/campaigns/${campaignId}`
      );
      const body = (res as { data?: { data?: { messages: CampaignMessage[] } } }).data;
      const msgs = body?.data?.messages;
      if (Array.isArray(msgs)) {
        setCampaignMessages((prev) => ({ ...prev, [campaignId]: msgs }));
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchUserbots();
    fetchCampaigns();
    const timer = setInterval(fetchCampaigns, 10000);
    return () => clearInterval(timer);
  }, [fetchUserbots, fetchCampaigns]);

  // ── Actions ────────────────────────────────────────────────────────────
  const handleUserbotChange = (id: string) => {
    setFormData({ ...formData, userbotConfigId: id, chatIds: [] });
    fetchDialogs(id);
  };

  const handleCreateCampaign = async () => {
    setError("");
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setError("اسم الحملة يجب أن يكون حرفين على الأقل");
      return;
    }
    if (!formData.userbotConfigId) {
      setError("يرجى اختيار الـ Userbot");
      return;
    }
    if (formData.chatIds.length === 0) {
      setError("يرجى اختيار محادثة واحدة على الأقل");
      return;
    }
    if (!formData.message.trim()) {
      setError("يرجى كتابة نص الرسالة");
      return;
    }
    if (formData.scheduledTime < new Date()) {
      setError("لا يمكن جدولة رسالة في وقت ماضٍ");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/api/v1/telegram-advanced/campaigns", {
        ...formData,
        chatIds: formData.chatIds.filter((id) => id && id !== "unknown"),
      });
      setOpenDialog(false);
      resetForm();
      fetchCampaigns();
    } catch (e: unknown) {
      const errMsg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(errMsg || "فشل إنشاء الحملة");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (campaignId: string) => {
    if (!confirm("هل تريد إلغاء هذه الحملة؟")) return;
    try {
      await apiClient.post(`/api/v1/telegram-advanced/campaigns/${campaignId}/cancel`);
      fetchCampaigns();
    } catch {
      // silent
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm("هل تريد حذف هذه الحملة نهائياً؟")) return;
    try {
      await apiClient.delete(`/api/v1/telegram-advanced/campaigns/${campaignId}`);
      fetchCampaigns();
    } catch {
      // silent
    }
  };

  const handleExpand = (campaignId: string) => {
    if (expandedId === campaignId) {
      setExpandedId(null);
    } else {
      setExpandedId(campaignId);
      if (!campaignMessages[campaignId]) {
        fetchCampaignMessages(campaignId);
      }
    }
  };

  const resetForm = () => {
    const firstUserbotId = userbots[0]?.id || "";
    setFormData({
      userbotConfigId: firstUserbotId,
      name: "",
      description: "",
      message: "",
      chatIds: [],
      scheduledTime: new Date(Date.now() + 3600000),
      recurring: false,
      recurringPattern: "DAILY",
    });
    if (firstUserbotId) fetchDialogs(firstUserbotId);
    setError("");
  };

  // ── Stats bar ──────────────────────────────────────────────────────────
  const StatBar = ({ campaign }: { campaign: Campaign }) => {
    const total = campaign.totalCount || 1;
    const sentPct = Math.round((campaign.sentCount / total) * 100);
    const failedPct = Math.round((campaign.failedCount / total) * 100);
    return (
      <Box sx={{ mt: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <SentIcon sx={{ color: "success.main", fontSize: 16 }} />
          <Typography variant="caption">أُرسلت: {campaign.sentCount}</Typography>
          <FailedIcon sx={{ color: "error.main", fontSize: 16, ml: 1 }} />
          <Typography variant="caption">فشل: {campaign.failedCount}</Typography>
          <PendingIcon sx={{ color: "warning.main", fontSize: 16, ml: 1 }} />
          <Typography variant="caption">انتظار: {campaign.pendingCount}</Typography>
        </Box>
        {/* Stacked progress bar */}
        <Box sx={{ display: "flex", borderRadius: 1, overflow: "hidden", height: 8, bgcolor: "grey.200" }}>
          {sentPct > 0 && (
            <Box sx={{ width: `${sentPct}%`, bgcolor: "success.main", transition: "width 0.4s" }} />
          )}
          {failedPct > 0 && (
            <Box sx={{ width: `${failedPct}%`, bgcolor: "error.main", transition: "width 0.4s" }} />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {campaign.totalCount} محادثة إجمالاً • {sentPct}% مرسلة
        </Typography>
      </Box>
    );
  };

  // ── JSX ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3, direction: "rtl" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <CampaignIcon sx={{ color: "primary.main", fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              حملات تيليجرام
            </Typography>
            <Typography variant="caption" color="text.secondary">
              أرسل رسائل مجدولة لعدة محادثات دفعةً واحدة وتابع تقرير الأداء
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchCampaigns}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { resetForm(); setOpenDialog(true); }}
          >
            حملة جديدة
          </Button>
        </Box>
      </Box>

      {/* Campaign Cards */}
      {campaigns.length === 0 && !loading && (
        <Card>
          <CardContent>
            <Typography color="text.secondary" textAlign="center">
              لا توجد حملات بعد. انقر على "حملة جديدة" للبدء!
            </Typography>
          </CardContent>
        </Card>
      )}

      {campaigns.map((c) => (
        <Card key={c.id} sx={{ mb: 2, border: 1, borderColor: "divider" }}>
          <CardContent>
            {/* Row 1: name + status + actions */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="h6" fontWeight="bold">{c.name}</Typography>
                  <Chip
                    label={STATUS_LABELS[c.status] || c.status}
                    color={STATUS_COLORS[c.status] || "default"}
                    size="small"
                  />
                </Box>
                {c.description && (
                  <Typography variant="body2" color="text.secondary">{c.description}</Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  🕒 {format(new Date(c.scheduledTime), "yyyy/MM/dd HH:mm")}
                </Typography>
              </Box>

              {/* Actions */}
              <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                {c.status === "PENDING" && (
                  <Tooltip title="إلغاء الحملة">
                    <IconButton size="small" color="warning" onClick={() => handleCancel(c.id)}>
                      <CancelIcon />
                    </IconButton>
                  </Tooltip>
                )}
                {(c.status === "CANCELLED" || c.status === "COMPLETED" || c.status === "FAILED") && (
                  <Tooltip title="حذف الحملة">
                    <IconButton size="small" color="error" onClick={() => handleDelete(c.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="تفاصيل الحملة">
                  <IconButton size="small" onClick={() => handleExpand(c.id)}>
                    {expandedId === c.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Stats bar */}
            <StatBar campaign={c} />

            {/* Expanded message list */}
            <Collapse in={expandedId === c.id}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                📋 تفاصيل المستقبلين ({campaignMessages[c.id]?.length ?? "..."})
              </Typography>
              {!campaignMessages[c.id] && <LinearProgress />}
              {campaignMessages[c.id]?.map((msg) => (
                <Box
                  key={msg.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    py: 0.5,
                    px: 1,
                    mb: 0.5,
                    borderRadius: 1,
                    bgcolor: msg.status === "SENT"
                      ? "success.50"
                      : msg.status === "FAILED"
                      ? "error.50"
                      : "grey.50",
                  }}
                >
                  <Chip
                    label={msg.status}
                    color={
                      msg.status === "SENT"
                        ? "success"
                        : msg.status === "FAILED"
                        ? "error"
                        : "warning"
                    }
                    size="small"
                    sx={{ minWidth: 80 }}
                  />
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {msg.chatId}
                  </Typography>
                  {msg.error && (
                    <Tooltip title={msg.error}>
                      <FailedIcon sx={{ color: "error.main", fontSize: 16 }} />
                    </Tooltip>
                  )}
                </Box>
              ))}
            </Collapse>
          </CardContent>
        </Card>
      ))}

      {/* ── Create Campaign Dialog ─────────────────────────────────────── */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth dir="rtl">
        <DialogTitle>🚀 إنشاء حملة جديدة</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            {/* Campaign name + description */}
            <TextField
              label="اسم الحملة *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              placeholder="مثال: حملة عروض رمضان"
            />
            <TextField
              label="وصف الحملة (اختياري)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            {/* Userbot */}
            <FormControl fullWidth>
              <InputLabel>اختر Userbot *</InputLabel>
              <Select
                value={formData.userbotConfigId}
                onChange={(e) => handleUserbotChange(e.target.value)}
                label="اختر Userbot *"
              >
                {userbots.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.label} ({b.clientPhone || "غير متصل"})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Chat multi-select */}
            <Autocomplete
              multiple
              fullWidth
              disabled={!formData.userbotConfigId}
              options={dialogs}
              getOptionLabel={(o) => o.name || ""}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>{option.name}</li>
              )}
              value={dialogs.filter((d) => formData.chatIds.includes(d.id))}
              onChange={(_e, newVal) =>
                setFormData({ ...formData, chatIds: newVal.map((v) => v.id) })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={`اختر المحادثات * ${formData.chatIds.length > 0 ? `(${formData.chatIds.length} مختارة)` : ""}`}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option.name}
                    size="small"
                    {...getTagProps({ index })}
                    key={option.id}
                  />
                ))
              }
            />

            {formData.chatIds.length > 0 && (
              <Alert severity="info" icon={<CampaignIcon />}>
                ستُرسل هذه الرسالة إلى <strong>{formData.chatIds.length}</strong> محادثة في وقت واحد.
              </Alert>
            )}

            {/* Message */}
            <TextField
              label="نص الرسالة *"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              fullWidth
              multiline
              rows={5}
              placeholder="اكتب رسالة الحملة هنا..."
            />

            {/* Scheduled time */}
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ar}>
              <DateTimePicker
                label="وقت الإرسال *"
                value={formData.scheduledTime}
                onChange={(v) => v && setFormData({ ...formData, scheduledTime: v })}
                minDateTime={new Date()}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </LocalizationProvider>

            {/* Recurring */}
            <FormControlLabel
              control={
                <Switch
                  checked={formData.recurring}
                  onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                />
              }
              label="رسالة متكررة"
            />
            {formData.recurring && (
              <FormControl fullWidth>
                <InputLabel>نمط التكرار</InputLabel>
                <Select
                  value={formData.recurringPattern}
                  label="نمط التكرار"
                  onChange={(e) => setFormData({ ...formData, recurringPattern: e.target.value })}
                >
                  <MenuItem value="DAILY">يومياً</MenuItem>
                  <MenuItem value="WEEKLY">أسبوعياً</MenuItem>
                  <MenuItem value="MONTHLY">شهرياً</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={loading}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreateCampaign}
            disabled={loading}
            startIcon={<CampaignIcon />}
          >
            {loading ? "جاري الإنشاء..." : "إنشاء الحملة"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TelegramCampaigns;
