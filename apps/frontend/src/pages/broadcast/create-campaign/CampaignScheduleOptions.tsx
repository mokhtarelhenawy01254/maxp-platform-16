import React from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { CampaignFormData } from "./types";
import { DateInput } from '../../../components/ui/DateInput';

interface CampaignScheduleOptionsProps {
  formData: CampaignFormData;
  onSendNowChange: (checked: boolean) => void;
  onInputChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
}

export const CampaignScheduleOptions: React.FC<
  CampaignScheduleOptionsProps
> = ({ formData, onSendNowChange, onInputChange }) => {
  return (
    <>
      {/* Send Now Option */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="sendNow"
          checked={formData.sendNow}
          onChange={(e) => onSendNowChange(e.target.checked)}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
        />
        <label
          htmlFor="sendNow"
          className="mr-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          <PaperAirplaneIcon className="h-5 w-5 inline ml-1" />
          إرسال فوري (الآن)
        </label>
      </div>

      {/* Scheduling */}
      {!formData.sendNow && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="scheduledAt"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              تاريخ الإرسال *
            </label>
            <DateInput
              name="scheduledAt"
              id="scheduledAt"
              value={formData.scheduledAt}
              onChange={onInputChange}
              min={new Date().toISOString().split("T")[0]}
              max={
                new Date(Date.now() + 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0]
              }
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required={!formData.sendNow}
            />
          </div>
          <div>
            <label
              htmlFor="scheduledTime"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              وقت الإرسال *
            </label>
            <input
              type="time"
              name="scheduledTime"
              id="scheduledTime"
              value={formData.scheduledTime}
              onChange={onInputChange}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required={!formData.sendNow}
            />
          </div>
        </div>
      )}
    </>
  );
};
