export interface SalaryComponent {
  name: string;
  amount: number;
  type?: string;
  note?: string;
}

export interface PayrollData {
  id: string;
  month: number;
  year: number;
  baseSalary: number;
  netSalary: number;
  grossSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  attendanceDeduction: number;
  latePenalty: number;
  overtimeHours: number;
  overtimeAmount: number;
  bonuses: number;
  socialInsurance: number;
  taxAmount: number;
  periodStart: string;
  periodEnd: string;
  status: string;
  allowances: string | null;
  deductions: string | null;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    avatar: string;
    baseSalary?: number;
    position?: {
      title: string;
    };
    bankName?: string;
    bankAccountNumber?: string;
    bankIban?: string;
  };
  company?: {
    name: string;
    logo: string;
    taxNumber: string;
  };
}

export interface MonthOption {
  value: string;
  label: string;
}

export type PayrollStatusConfig = Record<
  string,
  { label: string; color: string }
>;
