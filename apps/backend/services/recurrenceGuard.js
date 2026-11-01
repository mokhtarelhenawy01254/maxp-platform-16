'use strict';

/**
 * recurrenceGuard — يمنع توليد دورات تكرار مكررة (Task c0266d2e).
 *
 * المشكلة على برود: كل اعتماد للمهمة المتكررة (أو كل تشغيل للاسكان الدوري)
 * كان بيولّد نسخة جديدة من نفس المهمة. السبب إن الفحص القديم كان بيتجاهل
 * «الخلف» لو حالته COMPLETED، فالاسكان يعيد التوليد كل مرة.
 *
 * القاعدة الحالية: النسخة التالية تعتبر **موجودة** لو فيه أي مهمة متكررة بنفس
 * (companyId · parentTaskId · title) وبداية أحدث من بداية المصدر — بغض النظر عن حالتها.
 *
 * دوال خالصة عشان تتست بدون Prisma.
 */

function toTime(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function successorStartTime(task) {
  if (!task) return null;
  return toTime(task.startDate) ?? toTime(task.createdAt) ?? toTime(task.dueDate);
}

function sourceStartTime(task) {
  if (!task) return null;
  return toTime(task.startDate) ?? toTime(task.createdAt) ?? toTime(task.dueDate);
}

/**
 * @param {object} source المهمة المتكررة اللي اتعملت
 * @param {Array<object>} successors مرشحين (نفس company/parent/title/isRecurring، id != source.id)
 * @returns {{hasSuccessor: boolean, successor: object|null}}
 */
function findExistingSuccessor(source, successors) {
  const sourceStart = sourceStartTime(source);
  const list = Array.isArray(successors) ? successors : [];

  if (sourceStart === null) {
    // لو مفيش تاريخ للمصدر، أي خلف موجود يعتبر كافي لمنع التكرار
    const any = list.find((s) => s && s.id !== source?.id) || null;
    return { hasSuccessor: Boolean(any), successor: any };
  }

  const match = list.find((candidate) => {
    if (!candidate || candidate.id === source?.id) return false;
    const start = successorStartTime(candidate);
    if (start === null) return false;
    return start > sourceStart;
  });

  return { hasSuccessor: Boolean(match), successor: match || null };
}

module.exports = { findExistingSuccessor, successorStartTime, sourceStartTime };
