export interface Employee {
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
  baseSalary?: string | number | null;
  nationalId?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  department: { id: string; name: string; color: string } | null;
  position: { id: string; title: string; level: number } | null;
  manager: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
  } | null;
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

export interface Department {
  id: string;
  name: string;
  color?: string;
}

export interface LookupResponse {
  exists: boolean;
  status:
    | "NOT_FOUND"
    | "ALREADY_ACTIVE_EMPLOYEE"
    | "COMPANY_USER_NOT_EMPLOYEE"
    | "EXISTING_PLATFORM_USER"
    | "INACTIVE_FORMER_EMPLOYEE";
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
    hireDate?: string;
    contractType?: string;
    baseSalary?: string;
    departmentId?: string;
    positionId?: string;
    enableAutoDeduction?: boolean;
    monthlyGraceMinutes?: number;
    maxDailyLateMinutes?: number;
    lateDeductionRate?: string;
    terminationDate?: string;
    lastLoginAt?: string;
  };
}

export interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  password: "";
  role: string;
  departmentId: string;
  positionId: string;
  hireDate: string;
  contractType: string;
  baseSalary: string;
  nationalId: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  city: string;
  country: string;
  enableAutoDeduction: boolean;
  monthlyGraceMinutes: number;
  maxDailyLateMinutes: number;
  lateDeductionRate: string;
}

export interface AssetsDialogState {
  open: boolean;
  employeeName: string;
  assets: any[];
  loading: boolean;
  error: string;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CredentialsModalState {
  open: boolean;
  employeeName: string;
  email: string;
  temporaryPassword?: string | null;
  resetLink?: string | null;
}
