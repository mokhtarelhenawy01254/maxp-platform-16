import type { ClinicDoctorItem } from "../../shared";

export type DoctorsViewMode = "ACTIVE" | "ARCHIVED";

export interface DoctorForm {
  id?: string;
  name: string;
  phone: string;
  clinicName: string;
  governorate: string;
  portalPin: string;
  creditLimit: number;
  notes: string;
  doctors?: ClinicDoctorItem[];
  isActive: boolean;
}

export interface DoctorSummary {
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
}
