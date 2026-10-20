import React from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, MessageCircle, Calendar } from 'lucide-react';
import { ContactAttempt } from '../../../services/returnService';

interface ReturnContactHistoryTabProps {
  handleAddContact: (e: React.FormEvent) => void;
  contactMethod: string;
  setContactMethod: (val: string) => void;
  contactResult: string;
  setContactResult: (val: string) => void;
  contactNotes: string;
  setContactNotes: (val: string) => void;
  loadingLogs: boolean;
  contactHistory: ContactAttempt[];
}

export const ReturnContactHistoryTab: React.FC<ReturnContactHistoryTabProps> = ({
  handleAddContact,
  contactMethod,
  setContactMethod,
  contactResult,
  setContactResult,
  contactNotes,
  setContactNotes,
  loadingLogs,
  contactHistory,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Add Attempt Form */}
      <form
        onSubmit={handleAddContact}
        className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Phone size={16} /> {t('returns.k_209')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {t('returns.k_210')}
            </label>
            <select
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value)}
              className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md shadow-xs focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500"
            >
              <option value="PHONE">{t('returns.k_126')}</option>
              <option value="WHATSAPP">{t('returns.k_127')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {t('returns.k_211')}
            </label>
            <select
              value={contactResult}
              onChange={(e) => setContactResult(e.target.value)}
              className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md shadow-xs focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500"
            >
              <option value="NO_ANSWER">{t('returns.k_128')}</option>
              <option value="ANSWERED">{t('returns.k_129')}</option>
              <option value="BUSY">{t('returns.k_130')}</option>
              <option value="WRONG_NUMBER">{t('returns.k_131')}</option>
              <option value="CALL_BACK_LATER">{t('returns.k_212')}</option>
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('returns.k_213')}
          </label>
          <textarea
            value={contactNotes}
            onChange={(e) => setContactNotes(e.target.value)}
            className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md shadow-xs focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500"
            rows={2}
            placeholder={t('returns.k_132')}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 dark:bg-blue-500 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          {t('returns.k_214')}
        </button>
      </form>

      {/* History List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('returns.k_215')}</h3>
        {loadingLogs ? (
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm">{t('returns.k_144')}</p>
        ) : contactHistory.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-gray-400 dark:text-gray-500 text-sm">
            {t('returns.k_216')}
          </div>
        ) : (
          contactHistory.map((attempt) => (
            <div
              key={attempt.id}
              className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-4 rounded-lg flex items-start gap-3"
            >
              <div
                className={`p-2 rounded-full ${
                  attempt.method === 'WHATSAPP'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                }`}
              >
                {attempt.method === 'WHATSAPP' ? (
                  <MessageCircle size={16} />
                ) : (
                  <Phone size={16} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-sm text-gray-900 dark:text-white block mb-1">
                      {attempt.user?.firstName} {attempt.user?.lastName}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                      {attempt.result}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 tabular-nums">
                    <Calendar size={12} />
                    {new Date(attempt.createdAt).toLocaleString('ar-EG')}
                  </span>
                </div>
                {attempt.notes && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    "{attempt.notes}"
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
