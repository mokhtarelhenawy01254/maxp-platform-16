import React from "react";
import { Users, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Employee } from "./types";

interface PayrollEmployeeSidebarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loadingEmployees: boolean;
  filteredEmployees: Employee[];
  selectedEmployee: Employee | null;
  handleSelectEmployee: (emp: Employee) => void;
}

export const PayrollEmployeeSidebar: React.FC<PayrollEmployeeSidebarProps> = ({
  searchQuery,
  setSearchQuery,
  loadingEmployees,
  filteredEmployees,
  selectedEmployee,
  handleSelectEmployee,
}) => {
  return (
    <Card className="lg:w-80 flex flex-col shrink-0 rounded-2xl border border-border/70 bg-card shadow-xs">
      <CardHeader className="pb-3 border-b border-border/70 bg-muted/20">
        <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
          <Users className="h-4 w-4 text-primary" />
          اختيار موظف للاختبار
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث باسم أو رقم الموظف..."
            className="pr-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-[calc(100dvh-300px)]">
          {loadingEmployees ? (
            <div className="p-4 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-indigo-600 rounded-full border-t-transparent mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">
                جاري تحميل الموظفين...
              </p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500">
                لا يوجد موظفين مطابقين للبحث
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredEmployees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleSelectEmployee(emp)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    selectedEmployee?.id === emp.id
                      ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                      : "hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <Avatar className="h-10 w-10 border border-border/70">
                    <AvatarImage src={emp.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {emp.firstName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-right overflow-hidden">
                    <p className="font-bold text-sm truncate">
                      {emp.firstName} {emp.lastName}
                    </p>
                    <p
                      className={`text-xs ${
                        selectedEmployee?.id === emp.id ? "text-indigo-100" : "text-slate-500"
                      }`}
                    >
                      #{emp.employeeNumber} •{" "}
                      {emp.department?.name || "بدون قسم"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
