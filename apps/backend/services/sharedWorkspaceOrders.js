/**
 * خدمة طلبات مساحة العمل المشتركة — إدارة أوردرات الضيوف والدمج والحساب
 * دوال نقية خالية من أي استدعاءات خارجية أو اعتمادات على قاعدة البيانات
 */

/**
 * تحويل فلتر الطلبات العادية إلى فلتر مكافئ لجدول طلبات الضيوف GuestOrder
 * @param {Object} filterWhere
 * @returns {Object}
 */
function buildGuestWhere(filterWhere = {}) {
  const src = filterWhere || {};
  const guestWhere = {};

  // 1. تحديد فلتر الحالة
  let targetStatus = null;
  let isNotTrash = false;

  // فحص src.OR في حال تم تمرير الحالة داخله (مثل hrController)
  if (Array.isArray(src.OR)) {
    const statusCond = src.OR.find((cond) => cond && typeof cond.status === "string");
    if (statusCond) {
      targetStatus = statusCond.status;
    }
  }

  // فحص src.status المباشر
  if (src.status) {
    if (typeof src.status === "string") {
      targetStatus = src.status;
    } else if (typeof src.status === "object") {
      if (src.status.not && String(src.status.not).toUpperCase() === "TRASH") {
        isNotTrash = true;
      } else if (Array.isArray(src.status.in)) {
        targetStatus = src.status.in;
      } else if (src.status.notIn) {
        guestWhere.status = src.status;
      }
    }
  }

  if (targetStatus) {
    if (Array.isArray(targetStatus)) {
      const set = new Set();
      targetStatus.forEach((s) => {
        if (typeof s === "string") {
          set.add(s.toUpperCase());
          set.add(s.toLowerCase());
        }
      });
      guestWhere.status = { in: Array.from(set) };
    } else if (typeof targetStatus === "string") {
      const upper = targetStatus.toUpperCase();
      const lower = targetStatus.toLowerCase();
      if (upper === "ALL" || upper === "ANY") {
        guestWhere.status = { notIn: ["TRASH", "trash", "deleted"] };
      } else {
        guestWhere.status = { in: upper === lower ? [upper] : [upper, lower] };
      }
    }
  } else if (isNotTrash || !src.status || (src.status && src.status.not)) {
    guestWhere.status = { notIn: ["TRASH", "trash", "deleted"] };
  }

  // 2. فلتر نطاق التاريخ
  if (src.createdAt) {
    guestWhere.createdAt = src.createdAt;
  }

  // 3. فلتر الشركة (إذا تم تمريره)
  if (src.companyId) {
    guestWhere.companyId = src.companyId;
  }

  // 4. استخراج شرط البحث
  let term = src.search || src.q || src.term || null;

  if (!term && Array.isArray(src.AND)) {
    for (const item of src.AND) {
      if (item && Array.isArray(item.OR)) {
        const searchCond = item.OR.find(
          (c) =>
            c &&
            (c.customerName?.contains ||
              c.orderNumber?.contains ||
              c.customerPhone?.contains ||
              c.guestName?.contains ||
              c.guestPhone?.contains)
        );
        if (searchCond) {
          term =
            searchCond.customerName?.contains ||
            searchCond.orderNumber?.contains ||
            searchCond.customerPhone?.contains ||
            searchCond.guestName?.contains ||
            searchCond.guestPhone?.contains;
          break;
        }
      }
    }
  }

  if (!term && Array.isArray(src.OR)) {
    const searchCond = src.OR.find(
      (c) =>
        c &&
        (c.customerName?.contains ||
          c.orderNumber?.contains ||
          c.customerPhone?.contains ||
          c.guestName?.contains ||
          c.guestPhone?.contains)
    );
    if (searchCond) {
      term =
        searchCond.customerName?.contains ||
        searchCond.orderNumber?.contains ||
        searchCond.customerPhone?.contains ||
        searchCond.guestName?.contains ||
        searchCond.guestPhone?.contains;
    }
  }

  if (!term && src.orderNumber && src.orderNumber.contains) {
    term = src.orderNumber.contains;
  }

  if (term && String(term).trim()) {
    const cleanTerm = String(term).trim();
    guestWhere.OR = [
      { guestName: { contains: cleanTerm, mode: "insensitive" } },
      { guestPhone: { contains: cleanTerm } },
      { orderNumber: { contains: cleanTerm, mode: "insensitive" } },
    ];
  }

  return guestWhere;
}

/**
 * إزالة أوردرات الضيوف المكررة (توائم) مع أوردرات عادية بنفس رقم الطلب في نفس الشركة
 * @param {Array} regularRows
 * @param {Array} guestRows
 * @returns {{ keptGuestRows: Array, twinCount: number }}
 */
function dedupeTwins(regularRows = [], guestRows = []) {
  if (!Array.isArray(guestRows) || guestRows.length === 0) {
    return { keptGuestRows: [], twinCount: 0 };
  }
  const cleanGuests = guestRows.filter(Boolean);
  if (!Array.isArray(regularRows) || regularRows.length === 0) {
    return { keptGuestRows: [...cleanGuests], twinCount: 0 };
  }

  const scopedRegularSet = new Set();
  const unscopedRegularSet = new Set();

  for (const reg of regularRows) {
    if (!reg) continue;
    const rawNum = typeof reg === "string" ? reg : reg.orderNumber;
    const num = String(rawNum != null ? rawNum : "").trim().toLowerCase();
    if (!num) continue;

    const companyId = typeof reg === "object" && reg ? reg.companyId : null;
    if (companyId) {
      scopedRegularSet.add(`${companyId}:${num}`);
    } else {
      unscopedRegularSet.add(num);
    }
  }

  const keptGuestRows = [];
  let twinCount = 0;

  for (const guest of cleanGuests) {
    const rawNum = typeof guest === "string" ? guest : guest.orderNumber;
    const num = String(rawNum != null ? rawNum : "").trim().toLowerCase();
    if (!num) {
      keptGuestRows.push(guest);
      continue;
    }

    const companyId = typeof guest === "object" && guest ? guest.companyId : null;
    let isTwin = false;

    if (companyId) {
      if (scopedRegularSet.has(`${companyId}:${num}`) || unscopedRegularSet.has(num)) {
        isTwin = true;
      }
    } else {
      if (unscopedRegularSet.has(num)) {
        isTwin = true;
      } else {
        for (const scopedKey of scopedRegularSet) {
          if (scopedKey.endsWith(`:${num}`)) {
            isTwin = true;
            break;
          }
        }
      }
    }

    if (isTwin) {
      twinCount += 1;
    } else {
      keptGuestRows.push(guest);
    }
  }

  return { keptGuestRows, twinCount };
}

/**
 * حساب عدد التوائم بين الطلبات العادية وطلبات الضيوف
 * @param {Array} regularRows
 * @param {Array} guestRows
 * @returns {number}
 */
function countTwins(regularRows = [], guestRows = []) {
  return dedupeTwins(regularRows, guestRows).twinCount;
}

/**
 * دمج وترتيب صفوف الطلبات
 * الترتيب: createdAt تنازلياً ثم id تنازلياً (مقارنة نصية)
 * @param {Array} regularRows
 * @param {Array} guestRows
 * @returns {Array}
 */
function mergeAndSort(regularRows = [], guestRows = []) {
  const combined = [...(regularRows || []), ...(guestRows || [])].filter(Boolean);
  return combined.sort((a, b) => {
    const rawA = a && a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const rawB = b && b.createdAt ? new Date(b.createdAt).getTime() : 0;
    const timeA = Number.isNaN(rawA) ? 0 : rawA;
    const timeB = Number.isNaN(rawB) ? 0 : rawB;

    if (timeA !== timeB) {
      return timeB - timeA;
    }
    const idA = String((a && a.id) || "");
    const idB = String((b && b.id) || "");
    if (idA !== idB) {
      return idA > idB ? -1 : 1;
    }
    return 0;
  });
}

/**
 * حساب إجمالي عدد الطلبات مستبعداً التوائم
 * @param {number} regularCount
 * @param {number} guestCount
 * @param {number} twinCount
 * @returns {number}
 */
function computeTotal(regularCount = 0, guestCount = 0, twinCount = 0) {
  const reg = Number(regularCount) || 0;
  const guest = Number(guestCount) || 0;
  const twin = Number(twinCount) || 0;
  return Math.max(0, reg + guest - twin);
}

module.exports = {
  buildGuestWhere,
  dedupeTwins,
  countTwins,
  mergeAndSort,
  computeTotal,
};
