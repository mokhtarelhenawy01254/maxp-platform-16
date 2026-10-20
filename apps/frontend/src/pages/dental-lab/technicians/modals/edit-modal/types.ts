import type { Dispatch, SetStateAction } from "react";
import type { DentalTechnician } from "../../../shared";
import type { TechnicianForm } from "../types/technicianTypes";

export interface TechnicianEditModalProps {
  modal: TechnicianForm;
  setModal: Dispatch<SetStateAction<TechnicianForm | null>>;
  rows: DentalTechnician[];
  saving: boolean;
  error: string | null;
  onSave: () => Promise<void>;
  onClose: () => void;
}
