import React from 'react';
import { useTranslation } from 'react-i18next';
import { Truck, Plus, Edit2, Trash2 } from 'lucide-react';
import {
  ReturnType,
  ReturnTypeCode,
  ReturnTypeCostModel,
  ReturnShippingCompany,
} from '../../../services/returnService';
import { typeCodeKey, costModelKey } from './returnSettingsConstants';
import { ReturnShippingTypeModal } from './ReturnShippingTypeModal';

interface ReturnShippingTypesTabProps {
  typesLoading: boolean;
  shippingCompanies: ReturnShippingCompany[];
  openTypeModal: (type?: ReturnType, presetCompanyId?: string) => void;
  deleteType: (id: string) => Promise<void>;
  isTypeModalOpen: boolean;
  setIsTypeModalOpen: (val: boolean) => void;
  editingType: ReturnType | null;
  typeName: string;
  setTypeName: (val: string) => void;
  typeShippingCompanyId: string;
  setTypeShippingCompanyId: (val: string) => void;
  typeCode: ReturnTypeCode;
  setTypeCode: (val: ReturnTypeCode) => void;
  typeCostModel: ReturnTypeCostModel;
  setTypeCostModel: (val: ReturnTypeCostModel) => void;
  typeFixedAmount: string;
  setTypeFixedAmount: (val: string) => void;
  savingType: boolean;
  handleSaveType: (e: React.FormEvent) => Promise<void>;
}

export const ReturnShippingTypesTab: React.FC<ReturnShippingTypesTabProps> = ({
  typesLoading,
  shippingCompanies,
  openTypeModal,
  deleteType,
  isTypeModalOpen,
  setIsTypeModalOpen,
  editingType,
  typeName,
  setTypeName,
  typeShippingCompanyId,
  setTypeShippingCompanyId,
  typeCode,
  setTypeCode,
  typeCostModel,
  setTypeCostModel,
  typeFixedAmount,
  setTypeFixedAmount,
  savingType,
  handleSaveType,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400">
            <Truck size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              {t('returns.k_230')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('returns.k_231')}
            </p>
          </div>
        </div>
        <button
          onClick={() => openTypeModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-xs"
        >
          <Plus size={18} /> {t('returns.k_234')}
        </button>
      </div>

      {typesLoading ? (
        <div className="text-center py-8 text-gray-400">
          {t('returns.k_144')}
        </div>
      ) : shippingCompanies.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500">
          {t('returns.k_233')}
        </div>
      ) : (
        <div className="space-y-6">
          {shippingCompanies.map((company) => (
            <div
              key={company.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xs border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                    <Truck size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {company.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {company.returnTypes?.length || 0} {t('returns.k_255')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => openTypeModal(undefined, company.id)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium flex items-center gap-1"
                >
                  <Plus size={14} /> {t('returns.k_234')}
                </button>
              </div>

              {!company.returnTypes || company.returnTypes.length === 0 ? (
                <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm">
                  {t('returns.k_240')}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {company.returnTypes.map((type) => (
                    <div
                      key={type.id}
                      className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {type.name}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              type.isActive
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {type.isActive
                              ? t('returns.k_259')
                              : t('returns.k_260')}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono">
                            {type.code}
                          </span>
                          <span>{t(`returns.k_${typeCodeKey(type.code)}`)}</span>
                          <span>•</span>
                          <span>{t(`returns.k_${costModelKey(type.costModel)}`)}</span>
                          {type.costModel === 'FIXED' && type.fixedAmount != null && (
                            <span className="font-medium tabular-nums font-mono">
                              {type.fixedAmount} {t('returns.k_22')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openTypeModal(type)}
                          className="text-blue-600 hover:text-blue-500 dark:text-blue-400"
                          title={t('returns.k_235')}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteType(type.id)}
                          className="text-red-400 hover:text-red-600"
                          title={t('returns.k_250')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ReturnShippingTypeModal
        isOpen={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        editingType={editingType}
        typeName={typeName}
        setTypeName={setTypeName}
        typeShippingCompanyId={typeShippingCompanyId}
        setTypeShippingCompanyId={setTypeShippingCompanyId}
        typeCode={typeCode}
        setTypeCode={setTypeCode}
        typeCostModel={typeCostModel}
        setTypeCostModel={setTypeCostModel}
        typeFixedAmount={typeFixedAmount}
        setTypeFixedAmount={setTypeFixedAmount}
        savingType={savingType}
        shippingCompanies={shippingCompanies}
        onSave={handleSaveType}
      />
    </div>
  );
};
