# Agent Development Guidelines

## Rule 1: No Hardcoded Customer-Facing Replies
All customer-facing chatbot replies (WhatsApp, Facebook Messenger, or any chat channel) **MUST** be generated dynamically by the LLM model. Never write inline Arabic or English template strings for customer replies.

### What this means:
- ❌ ``return `المنتج ${name} متاح مقاس ${size}` ``
- ❌ `return 'Sorry, product not found'`
- ✅ Pass structured tool results to `generateWithLLMResult()` and let the model write the reply

### Why:
- The LLM adapts to the customer's dialect, tone, and context
- Hardcoded strings break when the language or channel changes
- Deterministic replies feel robotic and cannot be improved without code changes

## Rule 2: System/Merchant UI Strings Must Use i18n
All merchant-facing labels (statuses, notifications, error messages) **MUST** use the `i18n` translation system.

### Backend:
```js
const { t } = require('./aiAgent/i18n');
// ✅ Use translation keys
const label = t('task.status.COMPLETED');
// ❌ Never hardcode
const label = 'مكتمل';
```

### Frontend:
```typescript
import i18n from '../i18n';
// ✅ Use translation keys
const msg = i18n.t('errorHandler.network');
// ❌ Never hardcode
const msg = 'حدث خطأ في الاتصال';
```

## Rule 3: Tool Outputs Return Machine-Readable Data
Tool handlers in `agentToolRegistry.js` must return **English enum keys** and **English JSON keys**, never Arabic text.

### Examples:
```js
// ✅ Good: English keys
return { status: 'AVAILABLE', orderNumber: '12345', customerName: 'Ahmed' };

// ❌ Bad: Arabic keys
return { الحالة: 'متوفر', رقم: '12345', العميل: 'أحمد' };
```

The LLM prompt will translate these keys into the appropriate customer-facing language.

## Rule 4: Structured Data, Not Template Strings
When a tool returns structured data (order details, inventory status, shipping rates), pass the raw JSON to the LLM context. Do NOT pre-format it into a human-readable string.

```js
// ✅ Good: Pass raw data
const toolContext = JSON.stringify(result, null, 2);
llmResult = await this.generateWithLLMResult([
  { role: 'user', content: `[Tool Result]\n${toolContext}\n[/Tool Result]\nGenerate a reply...` }
]);

// ❌ Bad: Pre-format into a template
const reply = `الطلب رقم ${order.id} حالته ${order.status} والإجمالي ${order.total} جنيه`;
```

## Rule 5: Prevention Tooling
- Run `node scripts/check-arabic-strings.js` before committing to catch any new hardcoded Arabic strings
- The script scans `.js` and `.ts` source files (excluding translation JSON files and node_modules)
- Any flagged strings must be either moved to i18n or replaced with LLM generation

## Rule 6: Customer Intent Must Be Model-Classified
Customer chat channels (Facebook Messenger, WhatsApp, and similar live customer conversations) **MUST NOT** use keyword lists, regex routing, or fallback parsers to decide intent or extract action slots.

### What this means:
- ❌ Do not route a customer message to `support.refund` because it contains `refund`, `return`, or any equivalent phrase
- ❌ Do not route a customer message to `shipping.rates` because it contains `shipping` or `delivery`
- ❌ Do not repair a missed customer tool call with local regex extraction
- ✅ Use the structured LLM intent classifier and its schema output
- ✅ If classification is unavailable or ambiguous, disable tool execution for that turn and let the LLM ask a natural clarification

### Allowed deterministic checks:
- Channel gating, tenant isolation, tool allowlists, approval rules, policy validation, and output guardrails
- Format validation after the model has already selected the intent, such as validating that a phone number looks valid

### Prevention tooling:
- Run `npm run check:customer-intent` from `backend/` before committing customer-intent changes
- The Jest architecture guard also runs this check to prevent future keyword/regex fallback regressions
