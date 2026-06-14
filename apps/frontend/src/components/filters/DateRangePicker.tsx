import React, { useState } from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';

interface DateRangePickerProps {
    onDateChange: (startDate: Date | null, endDate: Date | null, period: string) => void;
    initialPeriod?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
    onDateChange,
    initialPeriod = '1d',
}) => {
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod);
    const [showCustom, setShowCustom] = useState(false);

    const quickFilters = [
        { label: 'اليوم', value: '1d' },
        { label: 'بالأمس', value: 'yesterday' },
        { label: 'آخر 7 أيام', value: '7d' },
        { label: 'آخر 30 يوم', value: '30d' },
        { label: 'آخر 90 يوم', value: '90d' },
        { label: 'مخصص', value: 'custom' },
    ];

    const handleQuickFilter = (period: string) => {
        setSelectedPeriod(period);

        if (period === 'custom') {
            setShowCustom(true);
            return;
        }

        setShowCustom(false);
        setStartDate(null);
        setEndDate(null);
        onDateChange(null, null, period);
    };

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = e.target.value ? new Date(e.target.value) : null;
        setStartDate(date);
        if (date && endDate) {
            onDateChange(date, endDate, 'custom');
        }
    };

    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = e.target.value ? new Date(e.target.value) : null;
        setEndDate(date);
        if (startDate && date) {
            onDateChange(startDate, date, 'custom');
        }
    };

    return (
        <div className="space-y-4">
            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
                {quickFilters.map((filter) => (
                    <button
                        key={filter.value}
                        onClick={() => handleQuickFilter(filter.value)}
                        className={`px-4 py-2 rounded-lg border transition-colors ${selectedPeriod === filter.value
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Custom Date Range Picker */}
            {showCustom && (
                <div className="flex items-center gap-2 p-4 border border-gray-300 rounded-lg bg-white">
                    <CalendarIcon className="w-5 h-5 text-gray-400" />
                    <input
                        type="date"
                        value={startDate ? startDate.toISOString().split('T')[0] : ''}
                        onChange={handleStartDateChange}
                        max={new Date().toISOString().split('T')[0]}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="من"
                    />
                    <span className="text-gray-500">إلى</span>
                    <input
                        type="date"
                        value={endDate ? endDate.toISOString().split('T')[0] : ''}
                        onChange={handleEndDateChange}
                        min={startDate ? startDate.toISOString().split('T')[0] : undefined}
                        max={new Date().toISOString().split('T')[0]}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="إلى"
                    />
                </div>
            )}
        </div>
    );
};

export default DateRangePicker;
