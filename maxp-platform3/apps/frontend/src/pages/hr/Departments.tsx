import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Trash2,
  Users,
  MoreVertical,
  ChevronRight,
  UserCircle,
  X,
  UserPlus,
  Pencil,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import api from "../../services/api";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuthSimple";
import { motion, AnimatePresence } from "framer-motion";
import DepartmentCard from "./components/DepartmentCard";
import DepartmentSkeleton from "./components/DepartmentSkeleton";
import HierarchyView from "./components/HierarchyView";
import { LayoutGrid, Network as HierarchyIcon } from "lucide-react";

interface Department {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  color: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  parentId: string | null;
  managerId: string | null;
  manager: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
  } | null;
  parent: {
    id: string;
    name: string;
  } | null;
  _count: {
    users: number; // ✅ Changed from employees to users (employees are in User table)
    positions: number;
    children: number;
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatar?: string;
  hasEmployeeRecord?: boolean;
  department?: {
    id: string;
    name: string;
  } | null;
  departmentId?: string | null;
  position?: {
    title: string;
  } | null;
}

const colorOptions = [
  { value: "#3B82F6", label: "أزرق" },
  { value: "#10B981", label: "أخضر" },
  { value: "#F59E0B", label: "برتقالي" },
  { value: "#EF4444", label: "أحمر" },
  { value: "#8B5CF6", label: "بنفسجي" },
  { value: "#EC4899", label: "وردي" },
  { value: "#06B6D4", label: "سماوي" },
  { value: "#84CC16", label: "ليموني" },
  { value: "#F97316", label: "برتقالي غامق" },
  { value: "#6366F1", label: "نيلي" },
  { value: "#14B8A6", label: "تركوازي" },
  { value: "#FACC15", label: "أصفر" },
  { value: "#475569", label: "رمادي" },
];

const Departments: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Check if user has permission to manage departments
  const canManage =
    user &&
    ["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER", "OWNER"].includes(user.role);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [employeeToRemove, setEmployeeToRemove] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isAddingEmployees, setIsAddingEmployees] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    nameEn: "",
    description: "",
    color: "#3B82F6",
    parentId: "none",
    managerId: "none",
    isActive: true,
    sortOrder: 0,
  });

  const [viewMode, setViewMode] = useState<"grid" | "hierarchy">("grid");

  // Bulk import state
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [assignEmployeesSelection, setAssignEmployeesSelection] = useState<
    string[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAssigningEmployees, setIsAssigningEmployees] = useState(false);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await api.get("/hr/departments?includeInactive=true");
      setDepartments(response.data.departments);
    } catch (error: any) {
      console.error("Error fetching departments:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "حدث خطأ أثناء جلب الأقسام";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/hr/employees?limit=1000");
      setEmployees(response.data.employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  // Validation function
  const validateDepartmentData = (data: typeof formData): string[] => {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push("اسم القسم مطلوب");
    }

    if (data.name && data.name.length > 100) {
      errors.push("اسم القسم يجب ألا يتجاوز 100 حرف");
    }

    if (data.nameEn && data.nameEn.length > 100) {
      errors.push("الاسم الإنجليزي يجب ألا يتجاوز 100 حرف");
    }

    if (data.nameEn && !/^[a-zA-Z0-9\s]*$/.test(data.nameEn)) {
      errors.push("الاسم الإنجليزي يجب أن يحتوي على أحرف إنجليزية وأرقام فقط");
    }

    if (data.description && data.description.length > 500) {
      errors.push("الوصف يجب ألا يتجاوز 500 حرف");
    }

    return errors;
  };

  // Filter and search logic
  const filteredDepartments = departments.filter((dept) => {
    // Search filter
    const matchesSearch =
      searchQuery.trim() === "" ||
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.nameEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && dept.isActive) ||
      (filterStatus === "inactive" && !dept.isActive);

    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return (a.sortOrder || 0) - (b.sortOrder || 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
  const paginatedDepartments = filteredDepartments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  // Filter employees for search
  const filteredEmployees = employees.filter((emp) => {
    if (!employeeSearchQuery.trim()) return true;
    const query = employeeSearchQuery.toLowerCase();
    return (
      emp.firstName.toLowerCase().includes(query) ||
      emp.lastName.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query)
    );
  });

  // Toggle employee selection
  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId],
    );
  };

  // Reset employee selection
  const resetEmployeeSelection = () => {
    setSelectedEmployees([]);
  };

  const fillFormFromDepartment = (dept: Department) => {
    setFormData({
      name: dept.name,
      nameEn: dept.nameEn || "",
      description: dept.description || "",
      color: dept.color || "#3B82F6",
      parentId: dept.parentId || "none",
      managerId: dept.managerId || "none",
      isActive: dept.isActive,
      sortOrder: dept.sortOrder || 0,
    });
  };

  const toggleAssignEmployeeSelection = (employeeId: string) => {
    setAssignEmployeesSelection((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId],
    );
  };

  const resetAssignEmployeeSelection = () => {
    setAssignEmployeesSelection([]);
  };

  const handleAddDepartment = async () => {
    if (!canManage) {
      toast.error("غير مصرح لك بإضافة أقسام");
      return;
    }

    // Validate data first
    const validationErrors = validateDepartmentData(formData);
    if (validationErrors.length > 0) {
      validationErrors.forEach((error) => toast.error(error));
      return;
    }

    // If no employees selected, use regular department creation
    if (selectedEmployees.length === 0) {
      try {
        const submitData = {
          ...formData,
          parentId:
            formData.parentId === "none" ? null : formData.parentId || null,
          managerId:
            formData.managerId === "none" ? null : formData.managerId || null,
        };
        await api.post("/hr/departments", submitData);
        toast.success("تم إضافة القسم بنجاح");
        setShowAddDialog(false);
        resetForm();
        fetchDepartments();
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.error ||
          error.message ||
          "حدث خطأ أثناء إضافة القسم";
        toast.error(errorMessage);
      }
      return;
    }

    // If there are selected employees, create department and assign employees
    setIsProcessing(true);
    try {
      // First create the department
      const deptData = {
        ...formData,
        parentId:
          formData.parentId === "none" ? null : formData.parentId || null,
        managerId:
          formData.managerId === "none" ? null : formData.managerId || null,
      };

      const deptResponse = await api.post("/hr/departments", deptData);
      const newDepartmentId = deptResponse.data.department.id;

      // Then assign selected employees to the new department
      const assignPromises = selectedEmployees.map((empId) =>
        api.put(`/hr/employees/${empId}`, { departmentId: newDepartmentId }),
      );

      await Promise.all(assignPromises);

      toast.success(
        `تم إنشاء القسم وإضافة ${selectedEmployees.length} موظف بنجاح`,
      );

      setShowAddDialog(false);
      resetForm();
      resetEmployeeSelection();
      fetchDepartments();
      fetchEmployees();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error ||
        "حدث خطأ أثناء إنشاء القسم وإضافة الموظفين",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditDepartment = async () => {
    if (!selectedDepartment) return;

    if (!canManage) {
      toast.error("غير مصرح لك بتعديل الأقسام");
      return;
    }

    // Validate data first
    const validationErrors = validateDepartmentData(formData);
    if (validationErrors.length > 0) {
      validationErrors.forEach((error) => toast.error(error));
      return;
    }

    try {
      const submitData = {
        ...formData,
        parentId:
          formData.parentId === "none" ? null : formData.parentId || null,
        managerId:
          formData.managerId === "none" ? null : formData.managerId || null,
      };
      await api.put(`/hr/departments/${selectedDepartment.id}`, submitData);
      toast.success("تم تحديث القسم بنجاح");
      const manager = submitData.managerId
        ? employees.find((e) => e.id === submitData.managerId)
        : null;
      const parent = submitData.parentId
        ? departments.find((d) => d.id === submitData.parentId)
        : null;
      setSelectedDepartment((prev) =>
        prev
          ? {
            ...prev,
            name: submitData.name,
            nameEn: submitData.nameEn || null,
            description: submitData.description || null,
            color: submitData.color,
            parentId: submitData.parentId,
            managerId: submitData.managerId,
            isActive: submitData.isActive,
            sortOrder: submitData.sortOrder || 0,
            parent: parent ? { id: parent.id, name: parent.name } : null,
            manager: manager
              ? {
                id: manager.id,
                firstName: manager.firstName,
                lastName: manager.lastName,
                avatar: manager.avatar || "",
              }
              : null,
          }
          : prev,
      );
      setIsEditingDetails(false);
      fetchDepartments();
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "حدث خطأ أثناء تحديث القسم");
    }
  };

  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) return;

    if (!canManage) {
      toast.error("غير مصرح لك بحذف الأقسام");
      return;
    }

    try {
      await api.delete(`/hr/departments/${selectedDepartment.id}`);
      toast.success("تم حذف القسم بنجاح");
      setShowDeleteDialog(false);
      setSelectedDepartment(null);
      fetchDepartments();
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "حدث خطأ أثناء حذف القسم");
    }
  };

  const openEditDialog = (dept: Department) => {
    setSelectedDepartment(dept);
    fillFormFromDepartment(dept);
    setShowDetailsDialog(true);
    setIsEditingDetails(true);
    setIsAddingEmployees(false);
    resetAssignEmployeeSelection();
  };

  const handleAssignEmployees = async () => {
    if (!selectedDepartment) return;

    if (!canManage) {
      toast.error("غير مصرح لك بتعيين موظفين");
      return;
    }

    if (assignEmployeesSelection.length === 0) {
      toast.error("اختر موظف واحد على الأقل");
      return;
    }

    setIsAssigningEmployees(true);
    try {
      const assignPromises = assignEmployeesSelection.map((empId) =>
        api.put(`/hr/employees/${empId}`, {
          departmentId: selectedDepartment.id,
        }),
      );
      await Promise.all(assignPromises);
      toast.success(`تم إضافة ${assignEmployeesSelection.length} موظف للقسم`);
      setIsAddingEmployees(false);
      resetAssignEmployeeSelection();
      fetchDepartments();
      fetchEmployees();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "حدث خطأ أثناء إضافة الموظفين للقسم",
      );
    } finally {
      setIsAssigningEmployees(false);
    }
  };

  const handleRemoveFromDepartment = async (employeeId: string) => {
    if (!canManage) {
      toast.error("غير مصرح لك بتغيير قسم الموظفين");
      return;
    }

    setEmployeeToRemove(employeeId);
    setShowRemoveConfirm(true);
  };

  const confirmRemoveFromDepartment = async () => {
    if (!employeeToRemove) return;

    try {
      await api.put(`/hr/employees/${employeeToRemove}`, {
        departmentId: null,
      });
      toast.success("تم إزالة الموظف من القسم");
      setShowRemoveConfirm(false);
      setEmployeeToRemove(null);
      fetchDepartments();
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "حدث خطأ أثناء إزالة الموظف");
    }
  };

  const openDetailsDialog = (dept: Department) => {
    setSelectedDepartment(dept);
    fillFormFromDepartment(dept);
    setShowDetailsDialog(true);
    setIsEditingDetails(false);
    setIsAddingEmployees(false);
    resetAssignEmployeeSelection();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      nameEn: "",
      description: "",
      color: "#3B82F6",
      parentId: "none",
      managerId: "none",
      isActive: true,
      sortOrder: 0,
    });
  };

  const totalEmployees = departments.reduce(
    (sum, d) => sum + d._count.users,
    0,
  );

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            إدارة الأقسام
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {departments.length} قسم • {totalEmployees} موظف
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة قسم
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filter Bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/20 dark:shadow-none"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Input
              placeholder="ابحث عن قسم بالاسم أو الوصف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 h-12 bg-gray-50/50 dark:bg-gray-800/50 border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-medium"
            />
            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
          </div>
          <div className="flex gap-2">
            <Select
              value={filterStatus}
              onValueChange={(value: any) => setFilterStatus(value)}
            >
              <SelectTrigger className="w-full md:w-56 h-12 bg-gray-50/50 dark:bg-gray-800/50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="حالة الأقسام" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-gray-100 dark:border-gray-800">
                <SelectItem value="all">جميع الأقسام</SelectItem>
                <SelectItem value="active">النشطة والفعالة</SelectItem>
                <SelectItem value="inactive">المؤرشفة (غير نشطة)</SelectItem>
              </SelectContent>
            </Select>
            {(searchQuery || filterStatus !== "all") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                }}
                className="h-12 px-6 rounded-2xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <X className="h-4 w-4 ml-2" />
                تصفير
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-gray-900 overflow-hidden relative group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Building2 className="h-16 w-16 text-blue-600" />
          </div>
          <CardContent className="p-6 relative">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider">
              إجمالي الأقسام
            </p>
            <h3 className="text-4xl font-black mt-2 text-blue-600 dark:text-blue-400">
              {departments.length}
            </h3>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-gray-900 overflow-hidden relative group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Activity className="h-16 w-16 text-emerald-600" />
          </div>
          <CardContent className="p-6 relative">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider">
              الأقسام النشطة
            </p>
            <h3 className="text-4xl font-black mt-2 text-emerald-600 dark:text-emerald-400">
              {departments.filter((d) => d.isActive).length}
            </h3>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-gray-900 overflow-hidden relative group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Users className="h-16 w-16 text-purple-600" />
          </div>
          <CardContent className="p-6 relative">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider">
              إجمالي الموظفين
            </p>
            <h3 className="text-4xl font-black mt-2 text-purple-600 dark:text-purple-400">
              {totalEmployees}
            </h3>
          </CardContent>
        </Card>
      </motion.div>

      {/* View Toggle and Controls */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="rounded-lg gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            عرض الشبكة
          </Button>
          <Button
            variant={viewMode === "hierarchy" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("hierarchy")}
            className="rounded-lg gap-2"
          >
            <HierarchyIcon className="h-4 w-4" />
            الهيكل التنظيمي
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <DepartmentSkeleton />
          </motion.div>
        ) : viewMode === "hierarchy" ? (
          <motion.div
            key="hierarchy"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <HierarchyView departments={departments} />
          </motion.div>
        ) : departments.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Building2 className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">لا توجد أقسام مضافة بعد</p>
                {canManage && (
                  <Button
                    variant="link"
                    className="mt-2 text-primary hover:underline"
                    onClick={() => setShowAddDialog(true)}
                  >
                    ابدأ بإضافة أول قسم الآن
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedDepartments.map((dept) => (
                <DepartmentCard
                  key={dept.id}
                  department={dept}
                  onViewDetails={openDetailsDialog}
                  onDelete={(d) => {
                    setSelectedDepartment(d);
                    setShowDeleteDialog(true);
                  }}
                  canManage={canManage || false}
                />
              ))}
            </div>

            {/* Pagination moved here for consistency */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm font-medium text-gray-500">
                  عرض {paginatedDepartments.length} من{" "}
                  {filteredDepartments.length} قسم
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className="rounded-xl"
                  >
                    السابق
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (page) =>
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - currentPage) <= 1,
                      )
                      .map((page, idx, arr) => (
                        <React.Fragment key={page}>
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <span className="flex items-center text-gray-300">
                              ...
                            </span>
                          )}
                          <Button
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={`min-w-[40px] rounded-xl font-bold ${currentPage === page ? "shadow-lg shadow-primary/20" : ""}`}
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="rounded-xl"
                  >
                    التالي
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Department Dialog */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) {
            resetForm();
            resetEmployeeSelection();
            setEmployeeSearchQuery("");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              إضافة قسم جديد
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              أدخل بيانات القسم ويمكنك اختيار المدير وإضافة الموظفين إن رغبت.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Department Info Section */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                معلومات القسم
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">
                    اسم القسم *
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="مثال: قسم المبيعات"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">
                    الاسم بالإنجليزية
                  </Label>
                  <Input
                    value={formData.nameEn}
                    onChange={(e) =>
                      setFormData({ ...formData, nameEn: e.target.value })
                    }
                    placeholder="e.g. Sales Department"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">
                    الوصف
                  </Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="وصف مختصر للقسم..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">
                      اللون
                    </Label>
                    <div className="flex gap-2 flex-wrap">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color.value
                            ? "border-gray-900 dark:border-gray-100 scale-110"
                            : "border-transparent"
                            }`}
                          style={{ backgroundColor: color.value }}
                          onClick={() =>
                            setFormData({ ...formData, color: color.value })
                          }
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">
                      القسم الأب
                    </Label>
                    <Select
                      value={formData.parentId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, parentId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر القسم الأب" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">
                      ترتيب العرض
                    </Label>
                    <Input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sortOrder: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                    />
                    <p className="text-[10px] text-gray-400">
                      أرقام أصغر تظهر أولاً
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">
                    مدير القسم (اختياري)
                  </Label>
                  <Select
                    value={formData.managerId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, managerId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المدير" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="none">بدون</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {emp.firstName} {emp.lastName}
                            </span>
                            <span className="text-gray-400 text-sm">•</span>
                            <span className="text-gray-500 text-sm">
                              {emp.email || "لا يوجد بريد"}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-4 py-2">
                  <Label
                    htmlFor="isActive-add"
                    className="text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    القسم نشط
                  </Label>
                  <Switch
                    id="isActive-add"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                    className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">
                    ترتيب العرض (اختياري)
                  </Label>
                  <Input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sortOrder: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                  <p className="text-[10px] text-gray-400">أرقام أصغر تظهر أولاً</p>
                </div>
              </div>
            </div>

            {/* Employees Selection Section */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  إضافة موظفين (اختياري)
                </h3>
                {selectedEmployees.length > 0 && (
                  <Badge
                    variant="default"
                    className="bg-blue-100 text-blue-800"
                  >
                    {selectedEmployees.length} موظف محدد
                  </Badge>
                )}
              </div>

              {/* Employee Multi-Select Dropdown */}
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300 text-sm">
                  اختر الموظفين من القائمة
                </Label>
                {/* Search input for employees */}
                <Input
                  placeholder="ابحث عن موظف..."
                  value={employeeSearchQuery}
                  onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                  className="mb-2"
                />
                <div className="max-h-60 overflow-y-auto border rounded-xl p-2 bg-white dark:bg-gray-900 space-y-1">
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedEmployees.includes(emp.id)
                          ? "bg-blue-50 dark:bg-blue-900/30"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800"
                          }`}
                        onClick={() => toggleEmployeeSelection(emp.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={emp.avatar} />
                            <AvatarFallback>
                              {emp.firstName[0]}
                              {emp.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {emp.firstName} {emp.lastName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {emp.email || "لا يوجد بريد"}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedEmployees.includes(emp.id)
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-gray-300 dark:border-gray-600"
                            }`}
                        >
                          {selectedEmployees.includes(emp.id) && (
                            <Plus className="h-3 w-3" />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      لا يوجد نتائج للبحث
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Employees List */}
              {selectedEmployees.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300 text-sm">
                    الموظفون المحددون:
                  </Label>
                  <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    <div className="divide-y dark:divide-gray-700">
                      {selectedEmployees.map((empId) => {
                        const emp = employees.find((e) => e.id === empId);
                        if (!emp) return null;
                        return (
                          <div
                            key={empId}
                            className="flex items-center justify-between p-2 bg-white dark:bg-gray-800"
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={emp.avatar} />
                                <AvatarFallback className="text-xs bg-primary text-white">
                                  {emp.firstName?.[0]}
                                  {emp.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">
                                  {emp.firstName} {emp.lastName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {emp.email}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700"
                              onClick={() => toggleEmployeeSelection(empId)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                resetEmployeeSelection();
                setEmployeeSearchQuery("");
              }}
              className="w-full sm:w-auto"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAddDepartment}
              className="w-full sm:w-auto gap-2"
              disabled={isProcessing || !formData.name}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  {selectedEmployees.length > 0 ? (
                    <>
                      <UserPlus className="h-4 w-4" />
                      إضافة القسم و {selectedEmployees.length} موظف
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      إضافة القسم
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Details Dialog */}
      <Dialog
        open={showDetailsDialog}
        onOpenChange={(open) => {
          setShowDetailsDialog(open);
          if (!open) {
            setIsEditingDetails(false);
            setIsAddingEmployees(false);
            resetAssignEmployeeSelection();
            setEmployeeSearchQuery("");
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 rounded-3xl border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {selectedDepartment
                ? `تفاصيل قسم ${selectedDepartment.name}`
                : "تفاصيل القسم"}
            </DialogTitle>
            <DialogDescription>
              عرض بيانات القسم وإدارة الموظفين والتعديلات.
            </DialogDescription>
          </DialogHeader>
          {selectedDepartment && (
            <div className="bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{
                        backgroundColor: selectedDepartment.color || "#3B82F6",
                      }}
                    />
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedDepartment.name}
                      </h2>
                      {selectedDepartment.nameEn && (
                        <p className="text-gray-600 dark:text-gray-300">
                          {selectedDepartment.nameEn}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        selectedDepartment.isActive ? "default" : "secondary"
                      }
                    >
                      {selectedDepartment.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                    {canManage && (
                      <>
                        <Button
                          variant={isAddingEmployees ? "secondary" : "outline"}
                          className="gap-2"
                          onClick={() => {
                            setIsAddingEmployees((prev) => !prev);
                            setIsEditingDetails(false);
                          }}
                        >
                          <UserPlus className="h-4 w-4" />
                          {isAddingEmployees
                            ? "إغلاق إضافة الموظفين"
                            : "إضافة موظفين"}
                        </Button>
                        <Button
                          variant={isEditingDetails ? "secondary" : "outline"}
                          className="gap-2"
                          onClick={() => {
                            setIsEditingDetails((prev) => {
                              const next = !prev;
                              if (!next && selectedDepartment) {
                                fillFormFromDepartment(selectedDepartment);
                              }
                              return next;
                            });
                            setIsAddingEmployees(false);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          {isEditingDetails ? "إلغاء التعديل" : "تعديل"}
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setShowDetailsDialog(false)}
                    >
                      رجوع
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-white/70 dark:bg-gray-900/60">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          عدد الموظفين
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedDepartment._count.users}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-blue-500" />
                    </CardContent>
                  </Card>
                  <Card className="bg-white/70 dark:bg-gray-900/60">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          الأقسام الفرعية
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedDepartment._count.children}
                        </p>
                      </div>
                      <Building2 className="h-8 w-8 text-purple-500" />
                    </CardContent>
                  </Card>
                  <Card className="bg-white/70 dark:bg-gray-900/60">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          الوظائف
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedDepartment._count.positions}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-green-500" />
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-white/80 dark:bg-gray-900/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">معلومات القسم</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-gray-500 dark:text-gray-400">المدير</p>
                      {selectedDepartment.manager ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage
                              src={selectedDepartment.manager.avatar}
                            />
                            <AvatarFallback className="text-xs">
                              {selectedDepartment.manager.firstName?.[0]}
                              {selectedDepartment.manager.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-gray-900 dark:text-gray-100">
                            {selectedDepartment.manager.firstName}{" "}
                            {selectedDepartment.manager.lastName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">غير محدد</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-500 dark:text-gray-400">
                        القسم الأب
                      </p>
                      <span className="text-gray-900 dark:text-gray-100">
                        {selectedDepartment.parent?.name || "بدون"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-500 dark:text-gray-400">اللون</p>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 dark:text-gray-100">
                          {selectedDepartment.color}
                        </span>
                        <div
                          className="w-5 h-5 rounded border"
                          style={{
                            backgroundColor:
                              selectedDepartment.color || "#3B82F6",
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-500 dark:text-gray-400">الترتيب</p>
                      <span className="text-gray-900 dark:text-gray-100 font-bold">
                        {selectedDepartment.sortOrder || 0}
                      </span>
                    </div>
                    {selectedDepartment.description && (
                      <div className="md:col-span-3 space-y-1">
                        <p className="text-gray-500 dark:text-gray-400">
                          الوصف
                        </p>
                        <p className="text-gray-800 dark:text-gray-200">
                          {selectedDepartment.description}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ✅ Added: Employees List in Department */}
                <Card className="bg-white/80 dark:bg-gray-900/60">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      موظفو القسم
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200"
                    >
                      {
                        employees.filter(
                          (e) =>
                            e.department?.id === selectedDepartment.id ||
                            e.departmentId === selectedDepartment.id,
                        ).length
                      }{" "}
                      موظف
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {employees.filter(
                        (e) =>
                          e.department?.id === selectedDepartment.id ||
                          e.departmentId === selectedDepartment.id,
                      ).length > 0 ? (
                        employees
                          .filter(
                            (e) =>
                              e.department?.id === selectedDepartment.id ||
                              e.departmentId === selectedDepartment.id,
                          )
                          .map((emp) => (
                            <div
                              key={emp.id}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border border-gray-100">
                                  <AvatarImage src={emp.avatar} />
                                  <AvatarFallback className="bg-blue-50 text-blue-600 font-bold">
                                    {emp.firstName?.[0]}
                                    {emp.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                    {emp.firstName} {emp.lastName}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>
                                      {emp.position?.title || "بدون مسمى وظيفي"}
                                    </span>
                                    {emp.email && <span>• {emp.email}</span>}
                                  </div>
                                </div>
                              </div>
                              {canManage && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                                  onClick={() =>
                                    handleRemoveFromDepartment(emp.id)
                                  }
                                  title="إزالة من القسم"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-6 text-gray-500 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg border border-dashed text-sm">
                          لا يوجد موظفين في هذا القسم حالياً
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {isEditingDetails && (
                  <Card className="bg-white/90 dark:bg-gray-900/70">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">تعديل القسم</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-700 dark:text-gray-300">
                            اسم القسم *
                          </Label>
                          <Input
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>ترتيب العرض (اختياري)</Label>
                          <Input
                            type="number"
                            value={formData.sortOrder}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                sortOrder: parseInt(e.target.value) || 0,
                              })
                            }
                            placeholder="0"
                          />
                          <p className="text-[10px] text-gray-400">أرقام أصغر تظهر أولاً</p>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label className="text-gray-700 dark:text-gray-300">
                            الاسم بالإنجليزية
                          </Label>
                          <Input
                            value={formData.nameEn}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                nameEn: e.target.value,
                              })
                            }
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-700 dark:text-gray-300">
                          الوصف
                        </Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-700 dark:text-gray-300">
                            اللون
                          </Label>
                          <div className="flex gap-2 flex-wrap">
                            {colorOptions.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color.value
                                  ? "border-gray-900 dark:border-gray-100 scale-110"
                                  : "border-transparent"
                                  }`}
                                style={{ backgroundColor: color.value }}
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    color: color.value,
                                  })
                                }
                              />
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-700 dark:text-gray-300">
                            القسم الأب
                          </Label>
                          <Select
                            value={formData.parentId}
                            onValueChange={(value) =>
                              setFormData({ ...formData, parentId: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر القسم الأب" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">بدون</SelectItem>
                              {departments
                                .filter((d) => d.id !== selectedDepartment?.id)
                                .map((dept) => (
                                  <SelectItem key={dept.id} value={dept.id}>
                                    {dept.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-700 dark:text-gray-300">
                          مدير القسم (اختياري)
                        </Label>
                        <Select
                          value={formData.managerId}
                          onValueChange={(value) =>
                            setFormData({ ...formData, managerId: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المدير" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="none">بدون</SelectItem>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {emp.firstName} {emp.lastName}
                                  </span>
                                  <span className="text-gray-400 text-sm">
                                    •
                                  </span>
                                  <span className="text-gray-500 text-sm">
                                    {emp.email || "لا يوجد بريد"}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between gap-4 py-2">
                        <Label
                          htmlFor="isActive-details"
                          className="text-gray-700 dark:text-gray-300 cursor-pointer"
                        >
                          القسم نشط
                        </Label>
                        <Switch
                          id="isActive-details"
                          checked={formData.isActive}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, isActive: checked })
                          }
                          className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (selectedDepartment)
                              fillFormFromDepartment(selectedDepartment);
                            setIsEditingDetails(false);
                          }}
                        >
                          إلغاء
                        </Button>
                        <Button
                          onClick={handleEditDepartment}
                          disabled={!formData.name}
                        >
                          حفظ التغييرات
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {isAddingEmployees && (
                  <Card className="bg-white/90 dark:bg-gray-900/70">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        إضافة موظفين للقسم
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-gray-700 dark:text-gray-300 text-sm">
                          اختر الموظفين من القائمة
                        </Label>
                        {/* Search input for employees */}
                        <Input
                          placeholder="ابحث عن موظف..."
                          value={employeeSearchQuery}
                          onChange={(e) =>
                            setEmployeeSearchQuery(e.target.value)
                          }
                          className="mb-2"
                        />
                        <div className="max-h-60 overflow-y-auto border rounded-xl p-2 bg-white dark:bg-gray-900 space-y-1">
                          {filteredEmployees.length > 0 ? (
                            filteredEmployees.map((emp) => (
                              <div
                                key={emp.id}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${assignEmployeesSelection.includes(emp.id)
                                  ? "bg-blue-50 dark:bg-blue-900/30"
                                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                  }`}
                                onClick={() =>
                                  toggleAssignEmployeeSelection(emp.id)
                                }
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={emp.avatar} />
                                    <AvatarFallback>
                                      {emp.firstName[0]}
                                      {emp.lastName[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm">
                                      {emp.firstName} {emp.lastName}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {emp.email || "لا يوجد بريد"}
                                    </span>
                                  </div>
                                </div>
                                <div
                                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${assignEmployeesSelection.includes(emp.id)
                                    ? "bg-blue-600 border-blue-600 text-white"
                                    : "border-gray-300 dark:border-gray-600"
                                    }`}
                                >
                                  {assignEmployeesSelection.includes(
                                    emp.id,
                                  ) && <Plus className="h-3 w-3" />}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-400 text-sm">
                              لا يوجد نتائج للبحث
                            </div>
                          )}
                        </div>
                      </div>

                      {assignEmployeesSelection.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-gray-700 dark:text-gray-300 text-sm">
                            الموظفون المحددون:
                          </Label>
                          <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                            <div className="divide-y dark:divide-gray-700">
                              {assignEmployeesSelection.map((empId) => {
                                const emp = employees.find(
                                  (e) => e.id === empId,
                                );
                                if (!emp) return null;
                                return (
                                  <div
                                    key={empId}
                                    className="flex items-center justify-between p-2 bg-white dark:bg-gray-800"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={emp.avatar} />
                                        <AvatarFallback className="text-xs bg-primary text-white">
                                          {emp.firstName?.[0]}
                                          {emp.lastName?.[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <div className="font-medium text-sm">
                                          {emp.firstName} {emp.lastName}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {emp.email}
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-500 hover:text-red-700"
                                      onClick={() =>
                                        toggleAssignEmployeeSelection(empId)
                                      }
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsAddingEmployees(false);
                            resetAssignEmployeeSelection();
                          }}
                        >
                          إلغاء
                        </Button>
                        <Button
                          onClick={handleAssignEmployees}
                          className="gap-2"
                          disabled={isAssigningEmployees}
                        >
                          {isAssigningEmployees ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                              جاري الإضافة...
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4" />
                              إضافة الموظفين
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              تأكيد الحذف
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="py-4 text-gray-700 dark:text-gray-300">
            هل أنت متأكد من حذف قسم "{selectedDepartment?.name}"؟
            {selectedDepartment?._count.users &&
              selectedDepartment._count.users > 0 && (
                <span className="block text-red-500 text-sm mt-2">
                  ⚠️ هذا القسم يحتوي على {selectedDepartment._count.users} موظف
                </span>
              )}
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDeleteDepartment}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Employee Confirmation */}
      <Dialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تأكيد إزالة الموظف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رغبتك في إزالة هذا الموظف من القسم؟ لن يتم حذف
              الموظف من النظام، بل سيصبح بدون قسم فقط.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-start">
            <Button
              variant="destructive"
              onClick={confirmRemoveFromDepartment}
              className="px-6"
            >
              إزالة الآن
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowRemoveConfirm(false);
                setEmployeeToRemove(null);
              }}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Departments;
