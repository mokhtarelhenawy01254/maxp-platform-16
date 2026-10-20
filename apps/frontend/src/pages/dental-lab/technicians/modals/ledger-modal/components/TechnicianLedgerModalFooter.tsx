interface TechnicianLedgerModalFooterProps {
  onClose: () => void;
}

export function TechnicianLedgerModalFooter({ onClose }: TechnicianLedgerModalFooterProps) {
  return (
    <div className="p-3 border-t dark:border-gray-700 flex justify-end print:hidden">
      <button
        onClick={onClose}
        className="px-4 py-1.5 text-xs text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        إغلاق
      </button>
    </div>
  );
}
