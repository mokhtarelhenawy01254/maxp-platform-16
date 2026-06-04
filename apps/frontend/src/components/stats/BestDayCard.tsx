import React, { useMemo } from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

interface BestDayCardProps {
    stats: any;
}

const BestDayCard: React.FC<BestDayCardProps> = ({ stats }) => {
    const bestDay = useMemo(() => {
        if (!stats?.weekdayStats?.length) return null;
        return [...stats.weekdayStats].sort((a: any, b: any) => b.count - a.count)[0];
    }, [stats?.weekdayStats]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-gray-500 text-sm font-medium">أفضل يوم</h4>
                <CalendarDaysIcon className="w-5 h-5 text-purple-500" />
            </div>
            {bestDay ? (
                <div>
                    <p className="text-2xl font-bold text-gray-900 mb-1">
                        {bestDay.dayName || 'غير محدد'}
                    </p>
                    <p className="text-sm text-purple-600">
                        {bestDay.count} رسالة مرسلة
                        <span className="text-gray-400 mx-1">•</span>
                        الأكثر نشاطاً
                    </p>
                </div>
            ) : (
                <p className="text-gray-400 text-sm">لا توجد بيانات كافية</p>
            )}
        </div>
    );
};

export default BestDayCard;
