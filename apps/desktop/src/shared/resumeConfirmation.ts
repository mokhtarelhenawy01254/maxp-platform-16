/**
 * resumeConfirmation — تأكيد استئناف الجلسة من السيرفر (Task 1d9f6982).
 *
 * الباج: زرار «استئناف العمل» كان بيرجّع الحالة محليًا بس (isPaused=false في المين بروسيس)
 * من غير أي تأكيد من السيرفر — فلو السيرفر رفض أو الشبكة وقعت، الواجهة تقول «مستأنف» وهي مش كده.
 *
 * القاعدة: الاستئناف يعتبر مكتمل لما السيرفر يأكد. لو فشل → نرجّع المستخدم لحالة «استراحة»
 * مع سبب واضح، والزرار يفضل ظاهر عشان يعيد المحاولة.
 */

export const RESUME_STATUS = {
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
} as const;

export type ResumeStatus = (typeof RESUME_STATUS)[keyof typeof RESUME_STATUS];

export interface ResumeState {
  status: ResumeStatus;
  isPaused: boolean;
  showResumeButton: boolean;
  message: string | null;
}

export function resolveResumeState(input: {
  syncOk?: boolean;
  error?: string | null;
  wasPaused?: boolean;
} = {}): ResumeState {
  const { syncOk, error, wasPaused = true } = input;

  if (!wasPaused) {
    return { status: RESUME_STATUS.CONFIRMED, isPaused: false, showResumeButton: false, message: null };
  }

  if (syncOk === true) {
    return { status: RESUME_STATUS.CONFIRMED, isPaused: false, showResumeButton: false, message: null };
  }

  return {
    status: RESUME_STATUS.FAILED,
    // فشل التأكيد ⇒ نرجّع حالة الاستراحة محليًا بدل ما نكذب على المستخدم
    isPaused: true,
    showResumeButton: true,
    message: error
      ? `تعذّر تأكيد الاستئناف من السيرفر: ${error}`
      : 'تعذّر تأكيد الاستئناف من السيرفر — جرّب تاني',
  };
}
