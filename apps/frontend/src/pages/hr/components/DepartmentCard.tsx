import React from "react";
import {
  Building2,
  Users,
  MoreVertical,
  UserCircle,
  Trash2,
  ChevronRight,
  Briefcase,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";

interface Department {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  color: string;
  isActive: boolean;
  sortOrder: number;
  parentId: string | null;
  managerId: string | null;
  manager: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
  } | null;
  parent: {
    id: string;
    name: string;
  } | null;
  _count: {
    users: number; // ✅ Changed from employees to users (employees are in User table)
    positions: number;
    children: number;
  };
}

interface DepartmentCardProps {
  department: Department;
  onViewDetails: (dept: Department) => void;
  onDelete: (dept: Department) => void;
  canManage: boolean;
}

const DepartmentCard: React.FC<DepartmentCardProps> = ({
  department,
  onViewDetails,
  onDelete,
  canManage,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className="group relative overflow-hidden h-full border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-100 dark:border-gray-800"
        onClick={() => onViewDetails(department)}
      >
        {/* Color Strip */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: department.color || "#3B82F6" }}
        />

        {/* Background Accent */}
        <div
          className="absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-5 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
          style={{ backgroundColor: department.color || "#3B82F6" }}
        />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-xl transition-colors"
                style={{
                  backgroundColor: `${department.color}15` || "#3B82F615",
                  color: department.color || "#3B82F6",
                }}
              >
                <Building2 className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                  {department.name}
                </CardTitle>
                {department.nameEn && (
                  <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
                    {department.nameEn}
                  </p>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(department);
                  }}
                >
                  <UserCircle className="h-4 w-4 ml-2" />
                  عرض التفاصيل
                </DropdownMenuItem>
                {canManage && (
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(department);
                    }}
                  >
                    <Trash2 className="h-4 w-4 ml-2" />
                    حذف القسم
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {department.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 min-h-[40px] leading-relaxed">
              {department.description}
            </p>
          )}

          <div className="grid grid-cols-1 gap-3">
            {/* Manager Info */}
            {department.manager ? (
              <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-gray-900">
                  <AvatarImage src={department.manager.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {department.manager.firstName?.[0]}
                    {department.manager.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                    مدير القسم
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-200">
                    {department.manager.firstName} {department.manager.lastName}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 opacity-60">
                <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <UserCircle className="h-4 w-4 text-gray-400" />
                </div>
                <span className="text-sm text-gray-400 italic">
                  بدون مدير معين
                </span>
              </div>
            )}

            {/* Parent Dept */}
            {department.parent && (
              <div className="flex items-center gap-2 px-1">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
                <span className="text-xs text-gray-500">جزء من:</span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold bg-gray-50 dark:bg-gray-800/50"
                >
                  {department.parent.name}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-primary">
                  <Users className="h-4 w-4" />
                  <span className="text-lg font-bold leading-none">
                    {department._count.users}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">
                  موظف
                </span>
              </div>

              <div className="w-px h-8 bg-gray-100 dark:bg-gray-800" />

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-orange-500">
                  <Briefcase className="h-4 w-4" />
                  <span className="text-lg font-bold leading-none">
                    {department._count.positions}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">
                  وظيفة
                </span>
              </div>

              {department._count.children > 0 && (
                <>
                  <div className="w-px h-8 bg-gray-100 dark:bg-gray-800" />
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 text-emerald-500">
                      <Activity className="h-4 w-4" />
                      <span className="text-lg font-bold leading-none">
                        {department._count.children}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">
                      قسم فرعي
                    </span>
                  </div>
                </>
              )}
            </div>

            <Badge
              variant={department.isActive ? "default" : "secondary"}
              className={`px-3 py-1 rounded-full text-xs font-bold ${department.isActive
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "bg-gray-200 dark:bg-gray-800 text-gray-500"
                }`}
            >
              {department.isActive ? "نشط" : "غير نشط"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DepartmentCard;
