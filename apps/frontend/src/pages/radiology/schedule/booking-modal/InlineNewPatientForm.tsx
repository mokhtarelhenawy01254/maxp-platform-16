import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, UserPlus, ScanLine } from 'lucide-react';
import { MODAL_INPUT_CLS } from '../../shared';
import type { NewPatientFormState } from './types';
import { DateInput } from '../../../../components/ui/DateInput';

interface InlineNewPatientFormProps {
  newPatient: NewPatientFormState;
  onNewPatientChange: (p: any) => void;
  savingNewPatient: boolean;
  onSaveNewPatient: () => void;
  onCloseNewPatient: () => void;
  onOpenCardScanner: () => void;
  labelCls: string;
}

export const InlineNewPatientForm: React.FC<InlineNewPatientFormProps> = ({
  newPatient,
  onNewPatientChange,
  savingNewPatient,
  onSaveNewPatient,
  onCloseNewPatient,
  onOpenCardScanner,
  labelCls,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mt-3 rounded-lg border dark:border-gray-600 p-3 space-y-3 bg-gray-50 dark:bg-gray-800/50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t('radiology.schedule.patientName')}</label>
          <input
            className={MODAL_INPUT_CLS}
            value={newPatient.firstName}
            onChange={e =>
              onNewPatientChange({
                ...newPatient,
                firstName: e.target.value,
              })
            }
            placeholder={t('radiology.schedule.fullNamePlaceholder')}
          />
        </div>
        <div>
          <label className={labelCls}>{t('radiology.schedule.phone')}</label>
          <input
            className={MODAL_INPUT_CLS}
            dir="ltr"
            value={newPatient.phone}
            onChange={e =>
              onNewPatientChange({
                ...newPatient,
                phone: e.target.value,
              })
            }
            placeholder="01xxxxxxxxx"
          />
        </div>
        <div>
          <label className={labelCls}>{t('radiology.schedule.gender')}</label>
          <select
            className={MODAL_INPUT_CLS}
            value={newPatient.gender}
            onChange={e =>
              onNewPatientChange({
                ...newPatient,
                gender: e.target.value,
              })
            }
          >
            <option value="">{t('radiology.gender.unspecified')}</option>
            <option value="male">{t('radiology.gender.male')}</option>
            <option value="female">{t('radiology.gender.female')}</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>{t('radiology.schedule.nationalIdHint')}</label>
          <div className="flex gap-2">
            <input
              className={MODAL_INPUT_CLS}
              dir="ltr"
              value={newPatient.nationalId}
              onChange={e =>
                onNewPatientChange({
                  ...newPatient,
                  nationalId: e.target.value.replace(/\D/g, '').slice(0, 14),
                })
              }
              placeholder={t('radiology.schedule.nationalId14')}
            />
            <button
              type="button"
              onClick={onOpenCardScanner}
              className="shrink-0 flex items-center gap-1 px-3 py-2 border dark:border-gray-600 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ScanLine className="w-3.5 h-3.5" />
              {t('radiology.schedule.scanCard')}
            </button>
          </div>
          {newPatient.nationalIdImage ? (
            <img
              src={newPatient.nationalIdImage}
              alt="بطاقة الرقم القومي"
              className="mt-2 w-24 h-16 object-cover rounded-lg border dark:border-gray-600"
            />
          ) : null}
        </div>
        <div>
          <label className={labelCls}>{t('radiology.schedule.birthDate')}</label>
          <DateInput
            className={MODAL_INPUT_CLS}
            value={newPatient.birthDate}
            onChange={e =>
              onNewPatientChange({
                ...newPatient,
                birthDate: e.target.value,
              })
            }
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCloseNewPatient}
          className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 border rounded-lg"
        >
          {t('radiology.cancel')}
        </button>
        <button
          type="button"
          onClick={onSaveNewPatient}
          disabled={savingNewPatient}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {savingNewPatient ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <UserPlus className="w-3.5 h-3.5" />
          )}
          {t('radiology.schedule.saveAndSelectPatient')}
        </button>
      </div>
    </div>
  );
};

export default InlineNewPatientForm;
