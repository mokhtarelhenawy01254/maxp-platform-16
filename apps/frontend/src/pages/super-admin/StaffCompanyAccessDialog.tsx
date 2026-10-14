import React from "react";
import { Building2, Plus, Search } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

export interface Company {
  id: string;
  name: string;
  slug: string;
}

interface StaffCompanyAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string;
  role: string;
  onRoleChange: (role: string) => void;
  companySearch: string;
  onCompanySearchChange: (search: string) => void;
  companies: Company[];
  submitting: boolean;
  onSelectCompany: (companyId: string) => void;
}

export const StaffCompanyAccessDialog: React.FC<StaffCompanyAccessDialogProps> = ({
  open,
  onOpenChange,
  userName,
  role,
  onRoleChange,
  companySearch,
  onCompanySearchChange,
  companies,
  submitting,
  onSelectCompany,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-bold">
            <Building2 className="size-4 text-primary" />
            <span>ربط {userName} بشركة جديدة</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              الدور داخل الشركة
            </label>
            <Select value={role} onValueChange={onRoleChange}>
              <SelectTrigger className="h-8 text-xs font-mono">
                <SelectValue placeholder="اختر الدور" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OWNER">مالك الشركة (Owner)</SelectItem>
                <SelectItem value="COMPANY_ADMIN">مدير الشركة (Admin)</SelectItem>
                <SelectItem value="MANAGER">مدير قسم (Manager)</SelectItem>
                <SelectItem value="AGENT">موظف عادي (Agent)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col h-[260px]">
            <label className="block text-xs font-medium text-foreground mb-1">
              اختر الشركة المستهدفة
            </label>
            <div className="relative mb-2">
              <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                className="h-8 pr-8 text-xs font-mono"
                placeholder="بحث عن اسم أو Slug..."
                value={companySearch}
                onChange={(e) => onCompanySearchChange(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto border border-border/80 rounded-lg divide-y divide-border/60">
              {companies.length > 0 ? (
                companies.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={submitting}
                    onClick={() => onSelectCompany(c.id)}
                    className="w-full flex items-center justify-between p-2 text-right hover:bg-muted/40 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-foreground truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">@{c.slug}</p>
                      </div>
                    </div>
                    <Plus className="size-3.5 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground text-xs font-mono">
                  لا توجد شركات تطابق البحث
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs font-mono">
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
