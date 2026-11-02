import React from "react";
import { useTranslation } from "react-i18next";
import { UserIcon, MapPinIcon, HeartIcon } from "@heroicons/react/24/outline";
import { useDateFormat } from "../../../hooks/useDateFormat";
import { Employee, ProfileFormData } from "./types";
import { calculateAge, getMaritalLabels } from "./helpers";
import { SectionCard, InfoField } from "./ProfileWidgets";
import { DateInput } from '../../../components/ui/DateInput';

interface ProfilePersonalTabProps {
  employee: Employee | null;
  formData: ProfileFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
  isEditing: boolean;
  field: (key: keyof ProfileFormData) => { value: string; onChange: (v: string) => void };
}

export const ProfilePersonalTab: React.FC<ProfilePersonalTabProps> = ({
  employee,
  formData,
  setFormData,
  isEditing,
  field,
}) => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const maritalLabels = getMaritalLabels(t);

  return (
    <div className="mt-0 focus-visible:outline-none space-y-5">
      <SectionCard icon={UserIcon} title={t("employee.common.personalInfo")} accent="violet">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
          <InfoField label={t("employee.profile.fullName")} value={`${formData.firstName} ${formData.lastName}`} />

          <div className="group">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              {t("employee.profile.dateOfBirth")}
            </p>
            {isEditing ? (
              <DateInput
                value={formData.dateOfBirth}
                onChange={(e) => setFormData((p) => ({ ...p, dateOfBirth: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
              />
            ) : (
              <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                {employee?.dateOfBirth
                  ? `${formatDate(employee.dateOfBirth)} (${calculateAge(employee.dateOfBirth)} ${t("employee.profile.yearsOld")})`
                  : "—"}
              </p>
            )}
          </div>

          <div className="group">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              {t("employee.profile.gender")}
            </p>
            {isEditing ? (
              <select
                value={formData.gender}
                onChange={(e) => setFormData((p) => ({ ...p, gender: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
              >
                <option value="">{t("employee.profile.genderNotSpecified")}</option>
                <option value="MALE">{t("employee.profile.genderMale")}</option>
                <option value="FEMALE">{t("employee.profile.genderFemale")}</option>
              </select>
            ) : (
              <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                {formData.gender === "MALE"
                  ? t("employee.profile.genderMale")
                  : formData.gender === "FEMALE"
                  ? t("employee.profile.genderFemale")
                  : "—"}
              </p>
            )}
          </div>

          <InfoField label={t("employee.profile.nationalId")} editing={isEditing} {...field("nationalId")} />
          <InfoField label={t("employee.profile.email")} value={formData.email} />

          {/* Marital status with select */}
          <div className="group">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              {t("employee.profile.maritalStatus")}
            </p>
            {isEditing ? (
              <select
                value={formData.maritalStatus}
                onChange={(e) => setFormData((p) => ({ ...p, maritalStatus: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
              >
                <option value="">{t("employee.profile.maritalNotSpecified")}</option>
                <option value="SINGLE">{t("employee.common.maritalSingle")}</option>
                <option value="MARRIED">{t("employee.common.maritalMarried")}</option>
                <option value="DIVORCED">{t("employee.common.maritalDivorced")}</option>
                <option value="WIDOWED">{t("employee.common.maritalWidowed")}</option>
              </select>
            ) : (
              <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                {maritalLabels[formData.maritalStatus] || "—"}
              </p>
            )}
          </div>

          <InfoField label={t("employee.profile.phone")} editing={isEditing} {...field("phone")} />
        </div>
      </SectionCard>

      <SectionCard icon={MapPinIcon} title={t("employee.profile.addressTitle")} accent="indigo">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-6">
          <InfoField label={t("employee.profile.detailedAddress")} editing={isEditing} {...field("address")} />
          <InfoField label={t("employee.profile.city")} editing={isEditing} {...field("city")} />
          <InfoField label={t("employee.profile.country")} editing={isEditing} {...field("country")} />
        </div>
      </SectionCard>

      <SectionCard icon={HeartIcon} title={t("employee.profile.emergencyContact")} accent="rose">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-6">
          <InfoField label={t("employee.profile.emergencyContactName")} editing={isEditing} {...field("emergencyContactName")} />
          <InfoField label={t("employee.profile.emergencyContactRelation")} editing={isEditing} {...field("emergencyContactRelation")} />
          <InfoField label={t("employee.profile.emergencyContactPhone")} editing={isEditing} {...field("emergencyContactPhone")} />
        </div>
      </SectionCard>
    </div>
  );
};
