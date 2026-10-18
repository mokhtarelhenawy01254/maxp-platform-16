import React from "react";
import { User } from "lucide-react";

export interface OrderSourceCreatorRowProps {
  createdBy?: string;
  createdByName?: string;
  createdByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export const OrderSourceCreatorRow: React.FC<OrderSourceCreatorRowProps> = ({
  createdBy,
  createdByName,
  createdByUser,
}) => {
  if (!createdBy && !createdByName && !createdByUser) return null;

  return (
    <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg border border-border/60">
      <User className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-muted-foreground mb-0.5">
          أنشئ بواسطة
        </div>
        <div className="font-medium text-foreground">
          {createdByUser
            ? `${createdByUser.firstName} ${createdByUser.lastName}`
            : createdByName || "موظف"}
        </div>
        {createdByUser?.email && (
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {createdByUser.email}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderSourceCreatorRow;
