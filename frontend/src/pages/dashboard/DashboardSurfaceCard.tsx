import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Card } from "../../components/ui/card";

type Props = {
  children: ReactNode;
  className?: string;
  bordered?: boolean;
  padded?: boolean;
};

export default function DashboardSurfaceCard({
  children,
  className,
  bordered = false,
  padded = true,
}: Props) {
  return (
    <Card
      className={cn(
        "bg-white shadow-sm",
        bordered && "border",
        padded && "p-6",
        className,
      )}
    >
      {children}
    </Card>
  );
}
