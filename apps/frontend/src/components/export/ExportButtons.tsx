import React from 'react';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
} from 'lucide-react';
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  printTable,
  ExportColumn,
} from '../../utils/exportHelpers';

interface ExportButtonsProps {
  data: any[];
  columns: ExportColumn[];
  filename?: string;
  title?: string;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({
  data,
  columns,
  filename = 'export',
  title = 'تقرير',
}) => {
  const handleExportCSV = () => {
    exportToCSV(data, columns, `${filename}.csv`);
  };

  const handleExportExcel = () => {
    exportToExcel(data, columns, `${filename}.xlsx`);
  };

  const handleExportPDF = () => {
    exportToPDF(data, columns, title, `${filename}.pdf`);
  };

  const handlePrint = () => {
    printTable(data, columns, title);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={handleExportCSV}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border/70 text-foreground text-xs font-semibold rounded-lg hover:bg-muted/50 transition shadow-2xs"
      >
        <Download className="w-3.5 h-3.5 text-primary" />
        <span>تصدير CSV</span>
      </button>

      <button
        type="button"
        onClick={handleExportExcel}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border/70 text-foreground text-xs font-semibold rounded-lg hover:bg-muted/50 transition shadow-2xs"
      >
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>تصدير Excel</span>
      </button>

      <button
        type="button"
        onClick={handleExportPDF}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border/70 text-foreground text-xs font-semibold rounded-lg hover:bg-muted/50 transition shadow-2xs"
      >
        <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
        <span>تصدير PDF</span>
      </button>

      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border/70 text-foreground text-xs font-semibold rounded-lg hover:bg-muted/50 transition shadow-2xs"
      >
        <Printer className="w-3.5 h-3.5 text-muted-foreground" />
        <span>طباعة</span>
      </button>
    </div>
  );
};

export default ExportButtons;
