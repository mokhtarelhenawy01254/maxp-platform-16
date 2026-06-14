import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertAction } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  ThumbsUp,
  ThumbsDown,
  X,
} from "lucide-react";
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
    <div className="p-3">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-2xl font-bold">{tr("faqManagement.title")}</h1>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          {tr("faqManagement.addNew")}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>{error}</AlertDescription>
          <AlertAction>
            <button onClick={() => setError(null)} className="text-current opacity-70 hover:opacity-100">
              <X className="size-4" />
            </button>
          </AlertAction>
        </Alert>
      )}
      {success && (
        <Alert className="mb-2">
          <AlertDescription>{success}</AlertDescription>
          <AlertAction>
            <button onClick={() => setSuccess(null)} className="text-current opacity-70 hover:opacity-100">
              <X className="size-4" />
            </button>
          </AlertAction>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center p-4">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="rounded-xl border bg-card text-card-foreground">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr("faqManagement.order")}</TableHead>
                <TableHead>{tr("faqManagement.question")}</TableHead>
                <TableHead>{tr("faqManagement.category")}</TableHead>
                <TableHead>{tr("faqManagement.rating")}</TableHead>
                <TableHead>{tr("faqManagement.status")}</TableHead>
                <TableHead>{tr("faqManagement.version")}</TableHead>
                <TableHead>{tr("faqManagement.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faqs.map((faq) => (
                <TableRow key={faq.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleReorder(faq, "up")}
                        disabled={faq.order === 0}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <span className="mx-1">{faq.order}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleReorder(faq, "down")}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-bold">{faq.question}</p>
                    <span className="text-xs text-muted-foreground">
                      {faq.answer.substring(0, 100)}...
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge>{faq.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <div className="flex items-center">
                        <ThumbsUp className="size-4 text-green-500" />
                        <span className="text-xs ml-0.5">{faq.helpful}</span>
                      </div>
                      <div className="flex items-center">
                        <ThumbsDown className="size-4 text-red-500" />
                        <span className="text-xs ml-0.5">{faq.notHelpful}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={faq.isActive}
                      onCheckedChange={() => handleToggleActive(faq)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{`v${faq.version}`}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(faq)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(faq.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFaq ? tr("faqManagement.editQuestion") : tr("faqManagement.addNew")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-12 gap-4 mt-1">
            <div className="col-span-12">
              <Label>{tr("faqManagement.question")}</Label>
              <Textarea
                value={formData.question}
                onChange={(e) =>
                  setFormData({ ...formData, question: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="col-span-12">
              <Label>{tr("faqManagement.answer")}</Label>
              <Textarea
                value={formData.answer}
                onChange={(e) =>
                  setFormData({ ...formData, answer: e.target.value })
                }
                rows={4}
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <Label>{tr("faqManagement.category")}</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{tr("faqManagement.categories.general")}</SelectItem>
                  <SelectItem value="shipping">{tr("faqManagement.categories.shipping")}</SelectItem>
                  <SelectItem value="payment">{tr("faqManagement.categories.payment")}</SelectItem>
                  <SelectItem value="returns">{tr("faqManagement.categories.returns")}</SelectItem>
                  <SelectItem value="products">{tr("faqManagement.categories.products")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-12 md:col-span-6">
              <Label>{tr("faqManagement.tags")}</Label>
              <Input
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder={tr("faqManagement.tagsPlaceholder")}
              />
            </div>
            <div className="col-span-12">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label>{tr("faqManagement.active")}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tr("common.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.question || !formData.answer}
            >
              {tr("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FAQManagement;
