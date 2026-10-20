import React from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Users } from "lucide-react";
import type { DentalTechnician, TeamMember } from "../../shared";
import { TechnicianTableHeader } from "./table/TechnicianTableHeader";
import { TechnicianTableRow } from "./table/TechnicianTableRow";

export interface TechnicianTableProps {
  rows: DentalTechnician[];
  wageDefault: number;
  loading: boolean;
  removingId: string | null;
  team: TeamMember[];
  onOpenEdit: (tech: DentalTechnician) => void;
  onRemove: (tech: DentalTechnician) => void;
  onToggleActive: (tech: DentalTechnician) => void;
  onOpenPayout: (tech: DentalTechnician) => void;
  onOpenLedger: (tech: DentalTechnician) => void;
}

export const TechnicianTable: React.FC<TechnicianTableProps> = ({
  rows,
  wageDefault,
  loading,
  removingId,
  team,
  onOpenEdit,
  onRemove,
  onToggleActive,
  onOpenPayout,
  onOpenLedger,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="p-12 text-center text-gray-400 dark:text-gray-500">
        <Users className="w-10 h-10 mx-auto mb-3" />
        {t("dentalLab.common.noResults")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <TechnicianTableHeader />
        <tbody>
          {rows.map((x) => (
            <TechnicianTableRow
              key={x.id}
              x={x}
              rows={rows}
              wageDefault={wageDefault}
              removingId={removingId}
              team={team}
              onOpenEdit={onOpenEdit}
              onRemove={onRemove}
              onToggleActive={onToggleActive}
              onOpenPayout={onOpenPayout}
              onOpenLedger={onOpenLedger}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TechnicianTable;
