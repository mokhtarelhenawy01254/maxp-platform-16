import type { TopProductsPanelProps } from "./types";
import DashboardSurfaceCard from "./DashboardSurfaceCard";

export default function TopProductsPanel({
  emptyLabel,
  formatCount,
  items,
  itemsUnitLabel,
  title,
}: TopProductsPanelProps) {
  return (
    <DashboardSurfaceCard>
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((product, idx) => (
            <li
              key={product.name}
              className="flex items-center justify-between text-xs"
            >
              <span className="truncate">
                {idx + 1}. {product.name}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {formatCount(product.quantity)} {itemsUnitLabel}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardSurfaceCard>
  );
}
