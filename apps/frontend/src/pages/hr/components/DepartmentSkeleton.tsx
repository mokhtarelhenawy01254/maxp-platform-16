import React from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";

const DepartmentSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card
          key={i}
          className="animate-pulse border-none shadow-md bg-white/50 dark:bg-gray-900/50"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-800" />
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-5/6" />
            </div>
            <div className="h-12 bg-gray-100 dark:bg-gray-800/50 rounded-lg w-full" />
            <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex gap-4">
                <div className="w-8 h-10 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="w-8 h-10 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>
              <div className="w-16 h-6 bg-gray-200 dark:bg-gray-800 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DepartmentSkeleton;
