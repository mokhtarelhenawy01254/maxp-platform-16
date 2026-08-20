import React from 'react';
import {
    DocumentArrowDownIcon,
    PrinterIcon,
} from '@heroicons/react/24/outline';
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
        <div className="flex flex-wrap gap-2">
            <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
                <DocumentArrowDownIcon className="w-5 h-5" />
                <span>تصدير CSV</span>
            </button>

            <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
                <DocumentArrowDownIcon className="w-5 h-5" />
                <span>تصدير Excel</span>
            </button>

            <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
                <DocumentArrowDownIcon className="w-5 h-5" />
                <span>تصدير PDF</span>
            </button>

            <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
                <PrinterIcon className="w-5 h-5" />
                <span>طباعة</span>
            </button>
        </div>
    );
};

export default ExportButtons;
