## Goal
إنشاء سيناريوهات اختبار شاملة للذكاء الاصطناعي، تشغيل الاختبارات، إصلاح المشاكل، والتأكد من أن النظام المركزي هو المسؤول عن مزود الذكاء الاصطناعي

## Done
- **إصلاح duplicate methods** في `testChatController.js`: 7 دوال مكررة (sendTestMessages, getTestResults, runQuickTest, analyzeAndFix, analyzeResults, runTestAndAnalyze, getProblems) — سبب خطأ `Failed to fetch dynamically imported module: AITestChat.tsx`
- **تشغيل الباك إند** على port 3007 مع PM2
- **إضافة 25 سيناريو اختبار** في 5 categories في testChatController.js:
  - الاستكشاف والشراء (5)
  - تكوين الطلب (5)
  - خدمة العملاء (5)
  - حالات صعبة (5)
  - التسويق والمبيعات (4)
- **إضافة routes**: GET `/api/v1/test-chat/test-questions`, GET `/api/v1/test-chat/central-provider-status`
- **توسيع `runQuickTest`** ليقبل `questions` (مصفوفة أسئلة مخصصة) و `scenarioIds` و `questionCount`
- **إضافة زر "فحص المزود المركزي"** في AITestChat.tsx
- **إصلاح Prisma model accessor**: `prisma.globalAIConfig` → `prisma.globalAiConfig` (كان بيرجع null)
- **تفعيل النظام المركزي**: GlobalAiConfig موجود وفعّال (isActive: true, enableFailover: true, defaultProvider: GOOGLE)
- **تغيير الموديل**: `gemma-4-31b-it` (503 error) → `gemini-2.5-flash`
- **إصلاح `runQuickTest`**: content كان يمرر object لل Prisma فكان يرمي `Invalid value provided. Expected String` — تم إصلاحه باستخراج `questionText` من الكائن
- **اختبار AI ناجح**: AI بيرد بالعربي، موديل `gemini-2.5-flash`، وقت معالجة ~2-3 ثانية

## Current Status
- **Backend**: ✅ PM2 running on port 3007
- **Vite frontend**: running on port 3001
- **النظام المركزي**: ✅ مفعّل، GOOGLE provider، failover enabled
- **AI model**: ✅ gemini-2.5-flash (يعمل)
- **المفاتيح**: ✅ AiKey نشط (GOOGLE)، AiModelConfig محدث
- **أسئلة الاختبار**: 25 سيناريو متاحة عبر API
- **runQuickTest**: ✅ يقبل أسئلة مخصصة وسيناريوهات محددة

## JWT Token للتجربة
`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbW85MHgyZm8wMTl6dnB1Y3RleXptOW4wIiwiaWQiOiJjbW85MHgyZm8wMTl6dnB1Y3RleXptOW4wIiwiY29tcGFueUlkIjoiY21vOTB4MmU5MDE5anZwdWNxZTNyM3BhbyIsInJvbGUiOiJPV05FUiIsImlhdCI6MTc3OTA0OTM5NCwiZXhwIjoxNzc5MDUyOTk0fQ.A1MqZpyCvbw5SU7XuTbbaRNigCMo1k9slkckR0Na0Sg`

## Relevant Files
- `backend/controller/testChatController.js`: AI_TEST_SCENARIOS, checkCentralProvider, runQuickTest, getTestQuestions
- `backend/routes/testChatRoutes.js`: /test-questions, /central-provider-status, /run-quick-test
- `frontend/src/services/testChatService.ts`: checkCentralProvider()
- `frontend/src/pages/testChat/AITestChat.tsx`: فحص المزود المركزي UI
- `backend/services/sharedDatabase.js`: deferred proxy لل Prisma
