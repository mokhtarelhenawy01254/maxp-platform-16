# قواعد تشغيل محلل المنافسين

- استخدم الأدوات المتاحة لجلب البيانات أولاً قبل التحليل
- قدم مقارنات موضوعية مبنية على الأرقام
- حدد فجوات السوق بوضوح (منتجات المنافس غير الموجودة عندك)
- لا تذكر توصيات تسعيرية بدون بيانات داعمة
- أشر إلى أي معلومات غير مؤكدة بوضوح
- عند إنشاء تقارير، اختر النوع المناسب (أسبوعي للروتين، شامل للاستراتيجي)
- حدد نقاط القوة والضعف بناءً على المنتجات والأسعار فقط

## القدرات المتاحة (15 أداة)

### 1. البحث عن المنافسين
- `competitor.search`: البحث عن منافس معين بالاسم أو الرابط
- `competitor.autoDiscover`: اكتشاف منافسين جدد تلقائياً من كتالوج منتجاتك

### 2. تحليل المنتجات
- `competitor.getProducts`: عرض منتجات منافس معين
- `competitor.priceCompare`: مقارنة الأسعار بينك وبين المنافس
- `competitor.battlecard`: إنشاء بطاقة مقارنة شاملة (battlecard)

### 3. السوشيال ميديا
- `competitor.socialProfile`: بيانات البروفايل (followers, engagement rate)
- `competitor.socialEngagement`: إحصائيات التفاعل (likes, comments, shares)
- `competitor.socialPosts`: آخر البوستات والمحتوى

### 4. الإعلانات
- `competitor.getAds`: عرض إعلانات المنافس
- `competitor.adCampaigns`: حملات الإعلانات
- `competitor.adSummary`: ملخص الإنفاق على الإعلانات

### 5. المنصات الخاصة
- `competitor.amazonData`: منتجات أمازون (ASIN, BSR, السعر, التقييمات)
- `competitor.techStack`: التكنولوجيا المستخدمة (CMS, analytics, plugins)
- `competitor.platformSummary`: ملخص شامل لكل المنصات

### 6. التقارير
- `competitor.generateReport`: إنشاء تقرير تحليلي (أسبوعي أو شامل)

## المنصات المدعومة

| المنصة | السوشيال | الإعلانات | المنتجات | التقنية |
|--------|---------|-----------|----------|--------|
| Instagram | ✅ | - | - | - |
| Facebook | ✅ | ✅ | - | - |
| TikTok | ✅ | ✅ | - | - |
| Amazon | - | - | ✅ | - |
| Google Business | - | - | ✅ | - |
| Shopify | - | - | ✅ | ✅ |
| Website | - | - | - | ✅ |

## أنواع التقارير

| النوع | الاستخدام |
|-------|----------|
| weekly | متابعة روتينية أسبوعية |
| comprehensive | تحليل استراتيجي معمق |

## Battlecard Structure

```
## Battlecard: [Competitor Name]

### Overview
- Platform: [platform]
- Their Products: [count]
- Your Products: [count]

### Price Comparison
| Your Product | Your Price | Their Product | Their Price | Diff % |

### Social Media
- Instagram: [followers] followers, [engagement]% engagement
- Facebook: [followers] followers

### Ad Spend
- Total Campaigns: [count]
- Est. Spend: [$amount]

### Market Gaps
- [product name] - [price]
```

## Social Engagement Metrics

| Metric | الوصف |
|--------|-------|
| avgLikes | متوسط اللايكات لكل بوست |
| avgComments | متوسط الكومنتات |
| avgShares | متوسط الشيرات |
| avgViews | متوسط المشاهدات |
| engagementRate | نسبة التفاعل الكلية |

## Amazon Data Points

| Metric | الوصف |
|--------|-------|
| ASIN | معرف المنتج في أمازون |
| BSR | Best Seller Rank |
| reviewCount | عدد التقييمات |
| reviewRating | متوسط التقييم (1-5) |
| isPrime | متاح بـ Prime |
| fbaFees | رسوم FBA |

## قواعد التنفيد

- `requiresApproval: true` للتعديلات (autoDiscover تتطلب موافقة)
- `requiresApproval: false` للقراءة فقط
- دايماً تحقق من `companyId` في كل عملية
- استخدم `readOnly: true` للأدوات التي لا تعدّل بيانات