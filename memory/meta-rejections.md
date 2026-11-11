# Meta App Review — actual rejection reasons (retrieved 2026-11-11)

Source: old app `762328696481583` (m2) → `/app-review/submissions/feedback/?submission_id=…`
Feedback URL pattern: `https://developers.facebook.com/apps/<APP>/app-review/submissions/feedback/?submission_id=<ID>`

## Submission 1057926676921782 — 27 Jul 2026 ❌
Permissions: `pages_read_engagement`, `Page Public Content Access`

**Reason (Dev Policy 1.6 — "تسجيل الشاشة غير متوافق مع تفاصيل حالة الاستخدام"):**
> The screencast fails to show the complete use case described in the submission notes.

**Reviewer notes (verbatim):**
> "Hello Team! In your submitted screencast, we were unable to verify your app reading page content or showcasing the retrieval of page engagement. Please re-record, ensuring the screencast clearly demonstrates: (1) **Page selection**, (2) **the retrieval of Page content such as posts, photos, videos, or events, and/or followers' profile pictures/names where permitted**, and (3) **the rendered results in your app's UI with the Page identity visibly displayed**."

Also demanded: full Meta login flow, a user granting the permission, **English app UI**, captions/tooltips, explain what each button does.

## Submission 904076698973448 — 14 Jul 2026 ❌
Permissions: `instagram_manage_messages`, `instagram_basic`

**Reason 1 — messaging screencast:**
> "the screencast does not show a message being sent from your app UI and the same message appearing in the native client (Messenger, Instagram, or WhatsApp). Please re-record showing: (1) **asset selection** (Page, account, or number visible), (2) **a live send action from your app**, and (3) **the delivered message in the native client**."

**Reason 2 — Privacy Policy URL (Platform Terms 4.a):**
> The URL must point **directly** to the privacy policy. Redirecting to the homepage or the login page is a **violation**. The page must be public and must identify the business/app it belongs to.

## Other rejections (same pattern, not opened)
- `899924396055345` — 5 Jan 2026: `pages_manage_posts`, `pages_read_engagement`
- `883787401002378` — 15 Dec 2025: `ads_read`
- `828639326517186` / `828556409858811` — older

## Pre-flight verified on MAXP (2026-11-11)
| URL | Renders | Notes |
|---|---|---|
| `https://maxp.online/privacy` | ✅ title «سياسة الخصوصية \| MaxP», 2597 chars, no login field | OK — direct, public, names MaxP |
| `https://maxp.online/terms` | ✅ «الشروط والأحكام \| MaxP» | OK |
| `https://maxp.online/data-deletion` | ✅ «حذف البيانات \| MaxP» | OK |

## What this means for the MAXP recordings
1. **Screencast must show the whole use case**, not just a screen.
2. For page-content permissions: show **Page selection → fetched posts/photos/videos → rendered results with the Page name visible**.
3. For messaging permissions: show **asset visible → send from MaxP → the same message in the native client** (Messenger/Instagram).
4. **English UI or English captions** — MaxP super-admin pages are only partially translated (i18n `fallbackLng: "ar"`), so captions are required.
5. Privacy/terms/data-deletion URLs are fine — no action needed.
