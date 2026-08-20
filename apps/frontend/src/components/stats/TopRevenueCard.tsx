import React, { useMemo } from 'react';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

interface TopRevenueCardProps {
    stats: any;
}

const TopRevenueCard: React.FC<TopRevenueCardProps> = ({ stats }) => {
    const topRevenueHour = useMemo(() => {
        if (!stats?.hourlyStats?.length) return null;
        return [...stats.hourlyStats].sort((a: any, b: any) => b.revenue - a.revenue)[0];
    }, [stats?.hourlyStats]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-gray-500 text-sm font-medium">ساعة الذروة (مبيعات)</h4>
                <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
            </div>
            {topRevenueHour && topRevenueHour.revenue > 0 ? (
                <div>
                    <p className="text-2xl font-bold text-gray-900 mb-1">
                        {topRevenueHour.hour === 0 ? '12:00 ص' : topRevenueHour.hour === 12 ? '12:00 م' : topRevenueHour.hour > 12 ? `${topRevenueHour.hour - 12}:00 م` : `${topRevenueHour.hour}:00 ص`}
                    </p>
                    <p className="text-sm text-green-600">
                        {topRevenueHour.revenue.toLocaleString()} ج.م
                        <span className="text-gray-400 mx-1">•</span>
                        الأعلى مبيعاً
                    </p>
                </div>
            ) : (
                <p className="text-gray-400 text-sm">لا توجد بيانات مبيعات</p>
            )}
        </div>
    );
};

export default TopRevenueCard;
