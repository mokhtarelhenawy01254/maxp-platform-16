import type { DentalCaseAttachment } from "../../../shared";

export interface DentalCaseAttachmentCardProps {
  attachment: DentalCaseAttachment;
  onDeleted: () => void;
}
