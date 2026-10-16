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
    <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border/70 bg-card p-1 shadow-none">
      <button
        type="button"
        onClick={handleExportCSV}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-foreground transition-all hover:bg-muted/60 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        title="تصدير بصيغة CSV"
      >
        <Download className="size-3.5 text-primary" />
        <span>تصدير CSV</span>
      </button>

      <button
        type="button"
        onClick={handleExportExcel}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-foreground transition-all hover:bg-muted/60 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        title="تصدير بصيغة Excel"
      >
        <FileSpreadsheet className="size-3.5 text-emerald-500" />
        <span>تصدير Excel</span>
      </button>

      <button
        type="button"
        onClick={handleExportPDF}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-foreground transition-all hover:bg-muted/60 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        title="تصدير بصيغة PDF"
      >
        <FileText className="size-3.5 text-rose-500" />
        <span>تصدير PDF</span>
      </button>

      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        title="طباعة التقرير"
      >
        <Printer className="size-3.5 text-muted-foreground" />
        <span>طباعة</span>
      </button>
    </div>
  );
};

export default ExportButtons;
