# Legacy WhatsApp Chat Task Button - 2026-06-01

## Summary

Added a Task button (ClipboardList icon) to the legacy WhatsApp chat (`/whatsapp` route) action toolbar, positioned directly after the existing ShoppingCart order button. Clicking it opens `TasksModal`, which embeds the full Tasks page via `<Tasks embeddedInModal />`.

## Architecture

```
WhatsAppChat (legacy)
  └─ ChatWindow
       └─ Button (ClipboardList icon, variant="ghost", size="icon-sm")
            └─ onClick → setShowTasksModal(true)
                 └─ TasksModal
                      └─ <Tasks embeddedInModal />
```

## What Changed

### `frontend/src/pages/whatsapp/WhatsAppChat.tsx`
- Added `import TasksModal from '../../components/facebook-inbox/Modals/TasksModal'`
- Added `const [showTasksModal, setShowTasksModal] = useState(false)`
- Passed `onOpenTasks={() => setShowTasksModal(true)}` to `ChatWindow`
- Rendered `<TasksModal isOpen={showTasksModal} onClose={...} />` after `QuickOrderModal`

### `frontend/src/pages/whatsapp/components/ChatWindow.tsx`
- Added `ClipboardList` to lucide-react imports
- Added optional `onOpenTasks?: () => void` to `ChatWindowProps`
- Destructured `onOpenTasks` in component
- Added conditional button (rendered only when `onOpenTasks` is provided):
  ```tsx
  {onOpenTasks && (
    <Button variant="ghost" size="icon-sm" className="rounded-full"
            onClick={onOpenTasks} title={t("whatsapp.tooltips.task")}>
      <ClipboardList className="size-4" />
    </Button>
  )}
  ```

### Locales
- Added `"task": "Tasks"` to `frontend/src/locales/en/sections/whatsapp.json` under `tooltips`
- Added `"task": "المهام"` to `frontend/src/locales/ar/sections/whatsapp.json` under `tooltips`
- Merged via `i18n:merge` into main `translation.json`

## Design Decisions

- **Same button pattern as order button**: Uses `variant="ghost" size="icon-sm" className="rounded-full"` — identical to the existing ShoppingCart order button
- **Conditional rendering via optional prop**: The `onOpenTasks` prop is optional (`?`), so `ChatWindow` remains backward compatible with any other usage site that doesn't pass it
- **Reuses existing TasksModal**: No new modal component; reuses the same `TasksModal` that wraps `<Tasks embeddedInModal />`
- **i18n for tooltip**: Uses `t("whatsapp.tooltips.task")` with English and Arabic translation keys, consistent with existing tooltips like `whatsapp.tooltips.order`

## Testing

- Lint passed: `npx eslint src/pages/whatsapp/WhatsAppChat.tsx src/pages/whatsapp/components/ChatWindow.tsx`
- i18n keys verified in both EN and AR translation files
- Arabic strings check: no new violations in frontend source files
- Build verified: `vite build` (no errors)
