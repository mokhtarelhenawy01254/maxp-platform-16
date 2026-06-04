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
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
} from "@mui/icons-material";
import { apiClient } from "../../services/apiClient";
import { useTranslation } from "react-i18next";

const TelegramAutoReply = () => {
  const [rules, setRules] = useState([]);
  const [userbots, setUserbots] = useState([]);
  const [selectedUserbot, setSelectedUserbot] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const [formData, setFormData] = useState({
    name: "",
    triggerType: "KEYWORD",
    triggerValue: "",
    response: "",
    workingHoursOnly: false,
    startTime: "09:00",
    endTime: "17:00",
    daysOfWeek: [],
    priority: 0,
  });

  useEffect(() => {
    fetchUserbots();
  }, []);

  useEffect(() => {
    if (selectedUserbot) {
      fetchRules();
    }
  }, [selectedUserbot]);

  const fetchUserbots = async () => {
    try {
      const response = await apiClient.get("/api/v1/telegram/userbots");
      setUserbots(response.data.data || []);
      if (response.data.data?.length > 0) {
        setSelectedUserbot(response.data.data[0].id);
      }
    } catch (error) {
      console.error("Error fetching userbots:", error);
      setError(t("telegramAutoReply.failedLoadUserbots"));
    }
  };

  const fetchRules = async () => {
    if (!selectedUserbot) return;
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/api/v1/telegram-advanced/auto-reply/${selectedUserbot}`,
      );
      setRules(response.data.data || []);
    } catch (error) {
      console.error("Error fetching rules:", error);
      setError(t("telegramAutoReply.failedLoadRules"));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        triggerType: rule.triggerType,
        triggerValue: rule.triggerValue,
        response: rule.response,
        workingHoursOnly: rule.workingHoursOnly,
        startTime: rule.startTime || "09:00",
        endTime: rule.endTime || "17:00",
        daysOfWeek: rule.daysOfWeek || [],
        priority: rule.priority || 0,
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: "",
        triggerType: "KEYWORD",
        triggerValue: "",
        response: "",
        workingHoursOnly: false,
        startTime: "09:00",
        endTime: "17:00",
        daysOfWeek: [],
        priority: 0,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRule(null);
  };

  const handleSave = async () => {
    if (!selectedUserbot) {
      setError(t("telegramAutoReply.selectUserbotFirst"));
      return;
    }

    setLoading(true);
    try {
      if (editingRule) {
        await apiClient.put(
          `/api/v1/telegram-advanced/auto-reply/${editingRule.id}`,
          formData,
        );
      } else {
        await apiClient.post(
          `/api/v1/telegram-advanced/auto-reply/${selectedUserbot}`,
          formData,
        );
      }
      fetchRules();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving rule:", error);
      setError(t("telegramAutoReply.failedSaveRule"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm(t("telegramAutoReply.confirmDelete"))) return;

    setLoading(true);
    try {
      await apiClient.delete(`/api/v1/telegram-advanced/auto-reply/${ruleId}`);
      fetchRules();
    } catch (error) {
      console.error("Error deleting rule:", error);
      setError(t("telegramAutoReply.failedDeleteRule"));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (rule) => {
    setLoading(true);
    try {
      await apiClient.put(`/api/v1/telegram-advanced/auto-reply/${rule.id}`, {
        isActive: !rule.isActive,
      });
      fetchRules();
    } catch (error) {
      console.error("Error toggling rule:", error);
      setError(t("telegramAutoReply.failedToggleRule"));
    } finally {
      setLoading(false);
    }
  };

  const daysOfWeek = [
    { value: 0, label: t("telegramAutoReply.days.sun") },
    { value: 1, label: t("telegramAutoReply.days.mon") },
    { value: 2, label: t("telegramAutoReply.days.tue") },
    { value: 3, label: t("telegramAutoReply.days.wed") },
    { value: 4, label: t("telegramAutoReply.days.thu") },
    { value: 5, label: t("telegramAutoReply.days.fri") },
    { value: 6, label: t("telegramAutoReply.days.sat") },
  ];

  return (
    <Box sx={{ p: 3, direction: isRtl ? "rtl" : "ltr" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">{t("telegramAutoReply.title")}</Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>{t("telegramAutoReply.selectBot")}</InputLabel>
            <Select
              value={selectedUserbot}
              onChange={(e) => setSelectedUserbot(e.target.value)}
              label={t("telegramAutoReply.selectBot")}
            >
              {userbots.map((bot) => (
                <MenuItem key={bot.id} value={bot.id}>
                  {bot.label} ({bot.clientPhone || t("telegramAutoReply.offline")})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={!selectedUserbot}
          >
            {t("telegramAutoReply.addRule")}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "grid", gap: 2 }}>
        {rules.map((rule) => (
          <Card key={rule.id}>
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
                    <Typography variant="h6">{rule.name}</Typography>
                    <Chip
                      label={rule.isActive ? t("telegramAutoReply.active") : t("telegramAutoReply.stopped")}
                      color={rule.isActive ? "success" : "default"}
                      size="small"
                    />
                    <Chip label={`${t("telegramAutoReply.priority")}: ${rule.priority}`} size="small" />
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    <strong>{t("telegramAutoReply.trigger")}:</strong>{" "}
                    {rule.triggerType === "KEYWORD"
                      ? t("telegramAutoReply.keyword")
                      : rule.triggerType === "REGEX"
                        ? t("telegramAutoReply.regex")
                        : t("telegramAutoReply.all")}{" "}
                    - {rule.triggerValue}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    <strong>{t("telegramAutoReply.response")}:</strong> {rule.response}
                  </Typography>
                  {rule.workingHoursOnly && (
                    <Typography variant="body2" color="text.secondary">
                      ⏰ {t("telegramAutoReply.workingHoursOnly")}: {rule.startTime} - {rule.endTime}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <IconButton
                    color={rule.isActive ? "error" : "success"}
                    onClick={() => handleToggleActive(rule)}
                    disabled={loading}
                  >
                    {rule.isActive ? <StopIcon /> : <PlayIcon />}
                  </IconButton>
                  <IconButton
                    color="primary"
                    onClick={() => handleOpenDialog(rule)}
                    disabled={loading}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDelete(rule.id)}
                    disabled={loading}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}

        {rules.length === 0 && !loading && (
          <Card>
            <CardContent>
              <Typography
                variant="body1"
                color="text.secondary"
                textAlign="center"
              >
                {t("telegramAutoReply.noRules")}
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
        dir={isRtl ? "rtl" : "ltr"}
      >
        <DialogTitle>
          {editingRule ? t("telegramAutoReply.editRule") : t("telegramAutoReply.addNewRule")}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              label={t("telegramAutoReply.ruleName")}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              fullWidth
              required
            />

            <FormControl fullWidth>
              <InputLabel>{t("telegramAutoReply.triggerType")}</InputLabel>
              <Select
                value={formData.triggerType}
                onChange={(e) =>
                  setFormData({ ...formData, triggerType: e.target.value })
                }
                label={t("telegramAutoReply.triggerType")}
              >
                <MenuItem value="KEYWORD">{t("telegramAutoReply.keyword")}</MenuItem>
                <MenuItem value="REGEX">{t("telegramAutoReply.regexFull")}</MenuItem>
                <MenuItem value="ALL">{t("telegramAutoReply.allMessages")}</MenuItem>
              </Select>
            </FormControl>

            {formData.triggerType !== "ALL" && (
              <TextField
                label={t("telegramAutoReply.triggerValue")}
                value={formData.triggerValue}
                onChange={(e) =>
                  setFormData({ ...formData, triggerValue: e.target.value })
                }
                fullWidth
                required
                helperText={
                  formData.triggerType === "KEYWORD"
                    ? t("telegramAutoReply.keywordExample")
                    : t("telegramAutoReply.regexExample")
                }
              />
            )}

            <TextField
              label={t("telegramAutoReply.response")}
              value={formData.response}
              onChange={(e) =>
                setFormData({ ...formData, response: e.target.value })
              }
              fullWidth
              required
              multiline
              rows={4}
            />

            <TextField
              label={t("telegramAutoReply.priority")}
              type="number"
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: parseInt(e.target.value) })
              }
              fullWidth
              helperText={t("telegramAutoReply.priorityHelper")}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.workingHoursOnly}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      workingHoursOnly: e.target.checked,
                    })
                  }
                />
              }
              label={t("telegramAutoReply.workingHoursOnly")}
            />

            {formData.workingHoursOnly && (
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label={t("telegramAutoReply.from")}
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  fullWidth
                />
                <TextField
                  label={t("telegramAutoReply.to")}
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  fullWidth
                />
              </Box>
            )}

            <FormControl fullWidth>
              <InputLabel>{t("telegramAutoReply.workingDays")}</InputLabel>
              <Select
                multiple
                value={formData.daysOfWeek}
                onChange={(e) =>
                  setFormData({ ...formData, daysOfWeek: e.target.value as number[] })
                }
                label={t("telegramAutoReply.workingDays")}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {(selected as number[]).map((value) => (
                      <Chip
                        key={value}
                        label={daysOfWeek.find((d) => d.value === value)?.label}
                        size="small"
                      />
                    ))}
                  </Box>
                )}
              >
                {daysOfWeek.map((day) => (
                  <MenuItem key={day.value} value={day.value}>
                    {day.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t("telegramAutoReply.cancel")}</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {loading ? t("telegramAutoReply.saving") : t("telegramAutoReply.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
};

export default TelegramAutoReply;
