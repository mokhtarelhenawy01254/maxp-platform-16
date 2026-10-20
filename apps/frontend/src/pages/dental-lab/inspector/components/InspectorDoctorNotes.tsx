import { type DentalLabCase } from "../../shared";

interface InspectorDoctorNotesProps {
  caseData: DentalLabCase;
}

export function InspectorDoctorNotes({ caseData }: InspectorDoctorNotesProps) {
  if (!caseData.notes) return null;

  return (
    <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl space-y-1">
      <span className="font-bold text-amber-900 dark:text-amber-200 block text-[11px]">
        ملاحظات وتعليمات الطبيب:
      </span>
      <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-[11px]">
        {caseData.notes}
      </p>
    </div>
  );
}

export default InspectorDoctorNotes;
