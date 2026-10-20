import React from "react";
import type { InstalledApp } from "@/types/marketplace";
import { MyAppsCard } from "./MyAppsCard";

interface MyAppsGridProps {
  apps: InstalledApp[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, e?: React.MouseEvent) => void;
  onOpenDrawer: (app: InstalledApp) => void;
  onConfirmUninstall: (app: InstalledApp) => void;
  uninstallingId: string | null;
}

export const MyAppsGrid: React.FC<MyAppsGridProps> = ({
  apps,
  selectedIds,
  onToggleSelect,
  onOpenDrawer,
  onConfirmUninstall,
  uninstallingId,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
      {apps.map((installed) => (
        <MyAppsCard
          key={installed.id}
          installed={installed}
          isSelected={selectedIds.has(installed.id)}
          onToggleSelect={onToggleSelect}
          onOpenDrawer={onOpenDrawer}
          onConfirmUninstall={onConfirmUninstall}
          isUninstalling={uninstallingId === installed.id}
        />
      ))}
    </div>
  );
};
