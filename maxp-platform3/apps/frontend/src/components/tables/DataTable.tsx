import React, { useState, useMemo } from 'react';
import {
    ChevronUpIcon,
    ChevronDownIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface Column {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
    data: any[];
    columns: Column[];
    searchable?: boolean;
    searchPlaceholder?: string;
    pageSize?: number;
    showPagination?: boolean;
}

const DataTable: React.FC<DataTableProps> = ({
    data,
    columns,
    searchable = true,
    searchPlaceholder = 'بحث...',
    pageSize = 10,
    showPagination = true,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{
        key: string;
        direction: 'asc' | 'desc';
    } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Filter data based on search term
    const filteredData = useMemo(() => {
        if (!searchTerm) return data;

        return data.filter((row) =>
            columns.some((column) => {
                const value = row[column.key];
                return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
            })
        );
    }, [data, searchTerm, columns]);

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortConfig) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === bValue) return 0;

            const comparison = aValue > bValue ? 1 : -1;
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
    }, [filteredData, sortConfig]);

    // Paginate data
    const paginatedData = useMemo(() => {
        if (!showPagination) return sortedData;

        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return sortedData.slice(startIndex, endIndex);
    }, [sortedData, currentPage, pageSize, showPagination]);

    const totalPages = Math.ceil(sortedData.length / pageSize);

    const handleSort = (key: string) => {
        setSortConfig((current) => {
            if (current?.key === key) {
                return {
                    key,
                    direction: current.direction === 'asc' ? 'desc' : 'asc',
                };
            }
            return { key, direction: 'asc' };
        });
    };

    const renderSortIcon = (columnKey: string) => {
        if (sortConfig?.key !== columnKey) return null;

        return sortConfig.direction === 'asc' ? (
            <ChevronUpIcon className="w-4 h-4 inline mr-1" />
        ) : (
            <ChevronDownIcon className="w-4 h-4 inline mr-1" />
        );
    };

    return (
        <div className="w-full">
            {/* Search */}
            {searchable && (
                <div className="mb-4">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider ${column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                                        }`}
                                    onClick={() => column.sortable && handleSort(column.key)}
                                >
                                    {renderSortIcon(column.key)}
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-6 py-4 text-center text-gray-500"
                                >
                                    لا توجد بيانات
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-gray-50">
                                    {columns.map((column) => (
                                        <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {column.render
                                                ? column.render(row[column.key], row)
                                                : row[column.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {showPagination && totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                        عرض {((currentPage - 1) * pageSize) + 1} إلى{' '}
                        {Math.min(currentPage * pageSize, sortedData.length)} من{' '}
                        {sortedData.length} نتيجة
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            السابق
                        </button>
                        <div className="flex gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-4 py-2 border rounded-lg ${currentPage === page
                                            ? 'bg-blue-500 text-white border-blue-500'
                                            : 'border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            التالي
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataTable;
