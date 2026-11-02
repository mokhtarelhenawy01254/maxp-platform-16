import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { RadiologyDevice, MODAL_INPUT_CLS } from '../../shared';
import { Appointment, PAY_METHODS, ScheduleForm } from '../types';
import { DateInput } from '../../../../components/ui/DateInput';

interface DeviceAndTimingSectionProps {
  modal: ScheduleForm;
  onModalChange: (form: ScheduleForm) => void;
  devices: RadiologyDevice[];
  items: Appointment[];
  coverage: Record<
    string,
    { covered: boolean; entityPrice?: number | null; basePrice?: number }
  >;
  initialPayment: { amount: string; method: string };
  onInitialPaymentChange: (p: { amount: string; method: string }) => void;
  physicianSearch: string;
  onPhysicianSearchChange: (val: string) => void;
  physicianResults: { id: string; name: string }[];
  onPickPhysician: (doc: any) => void;
  marketingReps: { id: string; name: string }[];
  labelCls: string;
}

export const DeviceAndTimingSection: React.FC<DeviceAndTimingSectionProps> = ({
  modal,
  onModalChange,
  devices,
  items,
  coverage,
  initialPayment,
  onInitialPaymentChange,
  physicianSearch,
  onPhysicianSearchChange,
  physicianResults,
  onPickPhysician,
  marketingReps,
  labelCls,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div>
        <label className={labelCls}>{t('radiology.schedule.device')}</label>
        <select
          className={MODAL_INPUT_CLS}
          value={modal.deviceId}
          onChange={e => onModalChange({ ...modal, deviceId: e.target.value })}
        >
          <option value="">{t('radiology.schedule.noDevice')}</option>
          {devices
            .filter(d => d.isActive !== false)
            .map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.room ? ` — ${d.room}` : ''}
              </option>
            ))}
        </select>
        {(() => {
          const did = modal.deviceId;
          const d = modal.appointmentDate;
          if (!did || !d) return null;
          const clash = items.find(a => {
            if (a.id === modal.id || a.status === 'CANCELLED' || a.deviceId !== did) return false;
            if (a.appointmentDate?.slice(0, 10) !== d) return false;
            const t1 = modal.appointmentTime;
            const t2 = a.appointmentTime;
            if (t1 && t2) return t1 === t2;
            return true;
          });
          return clash ? (
            <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Zap className="w-3 h-3" />{' '}
              {t('radiology.schedule.deviceConflict', {
                name: clash.patientName,
                time: clash.appointmentTime || '—',
              })}
            </p>
          ) : null;
        })()}
      </div>

      {!modal.id && modal.status === 'CHECKED_IN' ? (
        <div className="sm:col-span-2">
          <label className={labelCls}>{t('radiology.receptionFlow.initialPayment')}</label>
          <div className="flex gap-3">
            <input
              type="number"
              min={0}
              className={MODAL_INPUT_CLS}
              dir="ltr"
              placeholder={t('radiology.receptionFlow.amountPlaceholder') as string}
              value={initialPayment.amount}
              onChange={e =>
                onInitialPaymentChange({
                  ...initialPayment,
                  amount: e.target.value,
                })
              }
            />
            <select
              className={MODAL_INPUT_CLS}
              style={{ maxWidth: 200 }}
              value={initialPayment.method}
              onChange={e =>
                onInitialPaymentChange({
                  ...initialPayment,
                  method: e.target.value,
                })
              }
            >
              {PAY_METHODS.map(m => (
                <option key={m} value={m}>
                  {t(`radiology.paymentMethod.${m}`)}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {t('radiology.receptionFlow.initialPaymentHint')}
          </p>
        </div>
      ) : null}

      {modal.insuranceCompanyId && Object.keys(coverage).some(k => !coverage[k]?.covered) ? (
        <div className="sm:col-span-2">
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Zap className="w-3 h-3" /> {t('radiology.schedule.coverageWarning')}
          </p>
        </div>
      ) : null}

      <div>
        <label className={labelCls}>{t('radiology.schedule.insuranceNumberLabel')}</label>
        <input
          className={MODAL_INPUT_CLS}
          dir="ltr"
          value={modal.insuranceNumber}
          onChange={e => onModalChange({ ...modal, insuranceNumber: e.target.value })}
        />
      </div>

      <div className="relative">
        <label className={labelCls}>{t('radiology.schedule.referringDoctor')}</label>
        <input
          className={MODAL_INPUT_CLS}
          value={physicianSearch || modal.referralDoctor}
          onChange={e => {
            onPhysicianSearchChange(e.target.value);
            if (!e.target.value) {
              onModalChange({
                ...modal,
                referringPhysicianId: '',
                referralDoctor: '',
              });
            }
          }}
          placeholder={t('radiology.schedule.searchDoctor')}
        />
        {physicianSearch.trim() && (
          <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-xl">
            {physicianResults.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {t('radiology.schedule.noResults')}
              </div>
            ) : (
              physicianResults.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPickPhysician(p)}
                  className="block w-full text-right px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <span className="font-medium">{p.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div>
        <label className={labelCls}>{t('radiology.schedule.marketingRep')}</label>
        <select
          className={MODAL_INPUT_CLS}
          value={modal.marketingRepId}
          onChange={e => {
            const rid = e.target.value;
            const rep = marketingReps.find(r => r.id === rid);
            onModalChange({
              ...modal,
              marketingRepId: rid,
              marketingRepName: rep?.name || '',
            });
          }}
        >
          <option value="">{t('radiology.schedule.noMarketingRep')}</option>
          {marketingReps.map(r => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {modal.marketingRepName && !modal.marketingRepId ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{modal.marketingRepName}</p>
        ) : null}
      </div>

      <div>
        <label className={labelCls}>{t('radiology.schedule.date')}</label>
        <DateInput
          className={MODAL_INPUT_CLS}
          value={modal.appointmentDate}
          onChange={e => onModalChange({ ...modal, appointmentDate: e.target.value })}
        />
      </div>

      <div>
        <label className={labelCls}>{t('radiology.schedule.time')}</label>
        <input
          type="time"
          className={MODAL_INPUT_CLS}
          value={modal.appointmentTime}
          onChange={e => onModalChange({ ...modal, appointmentTime: e.target.value })}
        />
        {(() => {
          const d = modal.appointmentDate;
          const tm = modal.appointmentTime;
          if (!d || !tm) return null;
          const clash = items.find(
            a =>
              a.id !== modal.id &&
              a.status !== 'CANCELLED' &&
              a.appointmentDate?.slice(0, 10) === d &&
              a.appointmentTime === tm
          );
          return clash ? (
            <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Zap className="w-3 h-3" />{' '}
              {t('radiology.schedule.timeSlotTaken', {
                name: clash.patientName,
              })}
            </p>
          ) : null;
        })()}
      </div>
    </>
  );
};

export default DeviceAndTimingSection;
