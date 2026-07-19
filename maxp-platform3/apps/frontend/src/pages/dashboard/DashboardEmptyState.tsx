import DashboardSurfaceCard from "./DashboardSurfaceCard";

type Props = {
  message: string;
  title: string;
};

export default function DashboardEmptyState({ message, title }: Props) {
  return (
    <DashboardSurfaceCard>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      </div>
    </DashboardSurfaceCard>
  );
}
