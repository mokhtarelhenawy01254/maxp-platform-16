/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { ShippingCompany, CourierMode } from "./shippingCardTypes";
import { ShippingCarrierTabs } from "./ShippingCarrierTabs";
import { TurboDirectShipmentCard } from "./TurboDirectShipmentCard";
import { QpExpressDirectShipmentCard } from "./QpExpressDirectShipmentCard";
import { BostaDirectShipmentCard } from "./BostaDirectShipmentCard";
import { CustomCourierShipmentCard } from "./CustomCourierShipmentCard";
import { ManualCourierShipmentCard } from "./ManualCourierShipmentCard";

export interface ShippingCarrierSelectorProps {
  order: any;
  courierMode: CourierMode;
  setCourierMode: (mode: CourierMode) => void;
  setIsManualCourier: (isManual: boolean) => void;
  turboCompany?: ShippingCompany;
  qpCompany?: ShippingCompany;
  bostaCompany?: ShippingCompany;
  customCompanies: ShippingCompany[];
  qpSettings: any;
  qpNotes: string;
  setQpNotes: (notes: string) => void;
  manualTracking: string;
  setManualTracking: (tracking: string) => void;
  manualNotes: string;
  setManualNotes: (notes: string) => void;
  selectedCompanyId: string;
  setSelectedCompanyId: (id: string) => void;
  loading: boolean;
  onTurboDirectShipment: () => void;
  onQpExpressDirectShipment: () => void;
  onBostaDirectShipment: () => void;
  onCreateShipment: () => void;
}

export const ShippingCarrierSelector: React.FC<ShippingCarrierSelectorProps> = ({
  order,
  courierMode,
  setCourierMode,
  setIsManualCourier,
  turboCompany,
  qpCompany,
  bostaCompany,
  customCompanies,
  qpSettings,
  qpNotes,
  setQpNotes,
  manualTracking,
  setManualTracking,
  manualNotes,
  setManualNotes,
  selectedCompanyId,
  setSelectedCompanyId,
  loading,
  onTurboDirectShipment,
  onQpExpressDirectShipment,
  onBostaDirectShipment,
  onCreateShipment,
}) => {
  return (
    <div className="space-y-4">
      <ShippingCarrierTabs
        courierMode={courierMode}
        setCourierMode={setCourierMode}
        setIsManualCourier={setIsManualCourier}
        turboCompany={turboCompany}
        qpCompany={qpCompany}
        bostaCompany={bostaCompany}
        customCompanies={customCompanies}
      />

      {courierMode === "turbo" && turboCompany && (
        <TurboDirectShipmentCard
          orderTotal={order?.total || 0}
          loading={loading}
          onTurboDirectShipment={onTurboDirectShipment}
        />
      )}

      {courierMode === "qp" && qpCompany && (
        <QpExpressDirectShipmentCard
          qpSettings={qpSettings}
          qpNotes={qpNotes}
          setQpNotes={setQpNotes}
          loading={loading}
          onQpExpressDirectShipment={onQpExpressDirectShipment}
        />
      )}

      {courierMode === "bosta" && bostaCompany && (
        <BostaDirectShipmentCard
          loading={loading}
          onBostaDirectShipment={onBostaDirectShipment}
        />
      )}

      {courierMode === "custom" && customCompanies.length > 0 && (
        <CustomCourierShipmentCard
          customCompanies={customCompanies}
          selectedCompanyId={selectedCompanyId}
          setSelectedCompanyId={setSelectedCompanyId}
          loading={loading}
          onCreateShipment={onCreateShipment}
        />
      )}

      {courierMode === "manual" && (
        <ManualCourierShipmentCard
          manualTracking={manualTracking}
          setManualTracking={setManualTracking}
          manualNotes={manualNotes}
          setManualNotes={setManualNotes}
          loading={loading}
          onCreateShipment={onCreateShipment}
        />
      )}
    </div>
  );
};

export default ShippingCarrierSelector;
