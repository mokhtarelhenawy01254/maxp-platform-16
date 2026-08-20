import { BOOKING_STATUS_MAP, REPORT_STATUS_MAP } from "./shared";

interface Props {
  status?: string | null;
  type: "booking" | "report";
}

export default function WorkflowStatusBadge({ status, type }: Props) {
  const map = type === "booking" ? BOOKING_STATUS_MAP : REPORT_STATUS_MAP;
  const entry = status ? map[status] : undefined;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${entry?.color || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>
      {entry?.label || status || "—"}
    </span>
  );
}
