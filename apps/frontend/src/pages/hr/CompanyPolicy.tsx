import React, { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Save,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Clock,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import api from "../../services/api";

interface Policy {
  id: string;
  title: string;
  content: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

const categories = [
  { value: "attendance", label: "الحضور والانصراف" },
  { value: "leaves", label: "الإجازات" },
  { value: "conduct", label: "السلوك المهني" },
  { value: "compensation", label: "التعويضات والمزايا" },
  { value: "safety", label: "الصحة والسلامة" },
  { value: "it", label: "تكنولوجيا المعلومات" },
  { value: "general", label: "سياسات عامة" },
];

const CompanyPolicy: React.FC = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [viewingPolicy, setViewingPolicy] = useState<Policy | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "general",
    isActive: true,
  });

  // Fetch policies
  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/hr/policies", {
        params: {
          category: selectedCategory !== "all" ? selectedCategory : undefined,
          search: searchQuery,
        },
      });
      if (data.success) {
        setPolicies(data.policies);
      }
    } catch (error) {
      console.error("Failed to fetch policies:", error);
      // Fallback to empty or mock if needed, but for now show error
      // tToast.error("hr_CompanyPolicy.failed_load_3491");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPolicies();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const handleCreate = async () => {
    if (!formData.title || !formData.content) {
      tToast.error("hr_CompanyPolicy.msg_e09d");
      return;
    }

    try {
      const { data } = await api.post("/hr/policies", formData);
      if (data.success) {
        tToast.success("hr_CompanyPolicy.success_create_6d9e");
        setPolicies([data.policy, ...policies]);
        setIsAddDialogOpen(false);
        setFormData({
          title: "",
          content: "",
          category: "general",
          isActive: true,
        });
      }
    } catch (error) {
      tToast.error("hr_CompanyPolicy.failed_create_b4c3");
    }
  };

  const handleUpdate = async () => {
    if (!editingPolicy) return;

    try {
      const { data } = await api.put(`/hr/policies/${editingPolicy.id}`, {
        title: editingPolicy.title,
        content: editingPolicy.content,
        category: editingPolicy.category,
        isActive: editingPolicy.isActive,
      });

      if (data.success) {
        tToast.success("hr_CompanyPolicy.success_update_c338");
        setPolicies(
          policies.map((p) => (p.id === editingPolicy.id ? data.policy : p)),
        );
        setEditingPolicy(null);
      }
    } catch (error) {
      tToast.error("hr_CompanyPolicy.failed_update_7a20");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه السياسة؟")) return;

    try {
      await api.delete(`/hr/policies/${id}`);
      setPolicies(policies.filter((p) => p.id !== id));
      tToast.success("hr_CompanyPolicy.success_delete_e3d8");
    } catch (error) {
      tToast.error("hr_CompanyPolicy.failed_delete_5065");
    }
  };

  const getCategoryLabel = (value: string) => {
    return categories.find((c) => c.value === value)?.label || value;
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header & Stats */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              سياسات الشركة
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              الدليل الشامل للوائح والقوانين التنظيمية
            </p>
          </div>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 ml-2" />
            إضافة سياسة جديدة
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm mb-1">إجمالي السياسات</p>
                <h3 className="text-2xl font-bold">{policies.length}</h3>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm mb-1">
                  السياسات الفعالة
                </p>
                <h3 className="text-2xl font-bold">
                  {policies.filter((p) => p.isActive).length}
                </h3>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm mb-1">
                  التحديثات الأخيرة
                </p>
                <h3 className="text-2xl font-bold">
                  {
                    policies.filter((p) => {
                      const date = new Date(p.updatedAt);
                      const now = new Date();
                      const diffTime = Math.abs(now.getTime() - date.getTime());
                      const diffDays = Math.ceil(
                        diffTime / (1000 * 60 * 60 * 24),
                      );
                      return diffDays <= 30;
                    }).length
                  }
                </h3>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm mb-1">فئات السياسات</p>
                <h3 className="text-2xl font-bold">
                  {new Set(policies.map((p) => p.category)).size}
                </h3>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="border-none shadow-sm bg-white dark:bg-gray-900">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
              <Input
                placeholder="بحث في السياسات..."
                className="pr-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64">
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="تصفية حسب الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Policies Table */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : policies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <FileText className="h-16 w-16 mb-4 opacity-20" />
              <h3 className="text-lg font-semibold">لا توجد سياسات مطابقة</h3>
              <p>جرب تغيير معايير البحث أو أضف سياسة جديدة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-800">
                  <TableRow>
                    <TableHead className="text-right font-bold w-[300px]">عنوان السياسة</TableHead>
                    <TableHead className="text-right font-bold">الفئة</TableHead>
                    <TableHead className="text-right font-bold">الحالة</TableHead>
                    <TableHead className="text-right font-bold">الإصدار</TableHead>
                    <TableHead className="text-right font-bold">آخر تحديث</TableHead>
                    <TableHead className="text-left font-bold">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow
                      key={policy.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                      onClick={() => setViewingPolicy(policy)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 transition-colors">
                            <FileText className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="line-clamp-1">{policy.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {getCategoryLabel(policy.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {policy.isActive ? (
                          <div className="flex items-center text-green-600 gap-1.5 text-xs font-semibold">
                            <CheckCircle className="h-3 w-3" />
                            نشط
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600 gap-1.5 text-xs font-semibold">
                            <XCircle className="h-3 w-3" />
                            غير نشط
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-500 font-mono">V{policy.version}.0</span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {new Date(policy.updatedAt).toLocaleDateString("ar-EG")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                            onClick={() => setViewingPolicy(policy)}
                            title="عرض"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                            onClick={() => setEditingPolicy(policy)}
                            title="تعديل"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(policy.id)}
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Policy Dialog */}
      <Dialog
        open={!!viewingPolicy}
        onOpenChange={() => setViewingPolicy(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">
                {viewingPolicy && getCategoryLabel(viewingPolicy.category)}
              </Badge>
              <span className="text-sm text-gray-500">
                النسخة {viewingPolicy?.version}.0
              </span>
            </div>
            <DialogTitle className="text-2xl">
              {viewingPolicy?.title}
            </DialogTitle>
            <DialogDescription>
              تم التحديث في{" "}
              {viewingPolicy &&
                new Date(viewingPolicy.updatedAt).toLocaleDateString("ar-EG", {
                  dateStyle: "full",
                })}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 prose prose-lg dark:prose-invert max-w-none">
            <div
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewingPolicy?.content || "") }}
            />
          </div>

          <DialogFooter className="mt-8 border-t pt-4">
            <Button onClick={() => setViewingPolicy(null)}>إغلاق</Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditingPolicy(viewingPolicy);
                setViewingPolicy(null);
              }}
            >
              <Edit className="h-4 w-4 ml-2" />
              تعديل السياسة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Policy Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة سياسة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>عنوان السياسة *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="مثال: سياسة العمل عن بُعد"
                />
              </div>
              <div className="space-y-2">
                <Label>الفئة</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, category: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>محتوى السياسة *</Label>
              <div className="h-96 mb-12">
                <ReactQuill
                  theme="snow"
                  value={formData.content}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, content: val }))
                  }
                  className="h-80"
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, 3, false] }],
                      ["bold", "italic", "underline", "strike"],
                      [{ list: "ordered" }, { list: "bullet" }],
                      ["link", "clean"],
                      [{ color: [] }, { background: [] }],
                      [{ align: [] }],
                    ],
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                id="active"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isActive: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-blue-600 rounded"
              />
              <Label htmlFor="active">تفعيل السياسة (نشر مباشر)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreate}>حفظ السياسة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Policy Dialog */}
      <Dialog
        open={!!editingPolicy}
        onOpenChange={() => setEditingPolicy(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل السياسة</DialogTitle>
          </DialogHeader>
          {editingPolicy && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>عنوان السياسة</Label>
                  <Input
                    value={editingPolicy.title}
                    onChange={(e) =>
                      setEditingPolicy({
                        ...editingPolicy,
                        title: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>الفئة</Label>
                  <Select
                    value={editingPolicy.category}
                    onValueChange={(val) =>
                      setEditingPolicy({ ...editingPolicy, category: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>محتوى السياسة</Label>
                <div className="h-96 mb-12">
                  <ReactQuill
                    theme="snow"
                    value={editingPolicy.content}
                    onChange={(val) =>
                      setEditingPolicy({ ...editingPolicy, content: val })
                    }
                    className="h-80"
                    modules={{
                      toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ["bold", "italic", "underline", "strike"],
                        [{ list: "ordered" }, { list: "bullet" }],
                        ["link", "clean"],
                        [{ color: [] }, { background: [] }],
                        [{ align: [] }],
                      ],
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editingPolicy.isActive}
                  onChange={(e) =>
                    setEditingPolicy({
                      ...editingPolicy,
                      isActive: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <Label htmlFor="edit-active">تفعيل السياسة</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPolicy(null)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdate}>حفظ التغييرات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyPolicy;
