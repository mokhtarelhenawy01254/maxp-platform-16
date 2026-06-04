import React from 'react';
import { Card, CardContent, CardHeader } from '../../components/ui/card';

const ShiftsSkeleton: React.FC<{ viewMode?: 'grid' | 'table' }> = ({ viewMode = 'grid' }) => {
    if (viewMode === 'table') {
        return (
            <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-right"><div className="h-3 bg-gray-200 rounded w-16 animate-pulse" /></th>
                                    <th className="px-6 py-4 text-right"><div className="h-3 bg-gray-200 rounded w-24 animate-pulse" /></th>
                                    <th className="px-6 py-4 text-right"><div className="h-3 bg-gray-200 rounded w-16 animate-pulse" /></th>
                                    <th className="px-6 py-4 text-right"><div className="h-3 bg-gray-200 rounded w-16 animate-pulse" /></th>
                                    <th className="px-6 py-4 text-right"><div className="h-3 bg-gray-200 rounded w-12 animate-pulse" /></th>
                                    <th className="px-6 py-4 text-right"><div className="h-3 bg-gray-200 rounded w-16 animate-pulse" /></th>
                                    <th className="px-6 py-4 text-right"><div className="h-3 bg-gray-200 rounded w-12 animate-pulse" /></th>
                                    <th className="px-6 py-4 text-right"><div className="h-3 bg-gray-200 rounded w-20 animate-pulse" /></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {[...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-20 animate-pulse" /></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-gray-200 rounded w-32 animate-pulse" /></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-16 animate-pulse" /></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-16 animate-pulse" /></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-12 animate-pulse" /></td>
                                        <td className="px-6 py-5"><div className="h-5 bg-blue-50 rounded w-16 animate-pulse" /></td>
                                        <td className="px-6 py-5"><div className="h-5 bg-purple-50 rounded w-12 animate-pulse" /></td>
                                        <td className="px-6 py-5"><div className="h-8 bg-gray-100 rounded w-20 animate-pulse" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Grid view skeleton
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
                <Card key={i} className="border-none shadow-lg bg-white/70 backdrop-blur-md rounded-2xl overflow-hidden">
                    <div className="h-1.5 w-full bg-gray-100 animate-pulse" />
                    <CardHeader className="pb-2 pt-4">
                        <div className="flex items-center justify-between">
                            <div className="h-6 bg-gray-200 rounded-lg w-32 animate-pulse" />
                            <div className="h-6 bg-gray-100 rounded-full w-12 animate-pulse" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="h-3 bg-gray-100 rounded w-12 animate-pulse" />
                                <div className="h-6 bg-gray-50 rounded-xl w-24 animate-pulse" />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="h-3 bg-gray-100 rounded w-16 animate-pulse" />
                                <div className="h-6 bg-blue-50 rounded-lg w-16 animate-pulse" />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="h-3 bg-gray-100 rounded w-12 animate-pulse" />
                                <div className="h-6 bg-purple-50 rounded-lg w-12 animate-pulse" />
                            </div>
                            <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                <div className="h-8 bg-purple-50 rounded-xl w-24 animate-pulse" />
                                <div className="h-8 bg-gray-50 rounded-xl w-8 animate-pulse" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default ShiftsSkeleton;
