import React from 'react';
import { ArrowPathIcon, KeyIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
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
    isPinPromptOpen,
    linkPinInput,
    setLinkPinInput,
    verifyingPin,
    pinError,
    handleVerifyLinkPin,
  } = useCourierMobileRunData();

  if (isPinPromptOpen && !run) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 text-slate-900 dark:text-slate-100" dir="rtl">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <KeyIcon className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              رمز الأمان الميداني (PIN)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              أدخل رمز PIN الخاص بالمندوب لفتح هذه الرحلة
            </p>
          </div>

          {pinError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          <form onSubmit={handleVerifyLinkPin} className="space-y-4">
            <div>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={linkPinInput}
                onChange={(e) => setLinkPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="••••"
                autoFocus
                className="w-full text-center tracking-widest text-xl font-mono font-bold py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={verifyingPin || linkPinInput.length < 4}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {verifyingPin ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>جاري التحقق...</span>
                </>
              ) : (
                <span>تأكيد رمز الـ PIN</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

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
