# Architecture Checklist

- Components are modular and small (no single giant JSX tree).
- Each component exports a `Readonly` props interface.
- Static strings, images, and lists live in `src/data/mockData.ts`.
- Business logic and event handlers are extracted into hooks when needed.
- Tailwind classes use theme tokens instead of hardcoded hex values.
