import React from "react";
import {
  CheckBadgeIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";
import { ReceiptData } from "./types";

interface ReceiptsSidebarListProps {
  receipts: ReceiptData[];
  selectedReceiptId?: string;
  onSelectReceipt: (receipt: ReceiptData) => void;
}

export const ReceiptsSidebarList: React.FC<ReceiptsSidebarListProps> = ({
  receipts,
  selectedReceiptId,
  onSelectReceipt,
}) => {
  return (
    <div className="lg:col-span-4 space-y-4 print:hidden">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
        الطلبات الجاهزة للتوقيع
      </h3>
      {receipts.map((receipt) => (
        <button
          key={receipt.id}
          onClick={() => onSelectReceipt(receipt)}
          className={`w-full text-right p-4 rounded-2xl border transition-all ${
            selectedReceiptId === receipt.id
              ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 ring-2 ring-indigo-500/20"
              : "bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700 hover:border-indigo-300"
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                receipt.status === "signed"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {receipt.status === "signed" ? "مـوقع" : "بانتظار التوقيع"}
            </span>
            <span className="text-xs text-gray-400 font-mono tabular-nums">
              {receipt.referenceNumber}
            </span>
          </div>
          <h4 className="font-bold text-gray-900 dark:text-white">
            {receipt.employeeName}
          </h4>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
            <ComputerDesktopIcon className="h-4 w-4" />
            <span>{receipt.assetName}</span>
          </div>
        </button>
      ))}

      <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 text-muted-foreground text-xs">
        <p className="font-medium flex items-center gap-1.5 text-foreground mb-1">
          <CheckBadgeIcon className="h-4 w-4 text-primary" />
          مستند رسمي معتمد
        </p>
        <p className="leading-relaxed">
          وثيقة استلام رسمية تثبت استلام العهدة ومطابقتها للمواصفات القانونية والجرد.
        </p>
      </div>
    </div>
  );
};
