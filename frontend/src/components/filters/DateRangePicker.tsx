import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
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

    const handleCustomDateChange = (dates: [Date | null, Date | null]) => {
        const [start, end] = dates;
        setStartDate(start);
        setEndDate(end);

        if (start && end) {
            onDateChange(start, end, 'custom');
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
                    <DatePicker
                        selectsRange
                        startDate={startDate}
                        endDate={endDate}
                        onChange={handleCustomDateChange}
                        placeholderText="اختر نطاق التاريخ"
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        dateFormat="yyyy/MM/dd"
                        maxDate={new Date()}
                    />
                </div>
            )}
        </div>
    );
};

export default DateRangePicker;
