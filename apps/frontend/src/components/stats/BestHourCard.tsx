import React, { useMemo } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

interface BestHourCardProps {
    stats: any;
}

const BestHourCard: React.FC<BestHourCardProps> = ({ stats }) => {
    const bestHour = useMemo(() => {
        if (!stats?.hourlyStats?.length) return null;
        return [...stats.hourlyStats].sort((a: any, b: any) => b.saved - a.saved)[0];
    }, [stats?.hourlyStats]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-gray-500 text-sm font-medium">أفضل وقت للإرسال</h4>
                <ClockIcon className="w-5 h-5 text-blue-500" />
            </div>
            {bestHour ? (
                <div>
                    <p className="text-2xl font-bold text-gray-900 mb-1">
                        {bestHour.hour === 0 ? '12:00 ص' : bestHour.hour === 12 ? '12:00 م' : bestHour.hour > 12 ? `${bestHour.hour - 12}:00 م` : `${bestHour.hour}:00 ص`}
                    </p>
                    <p className="text-sm text-green-600">
                        {bestHour.saved} رسالة محفوظة
                        <span className="text-gray-400 mx-1">•</span>
                        الأعلى حفظاً للرسائل
                    </p>
                </div>
            ) : (
                <p className="text-gray-400 text-sm">لا توجد بيانات كافية</p>
            )}
        </div>
    );
};

export default BestHourCard;
