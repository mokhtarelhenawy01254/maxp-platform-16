# AI Key Manager 2026 Upgrade — خطة التطوير

> الهدف: تحويل SuperAdminAIKeyManager من CRUD بسيط إلى **لوحة تحكم كاملة لإدارة مفاتيح AI** بمعايير 2026

---

## Sprint 1: Dashboard Stats + Health Grid

### الهدف
بطاقة أداء متكاملة أعلى الصفحة + حالة كل مفتاح في لمحة.

### Backend (موجود بالفعل — لا حاجة لتعديل)
- `GET /admin/dashboard` — total_keys, active_keys, keys_by_provider, requests_today, failures_today, last_24h_success_rate
- `POST /admin/health` — batch health check لكل المفاتيح

### الملفات اللي هتتغير
| الملف | التعديل |
|-------|---------|
| `SuperAdminAIKeyManager.tsx` | إضافة StatsGrid (6 كروت بدل 3) + Health HeatMap |
| `useAiAdminData.ts` | إضافة `useAiDashboard()` hook |
| `useKeyMutations.ts` | إضافة `useHealthCheckKeys()` mutation |
| `aiAdminService.ts` | إضافة `getDashboard()` + `healthCheckKeys()` |
| `types/ai-admin.ts` | إضافة `DashboardStats`, `AiHealthResult` types |

### التفاصيل
- **StatsGrid**: 6 كروت — إجمالي المفاتيح, النشطة, المزودون, طلبات اليوم, الفاشل اليوم, نسبة النجاح (24h)
- **Health HeatMap**: Grid 4×N يعرض كل مفتاح كبطاقة صغيرة — provider badge + key name + health status ✅❌ + latency + آخر اختبار
- **Auto Health Check**: زر "فحص الكل" يستدعي `POST /admin/health` batch
- **Auto-refresh**: زر تحديث + poll كل 60 ثانية

---

## Sprint 2: Edit Key + Provider Priority + Global Config

### الهدف
تعديل المفاتيح + ترتيب أولوية المزودين + إعدادات عامة.

### Backend
- `PATCH /admin/keys/{key_id}` — موجود
- `POST /admin/provider-priority` — موجود
- `GET /admin/config` — موجود
- `PATCH /admin/config` — موجود

### الملفات اللي هتتغير
| الملف | التعديل |
|-------|---------|
| `SuperAdminAIKeyManager.tsx` | إضافة `EditKeyDialog` + `ProviderPriorityPanel` |
| `useKeyMutations.ts` | إضافة `useUpdateKey()`, `useSetProviderPriority()`, `useUpdateGlobalConfig()` |
| `aiAdminService.ts` | إضافة `updateKey()`, `setProviderPriority()`, `getGlobalConfig()`, `updateGlobalConfig()` |
| `types/ai-admin.ts` | إضافة `GlobalConfig`, `ProviderPriorityUpdate` |

### التفاصيل
- **EditKeyDialog**: تعديل name, models list, priority, max_requests_per_day, base_url, is_active — زر تعديل في كل صف
- **ProviderPriorityPanel**: Panel جانبي أو tab — drag & drop list للمزودين ↓ — زر حفظ
- **GlobalConfigSection**: default_provider selector + failover toggle + إظهار الـ settings JSON

---

## Sprint 3: Usage Monitoring + Key Detail

### الهدف
مراقبة استهلاك كل مفتاح + تفاصيل موسعة.

### Backend
- `GET /admin/logs` — logs لل key معين
- `AiKey.current_usage` + `max_requests_per_day` — موجودين في النموذج
- `GET /admin/keys/{key_id}` — تفاصيل key كاملة

### الملفات اللي هتتغير
| الملف | التعديل |
|-------|---------|
| `SuperAdminAIKeyManager.tsx` | إضافة `KeyDetailDrawer` + usage bars في الجدول |
| `useAiAdminData.ts` | إضافة `useAiKey(id)` hook |
| `useAiKeyLogs.ts` | إضافة فلترة بمعرف المفتاح |
| `types/ai-admin.ts` | إضافة `AiKeyDetail` (usage, last_used, models) |
| `aiAdminService.ts` | إضافة `getKey(id)` |

### التفاصيل
- **Usage Bar** في كل صف: `████████░░ 80%` — أخضر (<60%), أصفر (60-85%), أحمر (>85%)
- **KeyDetailDrawer**: Panel جانبي (Sheet) يظهر full key info + usage graph + آخر 20 log + models list مع enabled/disabled toggle
- **Near-limit warning**: Badge أحمر جنب المفتاح لما `current_usage / max_requests_per_day > 85%`

---

## Sprint 4: Bulk Operations + Mobile + Export

### الهدف
تحديد كمية + دعم الموبايل + تصدير.

### Backend
- `POST /admin/health` (batch) — موجود
- ما يحتاج backend جديد

### الملفات اللي هتتغير
| الملف | التعديل |
|-------|---------|
| `SuperAdminAIKeyManager.tsx` | إضافة selection checkboxes + bulk toolbar + mobile cards |
| `useKeyMutations.ts` | إضافة `useBulkToggleStatus()` |

### التفاصيل
- **Checkbox selection** في كل صف + checkbox في الـ header (select all)
- **Bulk toolbar**: يظهر عند تحديد 2+ keys — أزرار "تفعيل الكل", "إلغاء تفعيل الكل", "اختبار الكل", "حذف المحدد"
- **Mobile cards**: نفس pattern الـ `SuperAdminAIKeyLogs` — desktop Table, mobile card layout
- **Export CSV**: زر "تصدير" ينزل keys كـ CSV بنفس تنسيق logs
- **Sorting columns**: النقر على header ي sort (name, provider, status, usage)

---

## ملخص التغييرات

| Sprint | ملفات متأثرة | Backend جديد؟ | تعقيد |
|--------|-------------|---------------|-------|
| Sprint 1 | 5 files (frontend) | لا — موجود | ⭐⭐ |
| Sprint 2 | 4 files (frontend) | لا — موجود | ⭐⭐ |
| Sprint 3 | 4 files (frontend) | لا — موجود | ⭐⭐⭐ |
| Sprint 4 | 1 file (frontend) | لا | ⭐⭐ |

**المجموع:** 4 Sprints، zero backend changes (كل الـ endpoints موجودة)، كلها واجهة + hooks/types.

**ملاحظة:** Sprint 3 ممكن يندمج مع Sprint 1 لو عايز تقلل عدد الـ sprints.

---

## هيكل الملفات المتأثرة (Frontend فقط)

```
apps/frontend/src/
├── pages/super-admin/SuperAdminAIKeyManager.tsx   ← التعديل الرئيسي
├── hooks/useAiAdminData.ts                         ← إضافة hooks
├── hooks/useKeyMutations.ts                        ← إضافة mutations
├── hooks/useAiKeyLogs.ts                           ← إضافة فلترة
├── services/aiAdminService.ts                      ← إضافة APIs
└── types/ai-admin.ts                               ← إضافة types
```
