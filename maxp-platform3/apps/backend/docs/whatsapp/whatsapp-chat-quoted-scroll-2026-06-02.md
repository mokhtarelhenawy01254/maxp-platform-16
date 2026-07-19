# WhatsApp Chat Quoted Message Scroll & Highlight - 2026-06-02

## Summary

Implemented WhatsApp Web-style "click on reply/quoted message preview → scroll to and highlight the original message" feature. Clicking any quoted preview now smoothly scrolls to the target message and applies a green ring highlight animation, matching WhatsApp Web behavior.

## Architecture

```
WhatsAppChat (state: highlightedMessageId)
  └─ ChatWindow (passes onQuotedMessageClick, highlightedMessageId)
       └─ MessageBubble (clickable .quoted-preview div)
            ├─ onClick → handleScrollToMessage(quotedMessageId)
            ├─ highlighted={messageId === highlightedMessageId}
            │    └─ applies CSS class "wa-highlight"
            └─ title={t("whatsapp.window.goToMessage")}
```

### Scroll & Load Flow

```
User clicks quoted preview
  └─ handleScrollToMessage(targetId)
       ├─ Find index in visibleMessages[]
       ├─ Found? → virtualizer.scrollToIndex(index, { align: 'center' })
       │             └─ setHighlightedMessageId(targetId)
       │             └─ clear highlight after 3s timeout
       └─ Not found & hasMoreMessages?
            ├─ Set pendingScrollMessageIdRef
            ├─ isSearchingForMessageRef = true
            └─ fetchNextMessagesPage()
                 └─ on new page loaded → useEffect detects target
                      ├─ found → scrollToIndex + highlight
                      └─ not found & hasMore → fetch again
```

## Files Changed

| File | Change |
|---|---|
| `frontend/src/pages/whatsapp/WhatsAppChat.tsx` | Added `highlightedMessageId` state, `pendingScrollMessageIdRef`, `isSearchingForMessageRef`, `handleScrollToMessage` callback, auto-loading `useEffect` for pending targets |
| `frontend/src/pages/whatsapp/components/ChatWindow.tsx` | Added `onQuotedMessageClick` and `highlightedMessageId` props, passed through to `MessageBubble` |
| `frontend/src/pages/whatsapp/components/MessageBubble.tsx` | Added clickable quoted preview (`cursor-pointer`, hover effect), `onQuotedMessageClick` handler, `wa-highlight` class when highlighted, `title` tooltip via i18n, fallback `t("whatsapp.window.message")` when `quotedContent` is null |
| `frontend/src/styles/animations.css` | Added `@keyframes wa-highlight` — green box-shadow ring pulse animation lasting 2.5s with fade-out |
| `frontend/src/locales/en/sections/whatsapp.json` | Added `whatsapp.window.goToMessage` key ("Go to message") |
| `frontend/src/locales/ar/sections/whatsapp.json` | Added `whatsapp.window.goToMessage` key ("الانتقال للرسالة") |

## Key Decisions

- **`virtualizer.scrollToIndex()` directly**: The virtualizer is already exposed from `useVirtualMessages`; no need to wrap it.
- **CSS highlight via `box-shadow`**: A green-tinted ring animation (matches WhatsApp Web) that fades over 2.5s. Applied via CSS class `wa-highlight` on the message bubble's outer div.
- **Pending scroll via React ref + useEffect**: When the target message isn't loaded yet, a ref stores the pending ID. A `useEffect` watches `visibleMessages` changes — when the target appears (e.g., after fetching more pages), it triggers scroll + highlight.
- **Generic fallback for media quoted previews**: Uses `t("whatsapp.window.message")` when `quotedContent` is null instead of a switch on `messageType`. Matches WhatsApp Web's "Message" default for non-text quoted replies.
- **No `loadingMessages` dependency**: Removed from `useCallback` deps to avoid unnecessary recreations; only `hasMoreMessages` is checked before triggering `fetchNextMessagesPage`.

## Testing Scenarios

- Recent text message reply → scrolls to visible target + highlight
- Old message reply (needs pagination) → loads more pages, scrolls + highlight  
- Image/video quoted preview → fallback label "Message", scroll works
- File/audio quoted → same as image
- Link message quoted → scroll + highlight works
- Very long chat (500+ messages deep) → sequential page loads until target found
- Highlight auto-clears after 3 seconds
- No performance impact on virtual scrolling or chat rendering
