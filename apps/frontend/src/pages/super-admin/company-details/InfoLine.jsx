import { ExternalLink } from "lucide-react"

function InfoLineInner({ icon: Icon, children, asLink }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
      <Icon className="size-4 shrink-0 text-primary/80" />
      <span className="truncate">{children}</span>
      {asLink ? <ExternalLink className="size-3.5 shrink-0 opacity-70" /> : null}
    </span>
  )
}

export function InfoLine({ icon, children, asLink, href }) {
  if (asLink && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-w-0 hover:text-primary"
      >
        <InfoLineInner icon={icon} asLink>{children}</InfoLineInner>
      </a>
    )
  }

  return <InfoLineInner icon={icon}>{children}</InfoLineInner>
}
