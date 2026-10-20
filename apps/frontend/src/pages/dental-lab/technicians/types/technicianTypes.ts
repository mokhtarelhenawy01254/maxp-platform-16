import type {
  DentalTechnician,
  DentalTechnicianRole,
  DentalTechnicianVacation,
} from "../../shared";

export interface TechnicianForm {
  id?: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  role: DentalTechnicianRole;
  userId: string;
  wagePerStage: string;
  workingDays: number[];
  dailyCap: string;
  backupTechnicianId: string;
  vacations: DentalTechnicianVacation[];
  isActive: boolean;
}

export interface PayoutModalProps {
  tech: DentalTechnician;
  onClose: () => void;
  onSaved: () => void;
}

export interface LedgerModalProps {
  tech: DentalTechnician;
  onClose: () => void;
  onAddPayout: () => void;
  onDataChanged: () => void;
}

export interface TechnicianKpiCardsProps {
  wageDefault: number;
  totalWages: number;
  totalPaid: number;
  totalBalanceDue: number;
}
