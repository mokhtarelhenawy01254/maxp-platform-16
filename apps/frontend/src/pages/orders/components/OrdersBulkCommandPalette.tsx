import React from "react";
import { useTranslation } from "react-i18next";
import { CommandPalette } from "../../../components/common/CommandPalette";

export interface OrdersBulkCommandPaletteProps {
  hasActiveTurbo: boolean;
  hasActiveQpExpress: boolean;
  hasActiveBosta: boolean;
  handleBulkPrintInvoices: () => void;
  handleBulkCreateTurboShipments: () => void;
  handleBulkCreateQpExpressShipments: () => void;
  handleBulkCreateBostaShipments: () => void;
  handleBulkDelete: () => void;
}

export const OrdersBulkCommandPalette: React.FC<OrdersBulkCommandPaletteProps> = ({
  hasActiveTurbo,
  hasActiveQpExpress,
  hasActiveBosta,
  handleBulkPrintInvoices,
  handleBulkCreateTurboShipments,
  handleBulkCreateQpExpressShipments,
  handleBulkCreateBostaShipments,
  handleBulkDelete,
}) => {
  const { t } = useTranslation();

  return (
    <CommandPalette
      showTrigger={false}
      extraCommands={[
        {
          id: "bulk-print",
          group: "bulk",
          label: t("orders.palette.bulkPrintAll", { defaultValue: "طباعة فواتير الطلبات المحددة" }),
          onSelect: () => handleBulkPrintInvoices(),
        },
        ...(hasActiveTurbo
          ? [
              {
                id: "bulk-turbo",
                group: "bulk",
                label: t("orders.palette.bulkCreateTurboAll", { defaultValue: "شحن الطلبات المحددة عبر تيربو (Turbo)" }),
                onSelect: () => handleBulkCreateTurboShipments(),
              },
            ]
          : []),
        ...(hasActiveQpExpress
          ? [
              {
                id: "bulk-qpexpress",
                group: "bulk",
                label: "شحن الطلبات المحددة عبر كيو بي إكسبريس (QP Express)",
                onSelect: () => handleBulkCreateQpExpressShipments(),
              },
            ]
          : []),
        ...(hasActiveBosta
          ? [
              {
                id: "bulk-bosta",
                group: "bulk",
                label: "شحن الطلبات المحددة عبر بوستا (Bosta)",
                onSelect: () => handleBulkCreateBostaShipments(),
              },
            ]
          : []),
        {
          id: "bulk-delete",
          group: "bulk",
          label: t("orders.palette.bulkDeleteAll", { defaultValue: "حذف الطلبات المحددة" }),
          onSelect: () => handleBulkDelete(),
        },
      ]}
    />
  );
};

export default OrdersBulkCommandPalette;
