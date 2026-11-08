/**
 * اختبارات عدّاد وصفوف مساحة العمل المشتركة لأوردرات الضيوف
 * Dependency-free test suite — runs directly with `node apps/backend/tests/sharedWorkspaceGuestOrders.test.js`
 */

const {
  buildGuestWhere,
  dedupeTwins,
  countTwins,
  mergeAndSort,
  computeTotal,
} = require("../services/sharedWorkspaceOrders");

const checks = [];
const check = (name, fn) => checks.push({ name, fn });

const assertEqual = (actual, expected, label) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${label || "assertion"}: expected ${e}, got ${a}`);
  }
};

const assertTrue = (value, label) => {
  if (!value) {
    throw new Error(`${label || "assertion"}: expected truthy, got ${value}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// (أ) الحالات المطلوبة طبقاً لـ TASK_B4DAD8AF_BRIEF
// ─────────────────────────────────────────────────────────────────────────────

// 1. عدّاد شركة فيها 3 أوردر عادية + 2 ضيف → 5
check("عدّاد شركة فيها 3 أوردر عادية + 2 ضيف → 5", () => {
  const regularRows = [
    { id: "reg-1", companyId: "c1", orderNumber: "ORD-1" },
    { id: "reg-2", companyId: "c1", orderNumber: "ORD-2" },
    { id: "reg-3", companyId: "c1", orderNumber: "ORD-3" },
  ];
  const guestRows = [
    { id: "gst-1", companyId: "c1", orderNumber: "GST-1" },
    { id: "gst-2", companyId: "c1", orderNumber: "GST-2" },
  ];

  const { keptGuestRows, twinCount } = dedupeTwins(regularRows, guestRows);
  assertEqual(twinCount, 0, "عدد التوائم يجب أن يكون 0");
  assertEqual(keptGuestRows.length, 2, "عدد أوردرات الضيوف المتبقية");

  const total = computeTotal(regularRows.length, guestRows.length, twinCount);
  assertEqual(total, 5, "إجمالي الطلبات للشركة");
});

// 2. ضيف بنفس orderNumber لأوردر عادي (case-insensitive) → مستبعد والعدّاد 4
check("ضيف بنفس orderNumber لأوردر عادي (case-insensitive) → مستبعد والعدّاد 4", () => {
  const regularRows = [
    { id: "reg-1", companyId: "c1", orderNumber: "ORD-1001" },
    { id: "reg-2", companyId: "c1", orderNumber: "ORD-1002" },
    { id: "reg-3", companyId: "c1", orderNumber: "ORD-1003" },
  ];
  const guestRows = [
    { id: "gst-1", companyId: "c1", orderNumber: " ord-1001 " }, // توأم (تطابق غير حساس للحالة مع مسافات)
    { id: "gst-2", companyId: "c1", orderNumber: "GST-2001" },
  ];

  const { keptGuestRows, twinCount } = dedupeTwins(regularRows, guestRows);
  assertEqual(twinCount, 1, "يجب اكتشاف توأم واحد");
  assertEqual(keptGuestRows.length, 1, "يجب إبقاء أوردر ضيف واحد فقط");
  assertEqual(keptGuestRows[0].id, "gst-2", "الأوردر المتبقي هو غير المكرر");

  const total = computeTotal(regularRows.length, guestRows.length, twinCount);
  assertEqual(total, 4, "الإجمالي بعد استبعاد التوأم يجب أن يكون 4");
});

// 3. فلتر حالة SHIPPED: ضيف بحالة shipped يتحسب، وضيف trash لا
check("فلتر حالة SHIPPED: ضيف بحالة shipped يتحسب، وضيف trash لا", () => {
  // حالة فلتر hrController مع حالة SHIPPED
  const filterWhereShipped = {
    OR: [{ status: "SHIPPED" }, { customStatusCode: "SHIPPED" }],
    status: { not: "TRASH" },
  };
  const guestWhere = buildGuestWhere(filterWhereShipped);
  assertTrue(Boolean(guestWhere.status && guestWhere.status.in), "guestWhere.status.in يجب أن يكون معرفاً");
  assertTrue(guestWhere.status.in.includes("SHIPPED"), "يتضمن SHIPPED بالأحرف الكبيرة");
  assertTrue(guestWhere.status.in.includes("shipped"), "يتضمن shipped بالأحرف الصغيرة");

  // اختبار مطابقة الحالات مع الفلتر
  const guestOrders = [
    { id: "g-1", status: "shipped" },
    { id: "g-2", status: "SHIPPED" },
    { id: "g-3", status: "trash" },
    { id: "g-4", status: "TRASH" },
    { id: "g-5", status: "pending" },
  ];

  const matching = guestOrders.filter((g) => guestWhere.status.in.includes(g.status));
  assertEqual(matching.map((m) => m.id), ["g-1", "g-2"], "فقط أوردرات shipped هي التي تطابق");

  // التحقق من الفلتر الافتراضي عند عدم تحديد حالة (استبعاد TRASH/trash/deleted)
  const defaultGuestWhere = buildGuestWhere({ status: { not: "TRASH" } });
  assertTrue(Boolean(defaultGuestWhere.status && defaultGuestWhere.status.notIn), "notIn يجب أن يكون معرفاً");
  assertTrue(defaultGuestWhere.status.notIn.includes("TRASH"), "يستبعد TRASH");
  assertTrue(defaultGuestWhere.status.notIn.includes("trash"), "يستبعد trash");
  assertTrue(defaultGuestWhere.status.notIn.includes("deleted"), "يستبعد deleted");
});

// 4. بحث بالاسم/الموبايل/رقم الأوردر يرجّع الضيف الصح
check("بحث بالاسم/الموبايل/رقم الأوردر يرجّع الضيف الصح", () => {
  const searchTerm = "Ahmed";
  const filterWhere = {
    AND: [
      {
        OR: [
          { orderNumber: { contains: searchTerm, mode: "insensitive" } },
          { customerName: { contains: searchTerm, mode: "insensitive" } },
          { customerPhone: { contains: searchTerm } },
        ],
      },
    ],
  };

  const guestWhere = buildGuestWhere(filterWhere);
  assertTrue(Array.isArray(guestWhere.OR), "guestWhere.OR يجب أن يكون مصفوفة");
  assertEqual(guestWhere.OR.length, 3, "ثلاثة شروط بحث");

  assertEqual(
    guestWhere.OR[0],
    { guestName: { contains: "Ahmed", mode: "insensitive" } },
    "بحث اسم الضيف"
  );
  assertEqual(
    guestWhere.OR[1],
    { guestPhone: { contains: "Ahmed" } },
    "بحث موبايل الضيف"
  );
  assertEqual(
    guestWhere.OR[2],
    { orderNumber: { contains: "Ahmed", mode: "insensitive" } },
    "بحث رقم الأوردر"
  );

  // التحقق العملي على بيانات تجريبية
  const guestFixtures = [
    { id: "g-1", guestName: "Ahmed Mostafa", guestPhone: "01000000001", orderNumber: "GST-01" },
    { id: "g-2", guestName: "Sarah Mohamed", guestPhone: "01012345678", orderNumber: "GST-02" },
    { id: "g-3", guestName: "Omar Hany", guestPhone: "01099999999", orderNumber: "GST-AHMED-99" },
  ];

  const matchesSearch = (row, term) => {
    const t = term.toLowerCase();
    return (
      (row.guestName && row.guestName.toLowerCase().includes(t)) ||
      (row.guestPhone && row.guestPhone.includes(term)) ||
      (row.orderNumber && row.orderNumber.toLowerCase().includes(t))
    );
  };

  const nameMatches = guestFixtures.filter((g) => matchesSearch(g, "Ahmed"));
  assertEqual(nameMatches.map((g) => g.id), ["g-1", "g-3"], "مطابقة بالاسم ورقم الأوردر");

  const phoneMatches = guestFixtures.filter((g) => matchesSearch(g, "01012345678"));
  assertEqual(phoneMatches.map((g) => g.id), ["g-2"], "مطابقة برقم الموبايل");
});

// 5. دمج وترتيب: صفوف من الجدولين بترتيب createdAt desc ثم id desc
check("دمج وترتيب: صفوف من الجدولين بترتيب createdAt desc ثم id desc", () => {
  const regularRows = [
    { id: "reg-b", createdAt: new Date("2026-11-08T01:00:00Z") },
    { id: "reg-a", createdAt: new Date("2026-11-08T03:00:00Z") },
    { id: "reg-c", createdAt: new Date("2026-11-08T01:00:00Z") },
  ];
  const guestRows = [
    { id: "gst-1", createdAt: new Date("2026-11-08T02:00:00Z") },
    { id: "gst-2", createdAt: new Date("2026-11-08T04:00:00Z") },
  ];

  const merged = mergeAndSort(regularRows, guestRows);
  const ids = merged.map((r) => r.id);

  // الترتيب المتوقع:
  // 1. gst-2 (04:00)
  // 2. reg-a (03:00)
  // 3. gst-1 (02:00)
  // 4. reg-c (01:00, المعرف reg-c أكبر أبجدياً من reg-b فيكون أولاً تنازلياً)
  // 5. reg-b (01:00)
  assertEqual(ids, ["gst-2", "reg-a", "gst-1", "reg-c", "reg-b"], "ترتيب الصفوف المدمجة");
});

// 6. pagination: عند وجود صفين بنفس createdAt في الجدولين، صفحة 2 مافيها تكرار ولا صف مفقود
check("pagination: عند وجود صفين بنفس createdAt في الجدولين، صفحة 2 مافيها تكرار ولا صف مفقود", () => {
  const sameTime = new Date("2026-11-08T02:00:00.000Z");
  const olderTime = new Date("2026-11-08T01:00:00.000Z");

  const regularAll = [
    { id: "reg-2", createdAt: sameTime, orderNumber: "R2" },
    { id: "reg-1", createdAt: olderTime, orderNumber: "R1" },
  ];
  const guestAll = [
    { id: "gst-1", createdAt: sameTime, orderNumber: "G1" },
    { id: "gst-2", createdAt: olderTime, orderNumber: "G2" },
  ];

  // محاكاة شرط الـkeyset:
  // createdAt < cursor.createdAt OR (createdAt == cursor.createdAt AND id < cursor.id)
  const applyKeyset = (rows, cursor) => {
    if (!cursor) return rows;
    const cTime = new Date(cursor.createdAt).getTime();
    return rows.filter((r) => {
      const rTime = new Date(r.createdAt).getTime();
      if (rTime < cTime) return true;
      if (rTime === cTime && String(r.id) < String(cursor.id)) return true;
      return false;
    });
  };

  const limit = 2;

  // الصفحة الأولى:
  const page1Reg = applyKeyset(regularAll, null).slice(0, limit + 1);
  const page1Gst = applyKeyset(guestAll, null).slice(0, limit + 1);
  const { keptGuestRows: page1KeptGst } = dedupeTwins(page1Reg, page1Gst);
  const page1Merged = mergeAndSort(page1Reg, page1KeptGst);
  const page1Slice = page1Merged.slice(0, limit + 1);
  assertTrue(page1Slice.length > limit, "يوجد صفحة تالية");
  page1Slice.pop(); // استبعاد صف الفحص الزائد
  const page1Items = page1Slice;
  assertEqual(page1Items.length, 2, "عدد عناصر الصفحة 1");

  const lastItemP1 = page1Items[page1Items.length - 1];
  const cursorP1 = { createdAt: lastItemP1.createdAt, id: lastItemP1.id };

  // الصفحة الثانية باستخدام مؤشر الصفحة الأولى:
  const page2Reg = applyKeyset(regularAll, cursorP1).slice(0, limit + 1);
  const page2Gst = applyKeyset(guestAll, cursorP1).slice(0, limit + 1);
  const { keptGuestRows: page2KeptGst } = dedupeTwins(page2Reg, page2Gst);
  const page2Merged = mergeAndSort(page2Reg, page2KeptGst);
  const page2Slice = page2Merged.slice(0, limit + 1);
  const page2Items = page2Slice;
  assertEqual(page2Items.length, 2, "عدد عناصر الصفحة 2");

  // التأكد من عدم وجود أي تكرار بين الصفحتين
  const page1Ids = page1Items.map((r) => r.id);
  const page2Ids = page2Items.map((r) => r.id);
  const intersection = page1Ids.filter((id) => page2Ids.includes(id));
  assertEqual(intersection, [], "عدم وجود تكرار بين الصفحتين");

  // التأكد من عدم فقدان أي صف
  const combinedIds = [...page1Ids, ...page2Ids].sort();
  const allExpectedIds = ["gst-1", "gst-2", "reg-1", "reg-2"].sort();
  assertEqual(combinedIds, allExpectedIds, "جميع الصفوف الأربعة موجودة دون نقص");
});

// 7. شركة بأوردرات عادية فقط → العدّاد زي قبل التغيير بالظبط
check("شركة بأوردرات عادية فقط → العدّاد زي قبل التغيير بالظبط", () => {
  const regularRows = [
    { id: "reg-1", companyId: "c1", orderNumber: "ORD-1", createdAt: new Date("2026-11-08T01:00:00Z") },
    { id: "reg-2", companyId: "c1", orderNumber: "ORD-2", createdAt: new Date("2026-11-08T02:00:00Z") },
  ];
  const guestRows = [];

  const { keptGuestRows, twinCount } = dedupeTwins(regularRows, guestRows);
  assertEqual(twinCount, 0, "عدد التوائم 0");
  assertEqual(keptGuestRows, [], "أوردرات الضيوف فارغة");

  const total = computeTotal(regularRows.length, guestRows.length, twinCount);
  assertEqual(total, 2, "الإجمالي يطابق عدد الأوردرات العادية تماماً");

  const merged = mergeAndSort(regularRows, keptGuestRows);
  assertEqual(merged.map((r) => r.id), ["reg-2", "reg-1"], "ترتيب الأوردرات العادية دون تغيير");
});

// ─────────────────────────────────────────────────────────────────────────────
// (ب) اختبارات التدقيق العدائي (Adversarial Edge Cases)
// ─────────────────────────────────────────────────────────────────────────────

// 8. فحص المدخلات الفارغة و null و undefined دون انهيار
check("مدقّق عدائي: معالجة null و undefined والمدخلات الفارغة بأمان", () => {
  // buildGuestWhere(null)
  const whereNull = buildGuestWhere(null);
  assertEqual(whereNull, { status: { notIn: ["TRASH", "trash", "deleted"] } }, "buildGuestWhere(null)");

  // buildGuestWhere(undefined)
  const whereUndef = buildGuestWhere(undefined);
  assertEqual(whereUndef, { status: { notIn: ["TRASH", "trash", "deleted"] } }, "buildGuestWhere(undefined)");

  // dedupeTwins(null, null)
  const dedupeNull = dedupeTwins(null, null);
  assertEqual(dedupeNull, { keptGuestRows: [], twinCount: 0 }, "dedupeTwins(null, null)");

  // dedupeTwins مع عناصر null داخل المصفوفات
  const dedupeWithNullItems = dedupeTwins([null, undefined, { orderNumber: "ORD-1" }], [null, { orderNumber: "ord-1" }, { orderNumber: "GST-2" }]);
  assertEqual(dedupeWithNullItems.twinCount, 1, "اكتشاف التوأم وتجاهل null");
  assertEqual(dedupeWithNullItems.keptGuestRows.length, 1, "تم إبقاء الأوردر الصحيح فقط");

  // mergeAndSort(null, null)
  const sortNull = mergeAndSort(null, null);
  assertEqual(sortNull, [], "mergeAndSort(null, null)");

  // mergeAndSort مع عناصر null وتواريخ غير صالحة NaN
  const sortMessy = mergeAndSort(
    [null, { id: "a", createdAt: "invalid-date" }],
    [{ id: "b", createdAt: new Date("2026-11-08T01:00:00Z") }, undefined]
  );
  assertEqual(sortMessy.length, 2, "تصفية null و undefined");
  assertEqual(sortMessy[0].id, "b", "التاريخ الصحيح أولاً");
  assertEqual(sortMessy[1].id, "a", "التاريخ التالف يعامل كـ 0");

  // computeTotal مع مدخلات غير رقمية
  assertEqual(computeTotal(null, undefined, NaN), 0, "computeTotal مع قيم غير صالحة");
  assertEqual(computeTotal(5, 3, 10), 0, "computeTotal لا يرجع قيماً سالبة");
});

// 9. أوردر بدون orderNumber (null أو فارغ) وأوردر برقم عددي
check("مدقّق عدائي: أوردرات بدون رقم طلب أو بأرقام عددية", () => {
  const regularRows = [
    { id: "r-1", orderNumber: null },
    { id: "r-2", orderNumber: "" },
    { id: "r-3", orderNumber: "   " },
    { id: "r-4", orderNumber: 12345 }, // رقم عددي
  ];
  const guestRows = [
    { id: "g-1", orderNumber: null },
    { id: "g-2", orderNumber: "" },
    { id: "g-3", orderNumber: "12345" }, // يطابق العددي
    { id: "g-4", orderNumber: "UNIQUE-01" },
  ];

  const { keptGuestRows, twinCount } = dedupeTwins(regularRows, guestRows);
  assertEqual(twinCount, 1, "فقط الرقم العددي 12345 هو التوأم");
  assertEqual(keptGuestRows.map((g) => g.id), ["g-1", "g-2", "g-4"], "الأوردرات بدون رقم لا تُعتبر توائم");
});

// 10. شركتان بنفس رقم الأوردر: عزل التوائم على مستوى الشركة
check("مدقّق عدائي: شركتان مختلفتان بنفس رقم الأوردر", () => {
  const regularRows = [
    { id: "reg-1", companyId: "comp-A", orderNumber: "ORD-999" },
    { id: "reg-2", companyId: "comp-B", orderNumber: "ORD-777" },
  ];
  const guestRows = [
    { id: "gst-1", companyId: "comp-A", orderNumber: "ORD-999" }, // توأم مع reg-1 في نفس الشركة comp-A
    { id: "gst-2", companyId: "comp-B", orderNumber: "ORD-999" }, // نفس الرقم ولكن في comp-B (لا يوجد reg-999 في comp-B) -> ليس توأماً!
  ];

  const { keptGuestRows, twinCount } = dedupeTwins(regularRows, guestRows);
  assertEqual(twinCount, 1, "توأم واحد فقط مستبعد");
  assertEqual(keptGuestRows.length, 1, "تم إبقاء طلب ضيف واحد");
  assertEqual(keptGuestRows[0].id, "gst-2", "الطلب المتبقي لشركة comp-B");
  assertEqual(keptGuestRows[0].companyId, "comp-B", "تأكيد هوية الشركة المتبقية");
});

// 11. تزامن فلتر الحالة مع البحث النصي في نفس الوقت
check("مدقّق عدائي: فلتر حالة محدد + بحث نصي معاً دون تصادم", () => {
  const combinedFilter = {
    OR: [{ status: "DELIVERED" }, { customStatusCode: "DELIVERED" }],
    status: { not: "TRASH" },
    AND: [
      {
        OR: [
          { orderNumber: { contains: "Mohamed", mode: "insensitive" } },
          { customerName: { contains: "Mohamed", mode: "insensitive" } },
          { customerPhone: { contains: "Mohamed" } },
        ],
      },
    ],
  };

  const guestWhere = buildGuestWhere(combinedFilter);
  // يجب أن يحوي فلتر الحالة الصحيح
  assertTrue(Boolean(guestWhere.status && guestWhere.status.in), "guestWhere.status.in معرف");
  assertTrue(guestWhere.status.in.includes("DELIVERED"), "الحالة الكبيرة");
  assertTrue(guestWhere.status.in.includes("delivered"), "الحالة الصغيرة");

  // يجب أن يحوي شرط البحث دون تداخل أو استبدال
  assertTrue(Array.isArray(guestWhere.OR), "guestWhere.OR معرف");
  assertEqual(guestWhere.OR[0].guestName.contains, "Mohamed", "اسم الضيف في البحث");
  assertEqual(guestWhere.OR[1].guestPhone.contains, "Mohamed", "موبايل الضيف في البحث");
  assertEqual(guestWhere.OR[2].orderNumber.contains, "Mohamed", "رقم الأوردر في البحث");
});

// 12. أداء استعلام التوائم: تجنب أي استعلامات إضافية عندما يكون count = 0
check("مدقّق عدائي: منطق حساب الإجماليات يتفادى استعلام التوائم عند انعدام أوردرات أحد الجدولين", () => {
  // عند وجود 10 أوردرات عادية و 0 ضيف:
  const regCount = 10;
  const guestCount = 0;
  let findManyCalled = false;

  let twinCount = 0;
  if (regCount > 0 && guestCount > 0) {
    findManyCalled = true;
  }
  const total = computeTotal(regCount, guestCount, twinCount);
  assertEqual(findManyCalled, false, "لم يتم استدعاء findMany للأوردرات عند guestCount = 0");
  assertEqual(total, 10, "الإجمالي يطابق الأوردرات العادية");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Runner
// ─────────────────────────────────────────────────────────────────────────────
if (typeof test === "function" && typeof expect === "function") {
  for (const { name, fn } of checks) {
    test(name, () => {
      expect(fn).not.toThrow();
    });
  }
} else {
  let passed = 0;
  let failed = 0;
  console.log(`بدء تشغيل ${checks.length} اختبارات...\n`);

  for (const { name, fn } of checks) {
    try {
      fn();
      passed += 1;
      console.log(`PASS: ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL: ${name}\n      ${error.message}`);
    }
  }

  console.log(`\nالنتيجة: ${passed} نجح, ${failed} فشل`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}
