import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Loader2,
  Clock,
  Shield,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Switch } from "../../components/ui/switch";
import { Separator } from "../../components/ui/separator";
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
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { toast } from "sonner";
import {
  validateEmployeeData,
  getErrorMessage,
  hasError,
  ValidationError,
} from "../../utils/hrValidation";
import { EmployeeTableSkeleton } from "../../components/hr/SkeletonLoader";
import { EmptyState } from "../../components/hr/EmptyState";
import { EnhancedPagination } from "../../components/hr/EnhancedPagination";
import { useDebounce } from "../../hooks/useDebounce";

interface Employee {
  id: string;
  userId?: string | null;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  status: string;
  contractType: string;
  hireDate: string;
  department: { id: string; name: string; color: string } | null;
  position: { id: string; title: string; level: number } | null;
  manager: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
  } | null;
  // ✅ User (HR Integration) data
  user: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    isEmailVerified: boolean;
    lastLoginAt: string | null;
    createdAt: string;
  } | null;
}

interface Department {
  id: string;
  name: string;
}

interface LookupResponse {
  exists: boolean;
  status: "NOT_FOUND" | "ALREADY_ACTIVE_EMPLOYEE" | "COMPANY_USER_NOT_EMPLOYEE" | "EXISTING_PLATFORM_USER";
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string;
    role?: string;
    employeeNumber?: string;
    department?: string;
    position?: string;
  };
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  ON_LEAVE: "bg-yellow-100 text-yellow-800",
  SUSPENDED: "bg-red-100 text-red-800",
  TERMINATED: "bg-gray-100 text-gray-800",
  RESIGNED: "bg-orange-100 text-orange-800",
};

const contractKeys: Record<string, string> = {
  FULL_TIME: "contractFullTime",
  PART_TIME: "contractPartTime",
  CONTRACT: "contractContract",
  CONTRACTOR: "contractContract",
  TEMPORARY: "contractTemporary",
  INTERNSHIP: "contractInternship",
  INTERN: "contractInternship",
  FREELANCE: "contractFreelance",
};

const statusKeys: Record<string, string> = {
  ACTIVE: "statusActive",
  ON_LEAVE: "statusOnLeave",
  SUSPENDED: "statusSuspended",
  TERMINATED: "statusTerminated",
  RESIGNED: "statusResigned",
};

const Employees: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [contractFilter, setContractFilter] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState(""); // ✅ Add User Status filter

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [assetsDialog, setAssetsDialog] = useState<{
    open: boolean;
    employeeName: string;
    assets: any[];
    loading: boolean;
    error: string;
  }>({ open: false, employeeName: "", assets: [], loading: false, error: "" });

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    mobile: "",
    password: "", // User field
    role: "AGENT", // User field
    departmentId: "",
    positionId: "",
    hireDate: new Date().toISOString().split("T")[0],
    contractType: "FULL_TIME",
    baseSalary: "",
    nationalId: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    city: "",
    country: "Egypt",
    // Deduction settings
    enableAutoDeduction: true,
    monthlyGraceMinutes: 60,
    maxDailyLateMinutes: 10,
    lateDeductionRate: "",
  });

  // Lookup state for checking existing MaxP account
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<LookupResponse | null>(null);
  const debouncedLookupEmail = useDebounce(formData.email, 400);

  // Real-time lookup effect when entering email
  useEffect(() => {
    if (!showAddDialog) {
      setLookupResult(null);
      setLookupLoading(false);
      return;
    }

    const email = debouncedLookupEmail?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLookupResult(null);
      setLookupLoading(false);
      return;
    }

    let isMounted = true;
    const performLookup = async () => {
      try {
        setLookupLoading(true);
        const res = await api.get("/hr/employees/lookup-user", {
          params: { query: email },
        });
        if (isMounted && res.data?.success) {
          setLookupResult(res.data);
          if (res.data.exists && res.data.user) {
            setFormData((prev) => ({
              ...prev,
              firstName: prev.firstName || res.data.user.firstName || "",
              lastName: prev.lastName || res.data.user.lastName || "",
              phone: prev.phone || res.data.user.phone || "",
              role: res.data.user.role || prev.role || "AGENT",
              password: "",
            }));
          }
        }
      } catch (err) {
        console.error("Lookup user error:", err);
      } finally {
        if (isMounted) setLookupLoading(false);
      }
    };

    performLookup();

    return () => {
      isMounted = false;
    };
  }, [debouncedLookupEmail, showAddDialog]);

  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, [
    pagination.page,
    search,
    statusFilter,
    departmentFilter,
    contractFilter,
    userStatusFilter,
  ]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all")
        params.append("status", statusFilter);
      if (departmentFilter && departmentFilter !== "all")
        params.append("departmentId", departmentFilter);
      if (contractFilter && contractFilter !== "all")
        params.append("contractType", contractFilter);
      if (userStatusFilter && userStatusFilter !== "all")
        params.append("userStatus", userStatusFilter); // ✅ Add User Status filter

      const response = await api.get(`/hr/employees?${params}`);
      setEmployees(response.data.employees);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages,
      }));
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error(t("employees.errorFetchEmployees"));
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get("/hr/departments");
      setDepartments(response.data.departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const openAssetsDialog = async (emp: Employee) => {
    setAssetsDialog({
      open: true,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      assets: [],
      loading: true,
      error: "",
    });
    try {
      const res = await api.get("/hr/assets", {
        params: { assignedTo: emp.userId || emp.id },
      });
      if (res.data.success) {
        setAssetsDialog((prev) => ({
          ...prev,
          assets: res.data.data || [],
          loading: false,
        }));
      } else {
        setAssetsDialog((prev) => ({
          ...prev,
          error: res.data.message || "فشل في تحميل العهدة",
          loading: false,
        }));
      }
    } catch (err: any) {
      setAssetsDialog((prev) => ({
        ...prev,
        error: err.response?.data?.message || "فشل في تحميل العهدة",
        loading: false,
      }));
    }
  };

  const handleAddEmployee = async () => {
    if (lookupResult?.status === "ALREADY_ACTIVE_EMPLOYEE") {
      toast.error(t("employees.errorEmployeeAlreadyActive"));
      return;
    }

    // Frontend Validation
    const result = validateEmployeeData(formData);
    if (!result.isValid) {
      setErrors(result.errors);
      toast.error(t("employees.errorFormValidation"));
      return;
    }

    // Check if email is already being used in the current list
    const emailExists = employees.some(
      (emp) =>
        emp.email && emp.email.toLowerCase() === formData.email.toLowerCase(),
    );

    if (emailExists) {
      toast.error(t("employees.errorEmailExists"));
      return;
    }

    try {
      setSubmitting(true);
      setErrors([]);
      await api.post("/hr/employees", formData);
      toast.success(t("employees.successAdd"));
      setShowAddDialog(false);
      resetForm();
      fetchEmployees();
    } catch (error: any) {
      console.error("❌ Frontend error creating employee:", error);
      console.error("❌ Error response:", error.response);
      console.error(
        "❌ Error response data:",
        JSON.stringify(error.response?.data, null, 2),
      );

      let errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        t("employees.errorAdd");

      // Handle specific error codes
      if (error.response?.status === 409) {
        errorMsg = error.response?.data?.error || t("employees.errorEmployeeExists");
      } else if (error.response?.status === 400) {
        errorMsg = error.response?.data?.error || t("employees.errorInvalidData");

        // Show validation errors if available
        if (
          error.response?.data?.errors &&
          Array.isArray(error.response.data.errors)
        ) {
          const errorMessages = error.response.data.errors
            .map((e: any) => e.message)
            .join(", ");
          errorMsg = errorMessages || errorMsg;
        }
      }

      toast.error(errorMsg);

      // Handle backend validation errors
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (employeeToDelete: Employee) => {
    const confirmed = window.confirm(
      `سيتم حذف الموظف "${employeeToDelete.firstName} ${employeeToDelete.lastName}" من الشركة.\nاضغط موافق للمتابعة.`,
    );
    if (!confirmed) return;

    const previousEmployees = employees;
    const previousPagination = pagination;

    try {
      setDeleting(true);

      setEmployees((prev) =>
        prev.filter((emp) => emp.id !== employeeToDelete.id),
      );
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));

      await api.delete(`/hr/employees/${employeeToDelete.id}`, {
        data: {
          // الخلفية ما زالت تتطلب رمز التأكيد، نرسله تلقائياً.
          confirmationText: "DELETE",
        },
        headers: {
          // نرسل التأكيد أيضاً في الهيدر تحسباً لأي قيود بارسر على DELETE body
          "x-confirm-delete-employee": "DELETE",
        },
      });
      toast.success(t("employees.successDelete"));
      fetchEmployees();
    } catch (error: any) {
      setEmployees(previousEmployees);
      setPagination(previousPagination);
      toast.error(error.response?.data?.error || t("employees.errorDelete"));
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      mobile: "",
      password: "", // User field
      role: "AGENT", // User field
      departmentId: "",
      positionId: "",
      hireDate: new Date().toISOString().split("T")[0],
      contractType: "FULL_TIME",
      baseSalary: "",
      nationalId: "",
      dateOfBirth: "",
      gender: "",
      address: "",
      city: "",
      country: "Egypt",
      enableAutoDeduction: true,
      monthlyGraceMinutes: 60,
      maxDailyLateMinutes: 10,
      lateDeductionRate: "",
    });
    setErrors([]);
    setLookupResult(null);
    setLookupLoading(false);
  };

  return (
    <div
      className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("employees.pageTitle")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("employees.pageSubtitle")}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800"
          >
            <Plus className="h-4 w-4 ml-2" />
            {t("employees.addEmployee")}
          </Button>
          <Button
            variant="outline"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Upload className="h-4 w-4 ml-2" />
            {t("employees.import")}
          </Button>
          <Button
            variant="outline"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Download className="h-4 w-4 ml-2" />
            {t("employees.export")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
              <Input
                placeholder={t("employees.searchPlaceholder")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pr-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                <SelectValue placeholder={t("employees.statusFilter")} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <SelectItem
                  value="all"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("employees.allStatuses")}
                </SelectItem>
                <SelectItem
                  value="ACTIVE"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("employees.active")}
                </SelectItem>
                <SelectItem
                  value="INACTIVE"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("employees.inactive")}
                </SelectItem>
                <SelectItem
                  value="TERMINATED"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("employees.terminated")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
            >
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                <SelectValue placeholder={t("employees.departmentFilter")} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <SelectItem
                  value="all"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("employees.allDepartments")}
                </SelectItem>
                {departments.map((dept) => (
                  <SelectItem
                    key={dept.id}
                    value={dept.id}
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={contractFilter} onValueChange={setContractFilter}>
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                <SelectValue placeholder={t("employees.contractFilter")} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <SelectItem
                  value="all"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("employees.allContracts")}
                </SelectItem>
                <SelectItem
                  value="FULL_TIME"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("employees.fullTime")}
                </SelectItem>
                <SelectItem
                  value="PART_TIME"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("employees.partTime")}
                </SelectItem>
                <SelectItem
                  value="CONTRACTOR"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("employees.contractor")}
                </SelectItem>
                <SelectItem
                  value="INTERN"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("employees.intern")}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* ✅ User Status Filter */}
            <Select
              value={userStatusFilter}
              onValueChange={setUserStatusFilter}
            >
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                <SelectValue placeholder={t("employees.accountStatusFilter")} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <SelectItem
                  value="all"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("employees.allAccounts")}
                </SelectItem>
                <SelectItem
                  value="HAS_USER"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("employees.hasAccount")}
                </SelectItem>
                <SelectItem
                  value="NO_USER"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("employees.noAccount")}
                </SelectItem>
                <SelectItem
                  value="ACTIVE_USER"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("employees.activeAccount")}
                </SelectItem>
                <SelectItem
                  value="INACTIVE_USER"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("employees.inactiveAccount")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-0">
          {loading ? (
            <EmployeeTableSkeleton />
          ) : employees.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t("employees.noEmployees")}
              description={t("employees.noEmployeesDesc")}
              actionLabel={t("employees.addFirstEmployee")}
              onAction={() => setShowAddDialog(true)}
              secondaryActionLabel={t("employees.importFromExcel")}
              secondaryIcon={Upload}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{t("employees.tableEmployee")}</TableHead>
                  <TableHead className="text-right">{t("employees.tableDepartment")}</TableHead>
                  <TableHead className="text-right">{t("employees.tablePosition")}</TableHead>
                  <TableHead className="text-right">{t("employees.tableUserAccount")}</TableHead>
                  <TableHead className="text-right">{t("employees.tableRole")}</TableHead>
                  <TableHead className="text-right">{t("employees.tableContractType")}</TableHead>
                  <TableHead className="text-right">{t("employees.tableHireDate")}</TableHead>
                  <TableHead className="text-right">{t("employees.tableStatus")}</TableHead>
                  <TableHead className="text-right">{t("employees.tableActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow
                    key={employee.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          {employee.avatar ? (
                            <AvatarImage
                              src={
                                employee.avatar.startsWith("http")
                                  ? employee.avatar
                                  : `https://mokhtarelhenawy.online${employee.avatar}`
                              }
                              onError={(e) => {
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${employee.firstName}+${employee.lastName}&background=random`;
                              }}
                            />
                          ) : (
                            <AvatarFallback>
                              {employee.firstName?.[0]}
                              {employee.lastName?.[0]}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {employee.firstName || t("employees.notSpecified")}{" "}
                            {employee.lastName || ""}
                          </p>
                          <p className="text-sm text-gray-500">
                            {employee.employeeNumber || t("employees.notSpecified")}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {employee.department ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                employee.department.color || "#6B7280",
                            }}
                          />
                          {employee.department.name || t("employees.notSpecified")}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {employee.position?.title || (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    {/* ✅ User Account Status */}
                    <TableCell>
                      {employee.user ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                employee.user.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {employee.user.isActive ? t("employees.accountActive") : t("employees.accountInactive")}
                            </Badge>
                            {employee.user.isEmailVerified && (
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                {t("employees.verified")}
                              </Badge>
                            )}
                          </div>
                          {employee.user.lastLoginAt && (
                            <span className="text-xs text-gray-500">
                              {t("employees.lastLogin")}{" "}
                              {new Date(
                                employee.user.lastLoginAt,
                              ).toLocaleDateString("ar-EG")}
                            </span>
                          )}
                          {!employee.user.lastLoginAt && (
                            <span className="text-xs text-gray-400">
                              {t("employees.neverLoggedIn")}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600">
                          {t("employees.noUserAccount")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {employee.user ? (
                        <Badge className="bg-purple-100 text-purple-800">
                          {employee.user.role === "COMPANY_ADMIN"
                            ? t("employees.roleCompanyAdmin")
                            : employee.user.role === "MANAGER"
                              ? t("employees.roleManager")
                              : employee.user.role === "AGENT"
                                ? t("employees.roleAgent")
                                : employee.user.role === "AFFILIATE"
                                  ? t("employees.roleAffiliate")
                                  : employee.user.role || t("employees.notSpecified")}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {t(`employees.${contractKeys[employee.contractType]}`) ||
                        employee.contractType ||
                        t("employees.notSpecified")}
                    </TableCell>
                    <TableCell>
                      {employee.hireDate
                        ? new Date(employee.hireDate).toLocaleDateString(
                          "ar-EG",
                        )
                        : t("employees.notSpecified")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={statusColors[employee.status] || ""}
                      >
                        {statusKeys[employee.status]
                          ? t(`employees.${statusKeys[employee.status]}`)
                          : employee.status || t("employees.notSpecified")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/hr/employees/${employee.id}`)
                            }
                          >
                            <Eye className="h-4 w-4 ml-2" />
                            عرض
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openAssetsDialog(employee)}
                          >
                            <Shield className="h-4 w-4 ml-2" />
                            عهدته
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/hr/employees/${employee.id}/edit`)
                            }
                          >
                            <Edit className="h-4 w-4 ml-2" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              handleDeleteEmployee(employee);
                            }}
                          >
                            <Trash2 className="h-4 w-4 ml-2" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <EnhancedPagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.limit}
            totalItems={pagination.total}
            onPageChange={(page) =>
              setPagination((prev) => ({ ...prev, page }))
            }
            onPageSizeChange={(limit) =>
              setPagination((prev) => ({ ...prev, limit, page: 1 }))
            }
          />
        )}
      </Card>

      {/* Assets Dialog */}
      <Dialog
        open={assetsDialog.open}
        onOpenChange={(open) =>
          setAssetsDialog((prev) => ({ ...prev, open, error: "", assets: [] }))
        }
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>عهدة {assetsDialog.employeeName}</DialogTitle>
          </DialogHeader>

          {assetsDialog.loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : assetsDialog.error ? (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg">
              {assetsDialog.error}
            </div>
          ) : assetsDialog.assets.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              لا توجد أصول مسلّمة لهذا الموظف حالياً
            </div>
          ) : (
            <div className="space-y-3">
              {assetsDialog.assets.map((asset: any) => (
                <div
                  key={asset.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800/60"
                >
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      {asset.name} {asset.code ? `(${asset.code})` : ""}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      الحالة: {asset.status}
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">
                    {asset.status === "IN_USE"
                      ? "مسلّمة"
                      : asset.status || "متاحة"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("employees.addEmployeeTitle")}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Email Field First - Primary Lookup Key */}
            <div className="space-y-2 col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="employee-email">{t("employees.email")}</Label>
                {lookupLoading && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    {t("employees.lookupChecking")}
                  </span>
                )}
              </div>
              <Input
                id="employee-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="example@company.com"
                className={hasError(errors, "email") ? "border-red-500" : ""}
              />
              {hasError(errors, "email") && (
                <p className="text-sm text-red-500">
                  {getErrorMessage(errors, "email")}
                </p>
              )}
            </div>

            {/* Smart Detection Card */}
            {lookupResult?.exists && lookupResult.user && (
              <div className="col-span-2 p-3.5 rounded-xl border transition-all duration-200 bg-muted/20 border-border/70">
                {lookupResult.status === "ALREADY_ACTIVE_EMPLOYEE" && (
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-amber-200 dark:border-amber-800">
                          <AvatarImage src={lookupResult.user.avatar} />
                          <AvatarFallback className="bg-amber-100 text-amber-800 text-xs font-semibold">
                            {lookupResult.user.firstName?.[0] || "EMP"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm text-foreground flex items-center gap-2">
                            <span>{lookupResult.user.firstName} {lookupResult.user.lastName}</span>
                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 text-[11px] py-0 px-1.5">
                              {t("employees.accountAlreadyEmployee")}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t("employees.accountAlreadyEmployeeDesc", {
                              employeeNumber: lookupResult.user.employeeNumber,
                            })}
                            {lookupResult.user.department ? ` • ${lookupResult.user.department}` : ""}
                            {lookupResult.user.position ? ` • ${lookupResult.user.position}` : ""}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 shrink-0 gap-1.5"
                        onClick={() => {
                          setShowAddDialog(false);
                          if (lookupResult.user?.id) {
                            navigate(`/hr/employees/${lookupResult.user.id}`);
                          }
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t("employees.viewEmployeeProfile")}
                      </Button>
                    </div>
                  </div>
                )}

                {lookupResult.status === "COMPANY_USER_NOT_EMPLOYEE" && (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-blue-200 dark:border-blue-800">
                      <AvatarImage src={lookupResult.user.avatar} />
                      <AvatarFallback className="bg-blue-100 text-blue-800 text-xs font-semibold">
                        {lookupResult.user.firstName?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground flex items-center gap-2">
                        <span className="truncate">{lookupResult.user.firstName} {lookupResult.user.lastName}</span>
                        <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800 text-[11px] py-0 px-1.5 shrink-0">
                          {t("employees.accountCompanyMember")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {lookupResult.user.email} {lookupResult.user.phone ? `• ${lookupResult.user.phone}` : ""}
                      </p>
                    </div>
                  </div>
                )}

                {lookupResult.status === "EXISTING_PLATFORM_USER" && (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-emerald-200 dark:border-emerald-800">
                      <AvatarImage src={lookupResult.user.avatar} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-800 text-xs font-semibold">
                        {lookupResult.user.firstName?.[0] || "M"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground flex items-center gap-2">
                        <span className="truncate">{lookupResult.user.firstName} {lookupResult.user.lastName}</span>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-[11px] py-0 px-1.5 shrink-0">
                          {t("employees.accountVerifiedPlatform")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {lookupResult.user.email} {lookupResult.user.phone ? `• ${lookupResult.user.phone}` : ""}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("employees.firstName")}</Label>
              <Input
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                placeholder={t("employees.firstNamePlaceholder")}
                className={
                  hasError(errors, "firstName") ? "border-red-500" : ""
                }
              />
              {hasError(errors, "firstName") && (
                <p className="text-sm text-red-500">
                  {getErrorMessage(errors, "firstName")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("employees.lastName")}</Label>
              <Input
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                placeholder={t("employees.lastNamePlaceholder")}
                className={hasError(errors, "lastName") ? "border-red-500" : ""}
              />
              {hasError(errors, "lastName") && (
                <p className="text-sm text-red-500">
                  {getErrorMessage(errors, "lastName")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("employees.phone")}</Label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="01xxxxxxxxx"
                className={hasError(errors, "phone") ? "border-red-500" : ""}
              />
              {hasError(errors, "phone") && (
                <p className="text-sm text-red-500">
                  {getErrorMessage(errors, "phone")}
                </p>
              )}
            </div>

            {/* Password Field: Hidden if user exists, Shown if new user */}
            {!lookupResult?.exists ? (
              <div className="space-y-2">
                <Label>{t("employees.password")}</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder={t("employees.passwordPlaceholder")}
                  className={hasError(errors, "password") ? "border-red-500" : ""}
                />
                {hasError(errors, "password") && (
                  <p className="text-sm text-red-500">
                    {getErrorMessage(errors, "password")}
                  </p>
                )}
              </div>
            ) : (
              <div className="col-span-2 p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center gap-2.5 text-xs text-muted-foreground">
                <KeyRound className="h-4 w-4 text-primary shrink-0" />
                <span>{t("employees.existingUserPasswordHint")}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("employees.role")}</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("employees.selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGENT">{t("employees.roleAgentOption")}</SelectItem>
                  <SelectItem value="MANAGER">{t("employees.roleManagerOption")}</SelectItem>
                  <SelectItem value="COMPANY_ADMIN">{t("employees.roleAdminOption")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("employees.department")}</Label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) =>
                  setFormData({ ...formData, departmentId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("employees.selectDepartment")} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("employees.contractType")}</Label>
              <Select
                value={formData.contractType}
                onValueChange={(value) =>
                  setFormData({ ...formData, contractType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">{t("employees.contractFullTime")}</SelectItem>
                  <SelectItem value="PART_TIME">{t("employees.contractPartTime")}</SelectItem>
                  <SelectItem value="CONTRACTOR">{t("employees.contractContract")}</SelectItem>
                  <SelectItem value="TEMPORARY">{t("employees.contractTemporary")}</SelectItem>
                  <SelectItem value="INTERN">{t("employees.contractInternship")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("employees.hireDate")}</Label>
              <Input
                type="date"
                value={formData.hireDate}
                onChange={(e) =>
                  setFormData({ ...formData, hireDate: e.target.value })
                }
                className={hasError(errors, "hireDate") ? "border-red-500" : ""}
              />
              {hasError(errors, "hireDate") && (
                <p className="text-sm text-red-500">
                  {getErrorMessage(errors, "hireDate")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("employees.baseSalary")}</Label>
              <Input
                type="number"
                value={formData.baseSalary}
                onChange={(e) =>
                  setFormData({ ...formData, baseSalary: e.target.value })
                }
                placeholder="0.00"
                className={
                  hasError(errors, "baseSalary") ? "border-red-500" : ""
                }
              />
              {hasError(errors, "baseSalary") && (
                <p className="text-sm text-red-500">
                  {getErrorMessage(errors, "baseSalary")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("employees.nationalId")}</Label>
              <Input
                value={formData.nationalId}
                onChange={(e) =>
                  setFormData({ ...formData, nationalId: e.target.value })
                }
                placeholder={t("employees.nationalIdPlaceholder")}
                className={
                  hasError(errors, "nationalId") ? "border-red-500" : ""
                }
              />
              {hasError(errors, "nationalId") && (
                <p className="text-sm text-red-500">
                  {getErrorMessage(errors, "nationalId")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("employees.dateOfBirth")}</Label>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) =>
                  setFormData({ ...formData, dateOfBirth: e.target.value })
                }
                className={
                  hasError(errors, "dateOfBirth") ? "border-red-500" : ""
                }
              />
              {hasError(errors, "dateOfBirth") && (
                <p className="text-sm text-red-500">
                  {getErrorMessage(errors, "dateOfBirth")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("employees.gender")}</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) =>
                  setFormData({ ...formData, gender: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("employees.selectGender")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">{t("employees.male")}</SelectItem>
                  <SelectItem value="FEMALE">{t("employees.female")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("employees.city")}</Label>
              <Input
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder={t("employees.cityPlaceholder")}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>{t("employees.address")}</Label>
              <Textarea
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder={t("employees.addressPlaceholder")}
                rows={2}
              />
            </div>

            {/* Deduction Settings */}
            <div className="col-span-2 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-orange-500" />
                <h3 className="font-bold">{t("employees.deductionSettings")}</h3>
              </div>
              <Separator className="mb-4" />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-orange-50/50 dark:bg-orange-950/10">
                  <div className="space-y-0.5">
                    <Label className="text-sm">{t("employees.enableAutoDeduction")}</Label>
                    <p className="text-xs text-gray-500">
                      {t("employees.enableAutoDeductionDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={formData.enableAutoDeduction}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, enableAutoDeduction: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">{t("employees.deductionRatePerMinute")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.lateDeductionRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lateDeductionRate: e.target.value,
                      })
                    }
                    placeholder={t("employees.deductionRatePlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">{t("employees.monthlyGraceMinutes")}</Label>
                  <Input
                    type="number"
                    value={formData.monthlyGraceMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monthlyGraceMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">{t("employees.maxDailyLateMinutes")}</Label>
                  <Input
                    type="number"
                    value={formData.maxDailyLateMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxDailyLateMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={submitting}
            >
              {t("employees.cancel")}
            </Button>
            <Button
              onClick={handleAddEmployee}
              disabled={submitting || lookupResult?.status === "ALREADY_ACTIVE_EMPLOYEE"}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("employees.saving")}
                </>
              ) : lookupResult?.status === "COMPANY_USER_NOT_EMPLOYEE" ? (
                t("employees.upgradeToEmployee")
              ) : lookupResult?.status === "EXISTING_PLATFORM_USER" ? (
                t("employees.linkAndAddEmployee")
              ) : (
                t("employees.addEmployeeButton")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
