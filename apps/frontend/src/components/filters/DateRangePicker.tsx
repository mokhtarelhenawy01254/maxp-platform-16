import React, { useState } from 'react';
import { Calendar, ArrowLeft } from 'lucide-react';

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
    <div className="space-y-2.5">
      {/* Quick Filters Single-Surface Segmented Row */}
      <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border/70 bg-card p-1 shadow-none">
        {quickFilters.map((filter) => {
          const isSelected = selectedPeriod === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => handleQuickFilter(filter.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Range Picker */}
      {showCustom && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border/70 bg-card p-3 shadow-none">
          <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Calendar className="size-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate ? startDate.toISOString().split('T')[0] : ''}
              onChange={handleStartDateChange}
              max={new Date().toISOString().split('T')[0]}
              className="h-8 rounded-lg border border-border/70 bg-background px-2.5 font-mono text-xs text-foreground tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="من"
              aria-label="من تاريخ"
            />
            <ArrowLeft className="size-3.5 text-muted-foreground/60" />
            <input
              type="date"
              value={endDate ? endDate.toISOString().split('T')[0] : ''}
              onChange={handleEndDateChange}
              min={startDate ? startDate.toISOString().split('T')[0] : undefined}
              max={new Date().toISOString().split('T')[0]}
              className="h-8 rounded-lg border border-border/70 bg-background px-2.5 font-mono text-xs text-foreground tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="إلى"
              aria-label="إلى تاريخ"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
