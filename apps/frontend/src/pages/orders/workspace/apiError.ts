export interface ApiErrorShape {
  response?: {
    data?: {
      message?: string;
      error?: string | { message?: string };
    };
  };
  error?: string | { message?: string };
  message?: string;
}

/** استخراج رسالة خطأ مقروءة من رد axios أو خطأ منطقي success:false */
export function extractApiErrorMessage(error: unknown): string | null {
  if (!error) return null;
  const apiError = error as ApiErrorShape;

  if (typeof apiError.response?.data?.error === 'string' && apiError.response.data.error.trim()) {
    return apiError.response.data.error;
  }

  if (
    typeof apiError.response?.data?.error === 'object' &&
    apiError.response.data.error !== null &&
    typeof apiError.response.data.error.message === 'string' &&
    apiError.response.data.error.message.trim()
  ) {
    return apiError.response.data.error.message;
  }

  if (typeof apiError.response?.data?.message === 'string' && apiError.response.data.message.trim()) {
    return apiError.response.data.message;
  }

  if (typeof apiError.error === 'string' && apiError.error.trim()) {
    return apiError.error;
  }

  if (
    typeof apiError.error === 'object' &&
    apiError.error !== null &&
    typeof apiError.error.message === 'string' &&
    apiError.error.message.trim()
  ) {
    return apiError.error.message;
  }

  if (typeof apiError.message === 'string' && apiError.message.trim()) {
    return apiError.message;
  }

  return null;
}
