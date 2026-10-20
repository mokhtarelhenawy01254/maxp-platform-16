import { MyCase } from "../../../shared";

export type BenchFilterPriority = "ALL" | "OVERDUE" | "URGENT" | "SCAN";
export type BenchViewMode = "CARDS" | "TABLE";

export interface TimerState {
  running: boolean;
  elapsedSeconds: number;
}

export interface Active3DAttachment {
  url: string;
  ext: string;
  fileName: string;
}

export interface DentalTechBenchTabProps {
  cases: MyCase[];
  onReload: () => Promise<void>;
  initialFilter?: BenchFilterPriority;
}
