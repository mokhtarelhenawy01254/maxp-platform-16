import type { TopProductsPanelProps } from "./types";

export default function TopProductsPanel({
  emptyLabel,
  formatCount,
  items,
  itemsUnitLabel,
  title,
}: TopProductsPanelProps) {
  return (
    <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm" style={{ boxShadow: "0 28px 72px -48px rgba(7, 17, 32, 0.42)" }}>
      <h4 className="mb-3 text-sm font-semibold text-foreground">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((product, idx) => (
            <li key={product.name} className="flex items-center justify-between text-xs">
              <span className="truncate text-foreground/80">{idx + 1}. {product.name}</span>
              <span className="tabular-nums text-muted-foreground">{formatCount(product.quantity)} {itemsUnitLabel}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
