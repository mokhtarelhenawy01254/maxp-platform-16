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
  Eye,
  Clock,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../services/apiClient";

interface Policy {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  order: number;
  isActive: boolean;
  version: number;
  effectiveAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const getCategoryBadgeVariant = (category: string): "default" | "secondary" | "destructive" | "outline" => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    shipping: "default",
    return: "secondary",
    refund: "destructive",
    privacy: "secondary",
    terms: "outline",
  };
  return variants[category] || "outline";
};

const PolicyManagement: React.FC = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [viewingPolicy, setViewingPolicy] = useState<Policy | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "general",
    tags: "",
    isActive: true,
    effectiveAt: new Date().toISOString().slice(0, 16),
    expiresAt: "",
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/policies");
      setPolicies(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "فشل تحميل السياسات");
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
        effectiveAt: new Date(formData.effectiveAt).toISOString(),
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
      };

      if (editingPolicy) {
        await apiClient.put(`/policies/${editingPolicy.id}`, data);
        setSuccess("تم تحديث السياسة بنجاح");
      } else {
        await apiClient.post("/policies", data);
        setSuccess("تم إضافة السياسة بنجاح");
      }

      setDialogOpen(false);
      resetForm();
      loadPolicies();
    } catch (err: any) {
      setError(err.response?.data?.error || "فشل حفظ السياسة");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه السياسة؟")) return;

    try {
      await apiClient.delete(`/policies/${id}`);
      setSuccess("تم حذف السياسة بنجاح");
      loadPolicies();
    } catch (err: any) {
      setError(err.response?.data?.error || "فشل حذف السياسة");
    }
  };

  const handleToggleActive = async (policy: Policy) => {
    try {
      await apiClient.put(`/policies/${policy.id}`, {
        isActive: !policy.isActive,
      });
      setSuccess(`تم ${!policy.isActive ? "تفعيل" : "تعطيل"} السياسة بنجاح`);
      loadPolicies();
    } catch (err: any) {
      setError(err.response?.data?.error || "فشل تحديث حالة السياسة");
    }
  };

  const openEditDialog = (policy: Policy) => {
    setEditingPolicy(policy);
    setFormData({
      title: policy.title,
      content: policy.content,
      category: policy.category,
      tags: policy.tags.join(", "),
      isActive: policy.isActive,
      effectiveAt: new Date(policy.effectiveAt).toISOString().slice(0, 16),
      expiresAt: policy.expiresAt ? new Date(policy.expiresAt).toISOString().slice(0, 16) : "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPolicy(null);
    setFormData({
      title: "",
      content: "",
      category: "general",
      tags: "",
      isActive: true,
      effectiveAt: new Date().toISOString().slice(0, 16),
      expiresAt: "",
    });
  };

  const isExpired = (policy: Policy) => {
    return policy.expiresAt && new Date(policy.expiresAt) < new Date();
  };

  const isNotYetEffective = (policy: Policy) => {
    return new Date(policy.effectiveAt) > new Date();
  };

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-2xl font-bold">إدارة السياسات</h1>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          إضافة سياسة جديدة
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
                <TableHead>العنوان</TableHead>
                <TableHead>الفئة</TableHead>
                <TableHead>تاريخ السريان</TableHead>
                <TableHead>تاريخ الانتهاء</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإصدار</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow
                  key={policy.id}
                  className={
                    isExpired(policy)
                      ? "bg-red-50 dark:bg-red-950/20"
                      : isNotYetEffective(policy)
                        ? "bg-yellow-50 dark:bg-yellow-950/20"
                        : ""
                  }
                >
                  <TableCell>
                    <p className="text-sm font-bold">{policy.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {policy.content.substring(0, 80)}...
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getCategoryBadgeVariant(policy.category)}>
                      {policy.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Clock className="size-4" />
                      <span className="text-xs">
                        {new Date(policy.effectiveAt).toLocaleDateString("ar-EG")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {policy.expiresAt ? (
                      <span
                        className={`text-xs ${isExpired(policy) ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        {new Date(policy.expiresAt).toLocaleDateString("ar-EG")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        بدون انتهاء
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={policy.isActive}
                        onCheckedChange={() => handleToggleActive(policy)}
                      />
                      {isExpired(policy) && (
                        <Badge variant="destructive">منتهية</Badge>
                      )}
                      {isNotYetEffective(policy) && (
                        <Badge variant="secondary">قادمة</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{`v${policy.version}`}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setViewingPolicy(policy);
                        setViewDialogOpen(true);
                      }}
                    >
                      <Eye className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(policy)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(policy.id)}
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
              {editingPolicy ? "تعديل السياسة" : "إضافة سياسة جديدة"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-12 gap-4 mt-1">
            <div className="col-span-12">
              <Label>العنوان</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div className="col-span-12">
              <Label>المحتوى</Label>
              <Textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                rows={6}
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <Label>الفئة</Label>
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
                  <SelectItem value="general">عام</SelectItem>
                  <SelectItem value="shipping">الشحن</SelectItem>
                  <SelectItem value="return">الإرجاع</SelectItem>
                  <SelectItem value="refund">الاسترداد</SelectItem>
                  <SelectItem value="privacy">الخصوصية</SelectItem>
                  <SelectItem value="terms">الشروط والأحكام</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-12 md:col-span-6">
              <Label>الوسوم (مفصولة بفواصل)</Label>
              <Input
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder="شحن, إرجاع, ضمان"
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <Label>تاريخ السريان</Label>
              <Input
                type="datetime-local"
                value={formData.effectiveAt}
                onChange={(e) =>
                  setFormData({ ...formData, effectiveAt: e.target.value })
                }
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <Label>تاريخ الانتهاء (اختياري)</Label>
              <Input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) =>
                  setFormData({ ...formData, expiresAt: e.target.value })
                }
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
                <Label>نشط</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.title || !formData.content}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{viewingPolicy?.title}</DialogTitle>
          </DialogHeader>
          {viewingPolicy && (
            <div>
              <div className="grid grid-cols-12 gap-4 mb-2">
                <div className="col-span-6">
                  <span className="text-xs text-muted-foreground">الفئة</span>
                  <p className="text-sm">{viewingPolicy.category}</p>
                </div>
                <div className="col-span-6">
                  <span className="text-xs text-muted-foreground">الإصدار</span>
                  <p className="text-sm">v{viewingPolicy.version}</p>
                </div>
                <div className="col-span-6">
                  <span className="text-xs text-muted-foreground">تاريخ السريان</span>
                  <p className="text-sm">
                    {new Date(viewingPolicy.effectiveAt).toLocaleString("ar-EG")}
                  </p>
                </div>
                <div className="col-span-6">
                  <span className="text-xs text-muted-foreground">تاريخ الانتهاء</span>
                  <p className="text-sm">
                    {viewingPolicy.expiresAt
                      ? new Date(viewingPolicy.expiresAt).toLocaleString("ar-EG")
                      : "بدون انتهاء"}
                  </p>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">
                {viewingPolicy.content}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PolicyManagement;
