import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../../../services/api";
import { toast } from "sonner";
import { useDebounce } from "../../../hooks/useDebounce";
import {
  validateEmployeeData,
  ValidationError,
} from "../../../utils/hrValidation";
import {
  Employee,
  Department,
  LookupResponse,
  EmployeeFormData,
  AssetsDialogState,
  PaginationState,
  CredentialsModalState,
} from "./types";
import { createDefaultEmployeeForm } from "./helpers";

export const useEmployeesController = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
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
  const [userStatusFilter, setUserStatusFilter] = useState("");

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [assetsDialog, setAssetsDialog] = useState<AssetsDialogState>({
    open: false,
    employeeName: "",
    assets: [],
    loading: false,
    error: "",
  });

  const [credentialsModal, setCredentialsModal] = useState<CredentialsModalState>({
    open: false,
    employeeName: "",
    email: "",
    temporaryPassword: null,
    resetLink: null,
  });

  // Form state
  const [formData, setFormData] = useState<EmployeeFormData>(createDefaultEmployeeForm());

  // Lookup state
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
          if (res.data.status === "INACTIVE_FORMER_EMPLOYEE" && res.data.user) {
            const u = res.data.user;
            setFormData((prev) => ({
              ...prev,
              firstName: prev.firstName || u.firstName || "",
              lastName: prev.lastName || u.lastName || "",
              phone: prev.phone || u.phone || "",
              role: u.role || prev.role || "AGENT",
              departmentId: u.departmentId || prev.departmentId,
              positionId: u.positionId || prev.positionId,
              hireDate: u.hireDate || prev.hireDate,
              contractType: u.contractType || prev.contractType,
              baseSalary: u.baseSalary || prev.baseSalary,
              enableAutoDeduction: u.enableAutoDeduction ?? prev.enableAutoDeduction,
              monthlyGraceMinutes: u.monthlyGraceMinutes ?? prev.monthlyGraceMinutes,
              maxDailyLateMinutes: u.maxDailyLateMinutes ?? prev.maxDailyLateMinutes,
              lateDeductionRate: u.lateDeductionRate ?? prev.lateDeductionRate,
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
      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (departmentFilter && departmentFilter !== "all") {
        params.append("departmentId", departmentFilter);
      }
      if (contractFilter && contractFilter !== "all") {
        params.append("contractType", contractFilter);
      }
      if (userStatusFilter && userStatusFilter !== "all") {
        params.append("userStatus", userStatusFilter);
      }

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

    const isExistingUser = Boolean(lookupResult?.exists);

    const result = validateEmployeeData(formData, { isExistingUser });
    if (!result.isValid) {
      setErrors(result.errors);
      toast.error(t("employees.errorFormValidation"));
      return;
    }

    if (!isExistingUser) {
      const emailExists = employees.some(
        (emp) =>
          emp.email &&
          emp.email.toLowerCase() === formData.email.toLowerCase() &&
          emp.status === "ACTIVE",
      );

      if (emailExists) {
        toast.error(t("employees.errorEmailExists"));
        return;
      }
    }

    try {
      setSubmitting(true);
      setErrors([]);

      // For inactive former employees, use the reactivation endpoint
      let response;
      if (lookupResult?.status === "INACTIVE_FORMER_EMPLOYEE" && lookupResult?.user?.id) {
        response = await api.post(`/hr/employees/${lookupResult.user.id}/reactivate`, formData);
        toast.success(t("employees.successReactivate"));
      } else {
        response = await api.post("/hr/employees", formData);
        toast.success(t("employees.successAdd"));
      }

      // If backend generated temporary credentials or setup link, show credentials modal
      const creds = response.data?.employee?.credentials || response.data?.credentials;
      if (creds?.temporaryPassword || creds?.setupToken) {
        setCredentialsModal({
          open: true,
          employeeName: `${formData.firstName} ${formData.lastName}`.trim(),
          email: creds.email || formData.email,
          temporaryPassword: creds.temporaryPassword || null,
          resetLink: creds.setupToken
            ? `https://maxp.online/reset-password?token=${creds.setupToken}&email=${encodeURIComponent(creds.email || formData.email)}`
            : null,
        });
      }

      setShowAddDialog(false);
      resetForm();
      fetchEmployees();
    } catch (error: any) {
      console.error("Frontend error creating employee:", error);
      let errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        t("employees.errorAdd");

      if (error.response?.status === 409) {
        errorMsg = error.response?.data?.error || t("employees.errorEmployeeExists");
      } else if (error.response?.status === 400) {
        errorMsg = error.response?.data?.error || t("employees.errorInvalidData");
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

      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivateEmployee = async (userId: string) => {
    // Reactivation via the add dialog: pre-fill data and let user submit with updated info
    // The actual API call happens in handleAddEmployee when INACTIVE_FORMER_EMPLOYEE is detected
    toast.info(t("employees.reactivateHint"));
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
        data: { confirmationText: "DELETE" },
        headers: { "x-confirm-delete-employee": "DELETE" },
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

  const handleResetPassword = async (emp: Employee) => {
    try {
      const res: any = await api.post(`/hr/employees/${emp.id}/reset-password`);
      if (res.data?.success && res.data?.data) {
        setCredentialsModal({
          open: true,
          employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
          email: res.data.data.email,
          temporaryPassword: res.data.data.temporaryPassword || null,
          resetLink: res.data.data.resetLink || null,
        });
        toast.success("تم استخراج بيانات الدخول بنجاح");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "فشل في استخراج بيانات الدخول");
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    try {
      const currentActive = emp.user?.isActive ?? (emp.status === "ACTIVE");
      const res: any = await api.post(`/hr/employees/${emp.id}/toggle-user-status`, {
        isActive: !currentActive,
      });
      toast.success(res.data?.message || "تم تغيير حالة الحساب بنجاح");
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "فشل في تعديل حالة الحساب");
    }
  };

  const handleTerminateEmployee = async (emp: Employee) => {
    const reason = window.prompt(
      `أدخل سبب إنهاء خدمة الموظف "${emp.firstName} ${emp.lastName}":`,
      "إنهاء خدمة",
    );
    if (reason === null) return;
    try {
      await api.post(`/hr/employees/${emp.id}/terminate`, {
        terminationDate: new Date().toISOString(),
        terminationReason: reason || "إنهاء خدمة",
      });
      toast.success("تم إنهاء خدمة الموظف بنجاح");
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "فشل في إنهاء الخدمة");
    }
  };

  const resetForm = () => {
    setFormData(createDefaultEmployeeForm());
    setErrors([]);
    setLookupResult(null);
    setLookupLoading(false);
  };

  return {
    loading,
    employees,
    departments,
    pagination,
    setPagination,
    searchInput,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    departmentFilter,
    setDepartmentFilter,
    contractFilter,
    setContractFilter,
    userStatusFilter,
    setUserStatusFilter,
    showAddDialog,
    setShowAddDialog,
    showInviteDialog,
    setShowInviteDialog,
    submitting,
    deleting,
    errors,
    assetsDialog,
    setAssetsDialog,
    credentialsModal,
    setCredentialsModal,
    formData,
    setFormData,
    lookupLoading,
    lookupResult,
    fetchEmployees,
    openAssetsDialog,
    handleAddEmployee,
    handleDeleteEmployee,
    handleReactivateEmployee,
    handleResetPassword,
    handleToggleStatus,
    handleTerminateEmployee,
    resetForm,
  };
};
