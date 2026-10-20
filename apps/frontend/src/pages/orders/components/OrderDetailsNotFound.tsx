import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const OrderDetailsNotFound: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">
          {t("orderDetails.orderNotFound", { defaultValue: "الطلب غير موجود" })}
        </h2>
        <Link
          to="/orders"
          className="text-primary hover:underline mt-4 inline-block font-semibold text-sm active:scale-95 transition-all"
        >
          {t("orderDetails.backToOrders", { defaultValue: "العودة إلى قائمة الطلبات" })}
        </Link>
      </div>
    </div>
  );
};

export default OrderDetailsNotFound;
