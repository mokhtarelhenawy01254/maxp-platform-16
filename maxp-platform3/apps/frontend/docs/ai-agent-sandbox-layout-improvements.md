# AI Agent Sandbox Layout & Spacing Improvements

Documenting layout optimizations in the developer sandbox panel:
1. **Dynamic Layout & Height**: Adjusted calculation of container height (`h-[calc(100dvh-116px)]` on mobile / `h-[calc(100vh-100px)]` on desktop) and padding to maximize vertical chat viewport area.
2. **Mobile Sidebar Toggle**: Wired up dynamic toggles and session selectors in `HeaderBar` and bottom navigation to allow fluid navigation on small screens.
3. **Message Styles**: Refactored paragraph text wrapping (`pr-7`) and positioned the hover Copy button overlay cleanly (`top-2 end-2 z-10`).
4. **Stream Event Types**: Extended `StreamEvent` interface definition to support optional `compiledSystemPrompt` field.
