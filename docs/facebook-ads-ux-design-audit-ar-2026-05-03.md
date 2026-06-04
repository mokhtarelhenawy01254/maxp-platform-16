# تقرير مراجعة تجربة المستخدم والتصميم - Meta Ads

التاريخ: 2026-05-03  
النطاق: صفحات وأدوات إعلانات فيسبوك داخل لوحة MaxP، خصوصا Dashboard وProduct Launch وCreate Ad Wizard وAccount Context.

## الخلاصة التنفيذية

الجزء الحالي فيه أساس وظيفي جيد، لكنه غير منظم بما يكفي لاستخدام Media Buyer بثقة في بيئة إنتاج. المشكلة ليست فقط أن الشكل ضعيف، بل أن تجربة المستخدم لا تقود المستخدم في تسلسل واضح: اختيار Business، ثم Ad Account، ثم Page/Pixel، ثم المنتج، ثم الجمهور، ثم الكريتيف، ثم مراجعة نهائية آمنة قبل إرسال أي شيء إلى Meta.

النتيجة أن المستخدم يشعر أن الحسابات والحملات متداخلة، وأن الصفحة لا تفرّق بصريا بين الحسابات، وأن قرار إنشاء إعلان حقيقي فيه مخاطرة أعلى من اللازم.

## مصادر المراجعة

- فحص كود الواجهة الحالي داخل `frontend/src/pages/advertising` و`frontend/src/components/advertising`.
- مقارنة عامة مع مبادئ واجهات الويب الحديثة من Vercel Web Interface Guidelines: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
- سيناريو العمل الحقيقي المطلوب: منتج Swan، حساب Swan الإعلاني، Pixel `maxp-swan`، وميزانيات 100/200 جنيه.

## أهم نقاط الضعف

### 1. لا يوجد فصل بصري وتنظيمي كاف بين Business وAd Account وCampaign

الأثر: المستخدم يرى حملات كثيرة ويشعر أنها مختلطة من حسابات مختلفة، حتى لو البيانات فنيا جاءت من الحساب المختار.

الأدلة:
- `frontend/src/components/advertising/FacebookAdsAccountContextPanel.tsx:184-236` يعرض الحسابات داخل native select مع optgroup، وهذا أفضل من قائمة مسطحة، لكنه ليس تجربة Business Manager واضحة.
- `frontend/src/pages/advertising/CreateAdWizard.tsx:1575-1607` يعرض الحسابات في الـWizard بشكل أقرب لقائمة مسطحة، فيرجع نفس الالتباس داخل أهم خطوة.
- `frontend/src/pages/advertising/FacebookAdsDashboard.tsx:985-1007` يعرض account داخل صف الحملة، لكنه ليس محور تنظيم الصفحة.

المطلوب:
- تجربة واضحة: Business Portfolio -> Ad Account -> Campaigns -> Ad Sets -> Ads.
- اختيار Business أولا، ثم عرض حساباته فقط.
- منع عرض الحملات قبل تثبيت الحساب المختار.
- إظهار breadcrumbs ثابتة أعلى كل صفحة: Business / Ad Account / Page / Pixel.

### 2. الـWizard قد يختار أول حساب متاح إذا لم يجد الحساب المطلوب

الأثر: خطر عملي كبير، لأن إعلان حقيقي ممكن يتجه لحساب إعلاني غير المقصود إذا المستخدم دخل من رابط أو جلسة فيها سياق ناقص.

الأدلة:
- `frontend/src/pages/advertising/CreateAdWizard.tsx:1160-1207` يحتوي fallback لاختيار أول حساب remote إذا لا يوجد حساب saved/active مطابق.

المطلوب:
- إلغاء auto-select لأول حساب remote.
- إذا الحساب المطلوب غير موجود أو غير نشط، نوقف المستخدم ونطلب اختيار واضح.
- إضافة رسالة قوية: "لن يتم إنشاء إعلان قبل اختيار حساب Swan وتأكيده".

### 3. لا يوجد تأكيد نهائي قوي قبل إرسال إعلان حقيقي إلى Meta

الأثر: إنشاء إعلان على Ads Manager هو إجراء مالي خارجي. حاليا الزر النهائي يرسل الطلب مباشرة بعد validation، وهذا غير كاف لإنتاج.

الأدلة:
- `frontend/src/pages/advertising/CreateAdWizard.tsx:1246-1352` ينفذ `createFullAd`.
- `frontend/src/pages/advertising/CreateAdWizard.tsx:3662-3690` يتيح اختيار `ACTIVE` أو `PAUSED`.
- `frontend/src/pages/advertising/CreateAdWizard.tsx:3825-3827` الزر النهائي يعتمد على submit مباشر بدون modal تأكيد مفصل.

المطلوب:
- Review & Confirm modal قبل الإرسال.
- يعرض: Business، Ad Account، Page، Pixel، المنتج، الميزانية، الحالة، الصور، الجمهور، placements.
- Require checkbox أو كتابة اسم الحساب/المنتج للتأكيد.
- الوضع الافتراضي يجب أن يكون `PAUSED`، وتفعيل `ACTIVE` يحتاج تأكيد إضافي.

### 4. Product Launch لا يعمل كـScenario Builder كامل

الأثر: الصفحة تبدو كصفحة عرض أو preflight، لكنها لا تنهي السيناريو. المستخدم يدخل المنتج والميزانية، ثم ينتقل إلى Wizard كبير ومختلف بصريا ووظيفيا.

الأدلة:
- `frontend/src/pages/advertising/FacebookAdsProductLaunch.tsx:361-681` تعرض المنتج والصور والخطة، لكنها لا تسمح ببناء الجمهور والكريتيف والمراجعة النهائية داخل نفس التدفق.
- `frontend/src/pages/advertising/FacebookAdsProductLaunch.tsx:576-607` خطة Media Buyer ثابتة أكثر من كونها اختيارات قابلة للتنفيذ.
- `frontend/src/pages/advertising/FacebookAdsProductLaunch.tsx:609-643` نصوص الإعلان معروضة كاقتراحات، لكنها ليست قابلة للتحرير أو الإرسال مباشرة.

المطلوب:
- تحويل Product Launch إلى Studio كامل:
- Step 1: URL المنتج وجلب البيانات.
- Step 2: حساب/صفحة/Pixel.
- Step 3: الصور والكروت.
- Step 4: الجمهور والمواقع.
- Step 5: النصوص والـCTA.
- Step 6: مراجعة وتأكيد ثم إرسال كـPAUSED.

### 5. التصميم غير موحد بين الصفحات

الأثر: المستخدم يشعر أن كل صفحة من منتج مختلف. هذا يقلل الثقة، خصوصا في أداة تدير ميزانية إعلانية.

الأدلة:
- `frontend/src/pages/advertising/FacebookAdsDashboard.tsx:504-580` يستخدم slate/blue dashboard style.
- `frontend/src/pages/advertising/FacebookAdsProductLaunch.tsx:361-482` يستخدم stone/amber editorial hero.
- `frontend/src/pages/advertising/CreateAdWizard.tsx:1451-1880` يستخدم خليط gray/blue/green/purple cards.
- `frontend/src/components/advertising/FacebookAdsModuleNav.tsx:19-61` يستخدم English labels داخل تجربة عربية.

المطلوب:
- Design system واحد لقسم Meta Ads.
- Light-first operational dashboard style، متوافق مع shell الحالي الأزرق/cyan.
- ألوان ثابتة للحالات:
- أخضر: Active/Delivering.
- أصفر: Paused/Pending/Learning.
- أحمر: Rejected/Issues.
- رمادي: Draft/Archived.
- استخدام نفس card style، typography، spacing، badges، buttons في كل الصفحات.

### 6. Navigation مشتت بين Sidebar وModule Nav

الأثر: المستخدم لا يعرف أين يجد التقارير، الحملات، Product Launch، Account Health. يوجد تكرار ومسارات لا تظهر بنفس الطريقة في كل مكان.

الأدلة:
- `frontend/src/components/advertising/FacebookAdsModuleNav.tsx:19-61` يعرض: Overview, Account Health, Product Launch, Campaigns, Reports, Audiences, Creative Library.
- `frontend/src/config/sidebar.ts:586-592` يعرض صفحات مختلفة نسبيا: Facebook Ads, Account Health, Product Launch, Reports, Tests, Audiences, Catalogs.

المطلوب:
- Sidebar يعرض الأقسام الرئيسية فقط.
- داخل Meta Ads يوجد sub-navigation ثابت:
- Command Center.
- Campaigns.
- Product Launch.
- Reports.
- Assets.
- Tests.
- Settings.

### 7. Dashboard لا يدعم قرارات Media Buyer بالقدر الكافي

الأثر: الصفحة تعرض أرقام، لكنها لا تجعل قرار التوسع أو الإيقاف واضحا.

الأدلة:
- `frontend/src/pages/advertising/FacebookAdsDashboard.tsx:841-1160` قائمة الحملات تحتوي بحث وفلاتر، لكنها تفتقد sorting عملي على ROAS، CPA، Spend، Purchases، CTR، Frequency.
- `frontend/src/pages/advertising/FacebookAdsDashboard.tsx:1053-1079` يعرض performance chips داخل الكارت، لكن لا يحولها إلى ranking أو action.

المطلوب:
- Date range واضح.
- Sort by Spend, ROAS, CPA, Purchases, CTR, Frequency.
- Breakdown tabs: Campaigns, Ad Sets, Ads, Creative, Geo, Placements.
- Recommendations engine بسيط:
- Scale إذا ROAS أعلى من threshold مع إنفاق كاف.
- Pause إذا Spend أعلى من حد معين بدون purchases.
- Watch إذا frequency مرتفع والـCTR منخفض.

### 8. في اختلافات محتوى ولغة تقلل الاحترافية

الأثر: التفاصيل الصغيرة تخلي الصفحة تبدو غير مكتملة، حتى لو المنطق الخلفي صحيح.

الأدلة:
- `frontend/src/pages/advertising/FacebookAdsDashboard.tsx:780-783` يذكر ميزانية 200 جنيه في توصية ثابتة، بينما Product Launch الحالي مضبوط على 100 جنيه.
- `frontend/src/pages/advertising/FacebookAdsProductLaunch.tsx:35-37` يحتوي default budget 100.
- Product Launch يستخدم عناوين إنجليزية مثل Product URL وDaily Budget وLaunch Pack داخل واجهة عربية.

المطلوب:
- كل النصوص الأساسية بالعربية.
- المصطلح الإنجليزي يظهر ثانويا عند الحاجة، مثل: "الحساب الإعلاني Ad Account".
- إزالة أي أرقام hard-coded من النصوص واستبدالها بالميزانية الفعلية.

### 9. حالة النجاح بعد إنشاء الإعلان ضعيفة

الأثر: بعد إنشاء إعلان حقيقي، المستخدم يحتاج إثبات واضح لما حدث، وليس toast ثم رجوع للداشبورد فقط.

الأدلة:
- `frontend/src/pages/advertising/CreateAdWizard.tsx:1352-1359` يعرض toast وينتقل إلى dashboard.

المطلوب:
- صفحة أو modal نجاح:
- Campaign ID.
- Ad Set ID.
- Ad ID.
- Status.
- Account.
- Link لفتح الحملة في Ads Manager.
- Link لعرض التقرير داخل MaxP.
- تحذير إذا تم إنشاء Meta object لكن فشل الحفظ المحلي.

### 10. Accessibility وpolish محتاجين تحسين

الأثر: الفلاتر وبعض الأجزاء قد تكون أصعب في الفهم أو التصفح، خصوصا مع واجهة عربية وبيانات كثيرة.

الأدلة:
- `frontend/src/pages/advertising/FacebookAdsDashboard.tsx:854-915` بعض الفلاتر تعتمد على `sr-only` labels ولا تعرض label بصري واضح.
- `frontend/src/pages/advertising/FacebookAdsProductLaunch.tsx:553-558` صور المنتج لا تحتوي على width/height واضح، وقد تسبب layout shift.
- استخدام واسع لـ`transition-all` و`outline-none` في صفحات الإعلانات يجعل polish والأداء/accessibility أقل اتساقا.

المطلوب:
- Labels مرئية للفلاتر الأساسية.
- Focus states واضحة.
- عدم الاعتماد على اللون فقط للحالة.
- تحسين صور المنتج بأبعاد ثابتة ونسب عرض واضحة.

### 11. يوجد عناصر تبدو تفاعلية لكنها لا تغير الحالة

الأثر: المستخدم يضغط ويتوقع تغيير، لكن لا يحدث شيء، وهذا يضعف الثقة في الـWizard.

الأدلة:
- `frontend/src/pages/advertising/CreateAdWizard.tsx:1516-1544` أزرار conversion event في Step 1 تبدو selectable لكنها لا تحتوي على `onClick`.
- نفس الاختيار يظهر لاحقا كـselect في Step 2، فيخلق تكرار وتشويش.

المطلوب:
- إما تفعيل الاختيار في Step 1 فعلا.
- أو إزالة أزرار Step 1 والاكتفاء بالاختيار في مكان واحد.

## ما هو جيد حاليا

- يوجد Account Context Panel بدأ يوضح Business وAd Account وPayment وSpend Cap.
- Product Launch يجلب المنتج والصور ويمررها للـWizard.
- الوضع الآمن الافتراضي يميل إلى `PAUSED` في Product Launch.
- توجد بداية لتقارير Geo Performance وحالة الحملات.
- توجد نية واضحة لبناء أداة داخلية تغطي إنشاء الإعلان والتحليل، وهذا اتجاه صحيح.

## التقسيم المقترح للمنتج

### 1. Command Center

وظيفتها: الصفحة الرئيسية لإدارة Meta Ads.

تحتوي على:
- Business/Ad Account selector واضح.
- Health summary: token, permissions, payment, spend cap, page, pixel.
- Spend today/month.
- Campaign delivery summary.
- Alerts: rejected ads, payment issues, pixel inactive.

### 2. Campaigns

وظيفتها: متابعة وإدارة الحملات الموجودة فعلا داخل الحساب الإعلاني المختار.

تحتوي على:
- Business -> Account breadcrumbs.
- Campaign list مع tabs للحالات: Active, Paused, With Issues, Archived.
- Columns مهمة: Spend, Purchases, CPA, ROAS, CTR, CPM, Frequency, Budget, Last edited.
- Expand campaign to Ad Sets ثم Ads.
- Actions: sync, pause/resume, open in Ads Manager, view report.

### 3. Product Launch Studio

وظيفتها: إنشاء إعلان منتج كامل من رابط منتج.

تحتوي على:
- Product URL ingestion.
- اختيار account/page/pixel.
- اختيار الصور أو carousel cards.
- audience/location/placement.
- copy/CTA.
- budget/schedule.
- final confirmation.
- إنشاء الإعلان كـPAUSED افتراضيا.

### 4. Reports / Media Buyer Lab

وظيفتها: تحليل الأداء واتخاذ قرارات تحسين.

تحتوي على:
- Date range.
- Campaign/adset/ad breakdown.
- Funnel: impressions -> clicks -> add to cart -> purchase.
- Creative performance.
- Geo performance.
- Placement performance.
- Recommendations: scale, pause, test, refresh creative.

### 5. Assets

وظيفتها: إدارة الموارد المرتبطة بالإعلانات.

تحتوي على:
- Pages.
- Pixels.
- Catalogs.
- Audiences.
- Creatives.
- Product feeds.

### 6. Tests

وظيفتها: إدارة تجارب A/B.

تحتوي على:
- Test ideas.
- Budget split.
- Active experiments.
- Winning/losing variants.

### 7. Settings / Connections

وظيفتها: إعداد الربط والصلاحيات.

تحتوي على:
- Token status.
- Permissions.
- Businesses.
- Ad accounts.
- Billing/payment read-only info.
- Sync schedule.

## خطة الإصلاح المقترحة

### المرحلة 1 - أمان وتنظيم قبل أي تصميم كبير

الأولوية: عالية.

المطلوب:
- منع اختيار أول حساب remote تلقائيا.
- بناء Account Picker هرمي: Business -> Ad Account.
- إضافة Review & Confirm modal قبل إنشاء إعلان.
- جعل `PAUSED` هو الوضع الافتراضي الصريح.
- عرض created IDs بعد النجاح.

النتيجة: تقليل خطر إنشاء إعلان في حساب خطأ أو بحالة خطأ.

### المرحلة 2 - توحيد الواجهة

الأولوية: عالية.

المطلوب:
- إنشاء `MetaAdsPageShell`.
- إنشاء `MetaAdsContextBar`.
- إنشاء `MetaAdsAccountPicker`.
- إنشاء badges موحدة للحالات.
- توحيد Product Launch وDashboard وWizard على نفس visual language.

النتيجة: المستخدم يشعر أنه داخل منتج واحد متماسك.

### المرحلة 3 - تحويل Product Launch إلى Studio

الأولوية: عالية.

المطلوب:
- إبقاء المستخدم داخل نفس الصفحة حتى المراجعة النهائية.
- جعل الصور والنصوص والجمهور والميزانية قابلة للتعديل.
- دعم carousel واضح عند وجود أكثر من صورة.
- تمرير كل الاختيارات إلى backend بدون فقد بيانات.

النتيجة: إنشاء إعلان منتج يصبح مسار واضح وقابل للتكرار.

### المرحلة 4 - تحسين Dashboard للتوسع والتحسين

الأولوية: متوسطة.

المطلوب:
- إضافة date range.
- إضافة sorting media-buyer metrics.
- إضافة tabs حسب الحالة.
- إضافة breakdown للحملات/adsets/ads.
- إضافة توصيات مبنية على thresholds.

النتيجة: الداشبورد لا يعرض بيانات فقط، بل يساعد في اتخاذ قرار.

### المرحلة 5 - polish وaccessibility

الأولوية: متوسطة.

المطلوب:
- Labels مرئية للفلاتر.
- Focus states واضحة.
- إزالة `transition-all` العشوائي.
- ضبط أبعاد الصور.
- توحيد اللغة.

النتيجة: واجهة أكثر ثقة وراحة، خصوصا مع الاستخدام اليومي.

## التوصية النهائية

نعم، التصميم الحالي ضعيف مقارنة بحجم المهمة التي يقوم بها. لكنه ليس بعيدا عن الإصلاح. السبب الأساسي أن الأجزاء الوظيفية اتبنت بسرعة كصفحات منفصلة، وليس كمنتج واحد منظم حول عقلية Media Buyer.

أول خطوة تنفيذ صحيحة ليست تغيير الألوان فقط. أول خطوة هي تثبيت الهيكل:

Business -> Ad Account -> Product/Campaign -> Audience/Creative -> Review -> Publish Paused -> Report.

بعدها التصميم سيتحسن بشكل طبيعي لأن كل صفحة سيكون لها دور واضح، وكل قرار سيكون في مكانه الصحيح.
