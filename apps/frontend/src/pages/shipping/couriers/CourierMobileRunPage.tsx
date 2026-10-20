import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useCourierMobileRunData } from './hooks/useCourierMobileRunData';
import { CourierMobileTopBar } from './components/CourierMobileTopBar';
import { CourierMobileShipmentCard } from './components/CourierMobileShipmentCard';
import { CourierMobileActionModal } from './components/CourierMobileActionModal';
import { CourierMobileWaybillModal } from './components/CourierMobileWaybillModal';

const CourierMobileRunPage: React.FC = () => {
  const {
    run,
    loading,
    activeTab,
    setActiveTab,
    selectedShipment,
    setSelectedShipment,
    actionType,
    collectedAmount,
    setCollectedAmount,
    deliveryNotes,
    setDeliveryNotes,
    fieldPin,
    setFieldPin,
    deliveryOtp,
    setDeliveryOtp,
    submitting,
    viewingWaybillShipment,
    setViewingWaybillShipment,
    formatWhatsAppUrl,
    handleOpenAction,
    handleConfirmAction,
    allShipments,
    deliveredShipments,
    returnedShipments,
    pendingShipments,
    displayedShipments,
  } = useCourierMobileRunData();

  if (loading && !run) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 text-center text-sm text-slate-500">
        مأمورية التوصيل غير موجودة أو انتهت صلاحيتها.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16">
      {/* Top Mobile Bar */}
      <CourierMobileTopBar
        run={run}
        allShipments={allShipments}
        deliveredShipments={deliveredShipments}
        returnedShipments={returnedShipments}
        pendingShipments={pendingShipments}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Orders List */}
      <div className="p-3.5 space-y-3 max-w-lg mx-auto">
        {displayedShipments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">لا توجد طلبات في هذا التبويب</div>
        ) : (
          displayedShipments.map((s) => (
            <CourierMobileShipmentCard
              key={s.id}
              shipment={s}
              runCourierName={run.courier?.name}
              activeTab={activeTab}
              onOpenAction={handleOpenAction}
              onViewWaybill={setViewingWaybillShipment}
              formatWhatsAppUrl={formatWhatsAppUrl}
            />
          ))
        )}
      </div>

      {/* Action Confirmation Modal */}
      <CourierMobileActionModal
        selectedShipment={selectedShipment}
        actionType={actionType}
        run={run}
        fieldPin={fieldPin}
        setFieldPin={setFieldPin}
        collectedAmount={collectedAmount}
        setCollectedAmount={setCollectedAmount}
        deliveryOtp={deliveryOtp}
        setDeliveryOtp={setDeliveryOtp}
        deliveryNotes={deliveryNotes}
        setDeliveryNotes={setDeliveryNotes}
        submitting={submitting}
        onClose={() => setSelectedShipment(null)}
        onConfirm={handleConfirmAction}
      />

      {/* Mobile Parcel Waybill Modal */}
      <CourierMobileWaybillModal
        shipment={viewingWaybillShipment}
        onClose={() => setViewingWaybillShipment(null)}
      />
    </div>
  );
};

export default CourierMobileRunPage;
