# Design

## Theme

Light, airy, business-credible interface. Arabic-first RTL. Soft gradient glow on hero surfaces, otherwise restrained color usage. The surface should feel calm and focused because users are creating campaign assets in a workflow, not exploring a playground.

## Color

Restrained palette anchored to existing MaxP tokens.

- **Primary**: `#2f6bff` — interactive emphasis, active tab underline, generate button.
- **Secondary**: `#22c7c9` — accents and success-adjacent highlights.
- **Background**: `#f4f8fc` — page canvas.
- **Surface**: `#ffffff` with subtle translucency — cards, panels, hero.
- **Foreground**: `#0f1b2d` — headings and body.
- **Muted**: `#dce6f1` — secondary backgrounds, borders.
- **Muted-foreground**: `#647991` — captions, placeholders, secondary labels.
- **Destructive**: `#ef4444` — destructive actions and errors.
- **Success**: `#14b87a` — success alerts and confirmations.

Neutrals are tinted toward the primary blue hue to avoid cold gray.

## Typography

- **Headings**: `"Cairo", "Geist Variable", sans-serif` — weight 700-900.
- **Body**: `"Manrope", "Geist Variable", sans-serif` — weight 400-600.
- **Mono**: system monospace for JSON/debug output.
- **Scale**: page title `text-3xl font-extrabold`, card title `text-lg font-bold`, labels `text-sm font-medium`, helper text `text-xs text-muted-foreground`.
- **Line length**: body/helper text capped around `70ch`.

## Spacing & Layout

- Page shell uses rounded-3xl white card on muted background, `dir="rtl"`, `text-right`.
- Hero padding `px-6 py-7`; sections use `p-5` or `p-6`.
- Form fields grouped in cards with `space-y-4` or `space-y-6`; two-column grid on `md:` for related fields.
- Tabs list is compact, line variant, right-aligned in RTL context, with active underline in primary.

## Components

- **Cards**: rounded-2xl, white/80, soft border and shadow. Avoid nested cards.
- **Inputs**: `bg-white dark:bg-gray-900`, rounded-md, focus ring primary.
- **Selects**: shadcn/ui select with `dir="rtl"` trigger and scrollable content.
- **Buttons**: Primary for generate; outline/ghost for secondary actions.
- **Color pickers**: native input wrapped in a 40px rounded swatch next to a mono hex input.
- **Status alert**: inline alert with icon, title, dismiss button.
- **Empty state**: dashed border panel, muted icon, helpful caption.

## Motion

- Ease-out transitions `200ms`.
- No layout animation; use opacity/transform only for loaders and hover overlays.
- Reduced-motion media query disables transitions.

## Accessibility

- All form controls labeled.
- Keyboard navigation through tabs and selects.
- `aria-live="polite"` for status messages.
- Sufficient contrast for primary actions (AA).
