import React, { useState, useEffect } from "react";
import {
  Box,
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
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  Add,
  Edit,
  Delete,
  ArrowUpward,
  ArrowDownward,
  ThumbUp,
  ThumbDown,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  order: number;
  helpful: number;
  notHelpful: number;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

type FAQCollection = FAQ[] | Record<string, FAQ[]>;

interface FAQListResponse {
  data?: FAQCollection;
  faqs?: FAQCollection;
}

const parseTags = (tags: unknown): string[] => {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag));
  }

  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) {
        return parsed.map((tag) => String(tag));
      }
    } catch {
      return tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const normalizeFAQRecord = (faq: Partial<FAQ> & { _id?: string }): FAQ | null => {
  const id = faq.id || faq._id;
  if (!id) return null;

  return {
    id,
    question: String(faq.question || ""),
    answer: String(faq.answer || ""),
    category: String(faq.category || "general"),
    tags: parseTags(faq.tags),
    order: Number(faq.order || 0),
    helpful: Number(faq.helpful || 0),
    notHelpful: Number(faq.notHelpful || 0),
    isActive: faq.isActive !== false,
    version: Number(faq.version || 1),
    createdAt: String(faq.createdAt || ""),
    updatedAt: String(faq.updatedAt || ""),
  };
};

const normalizeFAQList = (payload: FAQCollection | FAQListResponse): FAQ[] => {
  const source =
    Array.isArray(payload) || !payload || typeof payload !== "object"
      ? payload
      : payload.data || payload.faqs || payload;

  const records = Array.isArray(source)
    ? source
    : source && typeof source === "object"
      ? Object.values(source).flatMap((value) => (Array.isArray(value) ? value : []))
      : [];

  return records
    .map((faq) => normalizeFAQRecord(faq as Partial<FAQ> & { _id?: string }))
    .filter((faq): faq is FAQ => Boolean(faq));
};

const FAQManagement: React.FC = () => {
  const { t } = useTranslation();
  const tr = (key: string, options?: any) =>
    String(t(key, options));
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    category: "general",
    tags: "",
    isActive: true,
  });

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/faqs");
      setFaqs(normalizeFAQList(response.data as FAQListResponse));
    } catch (err: any) {
      setError(err.response?.data?.error || tr("faqManagement.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const data = {
        ...formData,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };

      if (editingFaq) {
        await apiClient.put(`/faqs/${editingFaq.id}`, data);
        setSuccess(tr("faqManagement.updateSuccess"));
      } else {
        await apiClient.post("/faqs", data);
        setSuccess(tr("faqManagement.createSuccess"));
      }

      setDialogOpen(false);
      resetForm();
      loadFAQs();
    } catch (err: any) {
      setError(err.response?.data?.error || tr("faqManagement.saveError"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(tr("faqManagement.confirmDelete"))) return;

    try {
      await apiClient.delete(`/faqs/${id}`);
      setSuccess(tr("faqManagement.deleteSuccess"));
      loadFAQs();
    } catch (err: any) {
      setError(err.response?.data?.error || tr("faqManagement.deleteError"));
    }
  };

  const handleToggleActive = async (faq: FAQ) => {
    try {
      await apiClient.put(`/faqs/${faq.id}`, { isActive: !faq.isActive });
      setSuccess(
        tr("faqManagement.toggleSuccess", {
          status: tr(!faq.isActive ? "faqManagement.active" : "faqManagement.inactive"),
        }),
      );
      loadFAQs();
    } catch (err: any) {
      setError(err.response?.data?.error || tr("faqManagement.statusError"));
    }
  };

  const handleReorder = async (faq: FAQ, direction: "up" | "down") => {
    try {
      const newOrder = direction === "up" ? faq.order - 1 : faq.order + 1;
      await apiClient.put(`/faqs/${faq.id}`, { order: newOrder });
      loadFAQs();
    } catch (err: any) {
      setError(err.response?.data?.error || tr("faqManagement.reorderError"));
    }
  };

  const openEditDialog = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: faq.tags.join(", "),
      isActive: faq.isActive,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingFaq(null);
    setFormData({
      question: "",
      answer: "",
      category: "general",
      tags: "",
      isActive: true,
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4">{tr("faqManagement.title")}</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          {tr("faqManagement.addNew")}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{tr("faqManagement.order")}</TableCell>
                <TableCell>{tr("faqManagement.question")}</TableCell>
                <TableCell>{tr("faqManagement.category")}</TableCell>
                <TableCell>{tr("faqManagement.rating")}</TableCell>
                <TableCell>{tr("faqManagement.status")}</TableCell>
                <TableCell>{tr("faqManagement.version")}</TableCell>
                <TableCell>{tr("faqManagement.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {faqs.map((faq) => (
                <TableRow key={faq.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <IconButton
                        size="small"
                        onClick={() => handleReorder(faq, "up")}
                        disabled={faq.order === 0}
                      >
                        <ArrowUpward fontSize="small" />
                      </IconButton>
                      <Typography sx={{ mx: 1 }}>{faq.order}</Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleReorder(faq, "down")}
                      >
                        <ArrowDownward fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {faq.question}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {faq.answer.substring(0, 100)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={faq.category} size="small" />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box display="flex" alignItems="center">
                        <ThumbUp fontSize="small" color="success" />
                        <Typography variant="caption" ml={0.5}>
                          {faq.helpful}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center">
                        <ThumbDown fontSize="small" color="error" />
                        <Typography variant="caption" ml={0.5}>
                          {faq.notHelpful}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={faq.isActive}
                      onChange={() => handleToggleActive(faq)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`v${faq.version}`}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => openEditDialog(faq)}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(faq.id)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingFaq ? tr("faqManagement.editQuestion") : tr("faqManagement.addNew")}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label={tr("faqManagement.question")}
                fullWidth
                multiline
                rows={2}
                value={formData.question}
                onChange={(e) =>
                  setFormData({ ...formData, question: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={tr("faqManagement.answer")}
                fullWidth
                multiline
                rows={4}
                value={formData.answer}
                onChange={(e) =>
                  setFormData({ ...formData, answer: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{tr("faqManagement.category")}</InputLabel>
                <Select
                  value={formData.category}
                  label={tr("faqManagement.category")}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                >
                  <MenuItem value="general">{tr("faqManagement.categories.general")}</MenuItem>
                  <MenuItem value="shipping">{tr("faqManagement.categories.shipping")}</MenuItem>
                  <MenuItem value="payment">{tr("faqManagement.categories.payment")}</MenuItem>
                  <MenuItem value="returns">{tr("faqManagement.categories.returns")}</MenuItem>
                  <MenuItem value="products">{tr("faqManagement.categories.products")}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={tr("faqManagement.tags")}
                fullWidth
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder={tr("faqManagement.tagsPlaceholder")}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                  />
                }
                label={tr("faqManagement.active")}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{tr("common.cancel")}</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.question || !formData.answer}
          >
            {tr("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FAQManagement;
