import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

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
    <div className="space-y-3">
      {/* Quick Filters */}
      <div className="flex flex-wrap gap-1.5">
        {quickFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => handleQuickFilter(filter.value)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
              selectedPeriod === filter.value
                ? 'bg-primary/10 text-primary border-primary ring-1 ring-primary'
                : 'bg-card text-foreground border-border/70 hover:bg-muted/50'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range Picker */}
      {showCustom && (
        <div className="flex items-center flex-wrap gap-2 p-3 border border-border/70 rounded-xl bg-card shadow-xs">
          <Calendar className="w-4 h-4 text-primary shrink-0" />
          <input
            type="date"
            value={startDate ? startDate.toISOString().split('T')[0] : ''}
            onChange={handleStartDateChange}
            max={new Date().toISOString().split('T')[0]}
            className="px-3 py-1.5 border border-border/70 rounded-lg bg-card text-xs font-mono text-foreground focus:ring-1 focus:ring-primary focus:border-primary"
            placeholder="من"
          />
          <span className="text-muted-foreground text-xs font-medium">إلى</span>
          <input
            type="date"
            value={endDate ? endDate.toISOString().split('T')[0] : ''}
            onChange={handleEndDateChange}
            min={startDate ? startDate.toISOString().split('T')[0] : undefined}
            max={new Date().toISOString().split('T')[0]}
            className="px-3 py-1.5 border border-border/70 rounded-lg bg-card text-xs font-mono text-foreground focus:ring-1 focus:ring-primary focus:border-primary"
            placeholder="إلى"
          />
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
