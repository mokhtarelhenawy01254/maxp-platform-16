import { BOOKING_STATUS_MAP, REPORT_STATUS_MAP } from "./shared";

export const NEXT_BOOKING_STATUS: Record<string, string> = {
  UNCONFIRMED: "CONFIRMED",
  CONFIRMED: "CHECKED_IN",
  CHECKED_IN: "PROCEDURE_STARTED",
  PROCEDURE_STARTED: "PROCEDURE_COMPLETED",
  PROCEDURE_COMPLETED: "CHECKED_OUT",
};

export const NEXT_REPORT_STATUS: Record<string, string> = {
  PENDING: "NOTES_IN_PROGRESS",
  NOTES_IN_PROGRESS: "NOTES_COMPLETED",
  NOTES_COMPLETED: "UNDER_REVIEW",
  UNDER_REVIEW: "APPROVED",
};

export const LEGACY_TO_BOOKING: Record<string, string> = {
  pending: "UNCONFIRMED",
  confirmed: "CONFIRMED",
  completed: "CHECKED_OUT",
  cancelled: "CANCELLED",
  no_show: "MISSED",
};

interface Props {
  status?: string | null;
  type: "booking" | "report";
}

export default function WorkflowStatusBadge({ status, type }: Props) {
  const map = type === "booking" ? BOOKING_STATUS_MAP : REPORT_STATUS_MAP;
  const entry = status ? map[status] : undefined;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${entry?.color || "bg-muted text-muted-foreground"}`}>
      {entry?.label || status || "—"}
    </span>
  );
}
