import React from "react";
import type {
  DentalLabCase,
  DentalLabDoctor,
  DentalTechnician,
  DentalWorkType,
} from "../../shared";

export const FALLBACK_BADGE = {
  label: "",
  color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

export const statusBadge = (
  map: Record<string, { label: string; color: string }>,
  value: string,
  fallback = value
) => {
  const meta = map[value] ?? { ...FALLBACK_BADGE, label: fallback };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap font-medium ${meta.color}`}
    >
      {meta.label}
    </span>
  );
};

export interface DentalCaseCreateModalProps {
  initial?: DentalLabCase | null;
  doctors: DentalLabDoctor[];
  workTypes: DentalWorkType[];
  technicians: DentalTechnician[];
  onClose: () => void;
  onSaved: () => void;
}

export interface DentalCaseAdvanceModalProps {
  caseData: DentalLabCase;
  technicians: DentalTechnician[];
  onClose: () => void;
  onSaved: () => void;
}

export interface DentalCaseAssignModalProps {
  caseData: DentalLabCase;
  technicians: DentalTechnician[];
  onClose: () => void;
  onSaved: () => void;
}

export interface DentalCaseInvoiceModalProps {
  caseData: DentalLabCase;
  onClose: () => void;
  onSaved: () => void;
}

export interface DentalCaseKioskScannerModalProps {
  technicians: DentalTechnician[];
  onClose: () => void;
  onScanned: () => void;
}
