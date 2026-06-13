export function ActivationItemRow({ children, takeFullWidth }) {
  return (
    <div className="py-4 border-b border-border/20 last:border-b-0">
      <div className={`flex flex-col gap-3 ${takeFullWidth ? '' : 'sm:flex-row sm:items-start sm:justify-between'}`}>
        {children}
      </div>
    </div>
  )
}
