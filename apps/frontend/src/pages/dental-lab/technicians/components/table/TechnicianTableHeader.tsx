import React from "react";
import { useTranslation } from "react-i18next";

export const TechnicianTableHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <thead>
      <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
        <th className="text-right py-3 px-3 whitespace-nowrap">{t("dentalLab.common.name")}</th>
        <th className="text-right py-3 px-3 whitespace-nowrap">{t("dentalLab.common.phone")}</th>
        <th className="text-right py-3 px-3 whitespace-nowrap">التخصص / المحطة</th>
        <th className="text-right py-3 px-3 whitespace-nowrap">الجدول والسقف</th>
        <th className="text-right py-3 px-3 whitespace-nowrap">البديل المفضل</th>
        <th className="text-right py-3 px-3 whitespace-nowrap">أجر المرحلة</th>
        <th className="text-right py-3 px-3 whitespace-nowrap">المراحل</th>
        <th className="text-right py-3 px-3 whitespace-nowrap">إجمالي المكتسب</th>
        <th className="text-right py-3 px-3 whitespace-nowrap">المنصرف والسلف</th>
        <th className="text-right py-3 px-3 whitespace-nowrap">صافي المتبقي</th>
        <th className="text-right py-3 px-3 whitespace-nowrap">حساب المنصة</th>
        <th className="text-right py-3 px-3 whitespace-nowrap">{t("dentalLab.common.status")}</th>
        <th className="text-right py-3 px-3 whitespace-nowrap">{t("dentalLab.common.actions")}</th>
      </tr>
    </thead>
  );
};

export default TechnicianTableHeader;
