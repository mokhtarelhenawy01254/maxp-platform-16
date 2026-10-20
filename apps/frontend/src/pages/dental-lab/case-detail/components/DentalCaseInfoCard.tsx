import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExternalLink, FileText, Stethoscope } from "lucide-react";
import OdontogramChart from "../../OdontogramChart";
import DentalCaseCard from "./DentalCaseCard";
import { fmtDate, fmtMoney, type DentalLabCaseDetail } from "../../shared";

interface DentalCaseInfoCardProps {
  c: DentalLabCaseDetail;
}

export default function DentalCaseInfoCard({ c }: DentalCaseInfoCardProps) {
  const { t } = useTranslation();

  const infoRows: { label: string; value: ReactNode }[] = [
    { label: t("dentalLab.cases.patient"), value: c.patientName },
    {
      label: t("dentalLab.cases.patientPhone"),
      value: c.patientPhone ? (
        <span dir="ltr" className="font-mono tabular-nums">
          {c.patientPhone}
        </span>
      ) : (
        "—"
      ),
    },
    {
      label: t("dentalLab.cases.doctor"),
      value: (
        <div className="flex items-center gap-1.5 flex-wrap">
          {c.doctorId ? (
            <>
              <Link
                to={`/dental-lab/cases?doctorId=${c.doctorId}`}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1 font-medium transition-colors"
                title={`عرض كل حالات د. ${c.doctor?.name || c.doctorName || ""}`}
              >
                <Stethoscope className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>{c.doctor?.name || c.doctorName || "—"}</span>
              </Link>
              <Link
                to={`/dental-lab/doctors/${c.doctorId}`}
                className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                title="الملف الشامل والمالي للطبيب"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </>
          ) : (
            <span>{c.doctorName || "—"}</span>
          )}
          {c.doctor && c.doctorName && c.doctor.name !== c.doctorName && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
              title="الاسم وقت إنشاء الحالة"
            >
              الاسم وقت التنفيذ: {c.doctorName}
            </span>
          )}
        </div>
      ),
    },
    {
      label: t("dentalLab.cases.workType"),
      value: (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            to={
              c.workTypeId
                ? `/dental-lab/cases?workTypeId=${c.workTypeId}`
                : `/dental-lab/cases?search=${encodeURIComponent(c.workTypeName || "")}`
            }
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline inline-flex items-center gap-1 font-medium transition-colors"
            title={`عرض كل حالات نوع الشغل: ${c.workType?.name || c.workTypeName || ""}`}
          >
            <span>{c.workType?.name || c.workTypeName || "—"}</span>
          </Link>
          {c.unitsCount && c.unitsCount > 1 ? (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono tabular-nums">
              ({c.unitsCount} وحدات)
            </span>
          ) : null}
        </div>
      ),
    },
    {
      label: t("dentalLab.cases.receivedDate"),
      value: <span className="font-mono tabular-nums">{fmtDate(c.receivedDate)}</span>,
    },
    {
      label: t("dentalLab.cases.dueDate"),
      value: <span className="font-mono tabular-nums">{fmtDate(c.dueDate)}</span>,
    },
    {
      label: t("dentalLab.cases.shade"),
      value: c.shade ? (
        <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">
          {c.shade}
        </span>
      ) : (
        "—"
      ),
    },
    {
      label: "الخامة المستخدمة",
      value: (
        <span>
          {c.material || "—"}
          {c.materialBrand ? ` (${c.materialBrand})` : ""}
        </span>
      ),
    },
    {
      label: "رقم التشغيلة (Lot #)",
      value: c.lotNumber ? (
        <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
          {c.lotNumber}
        </span>
      ) : (
        "—"
      ),
    },
    {
      label: "فترة الضمان",
      value:
        c.warrantyYears && c.warrantyYears > 0 ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono tabular-nums">
            {c.warrantyYears} سنوات ضمان
          </span>
        ) : (
          "—"
        ),
    },
    {
      label: "الإجمالي والخصم",
      value: (
        <span className="font-mono tabular-nums">
          {fmtMoney(c.priceSnapshot)}
          {c.discount && c.discount > 0 ? (
            <span className="text-red-500 text-xs mr-1"> (خصم: {fmtMoney(c.discount)})</span>
          ) : null}
        </span>
      ),
    },
    ...(c.status === "OUTSOURCED" || c.externalLabName
      ? [
          {
            label: "جهة التشغيل الخارجي",
            value: (
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {c.externalLabName}
              </span>
            ),
          },
          {
            label: "تكلفة التشغيل الخارجي",
            value: (
              <span className="font-mono tabular-nums">
                {c.outsourceCost != null ? fmtMoney(c.outsourceCost) : "—"}
              </span>
            ),
          },
          {
            label: "موعد العودة المتوقع",
            value: (
              <span className="font-mono tabular-nums">
                {c.expectedReturnAt ? fmtDate(c.expectedReturnAt) : "—"}
              </span>
            ),
          },
          ...(c.returnedAt
            ? [
                {
                  label: "تاريخ الاستلام الفعلي",
                  value: (
                    <span className="font-mono tabular-nums">{fmtDate(c.returnedAt)}</span>
                  ),
                },
              ]
            : []),
        ]
      : []),
  ];

  return (
    <DentalCaseCard title={t("dentalLab.detail.info")} icon={<FileText className="w-5 h-5" />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
        {infoRows.map((r) => (
          <div key={r.label}>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">{r.label}</p>
            <div className="font-medium">{r.value}</div>
          </div>
        ))}
      </div>

      {c.teeth ? (
        <div className="mt-4 border-t dark:border-gray-700 pt-4">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            خريطة الأسنان المحددة في أمر الشغل (Visual FDI Odontogram):
          </p>
          <OdontogramChart
            selectedTeeth={c.teeth.split(/[,،\s]+/).filter(Boolean)}
            onChange={() => {}}
            readOnly={true}
          />
        </div>
      ) : null}

      {c.notes ? (
        <div className="mt-4 border-t dark:border-gray-700 pt-3 text-sm">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">
            {t("dentalLab.common.notes")}
          </p>
          <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{c.notes}</p>
        </div>
      ) : null}
    </DentalCaseCard>
  );
}
