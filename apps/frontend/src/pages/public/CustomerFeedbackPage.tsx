import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, CheckCircle, Package, Truck, AlertCircle, RefreshCw, Send } from 'lucide-react';
import axios from 'axios';

interface FeedbackData {
  id: string;
  trackingNumber: string;
  recipientName: string;
  courierName?: string | null;
  status: string;
  isAlreadySubmitted?: boolean;
  existingRating?: number;
  existingComment?: string | null;
}

const QUICK_TAGS = [
  'توصيل سريع',
  'تعامل راقي ومحترم',
  'طرد بحالة ممتازة',
  'التزام بالموعد',
  'تأخير في التوصيل',
  'صعوبة التواصل مع المندوب',
  'طرد متضرر',
];

const RATING_LABELS: Record<number, string> = {
  5: 'ممتاز جداً، تجربة رائعة',
  4: 'جيد ومُرضي',
  3: 'مقبول، يحتاج تحسين',
  2: 'غير راضٍ عن الخدمة',
  1: 'تجربة سيئة جداً',
};

export const CustomerFeedbackPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FeedbackData | null>(null);

  // Form states
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchFeedbackInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`/public/feedback/${token}`);
        if (res.data?.success) {
          setData(res.data.data);
          if (res.data.data?.isAlreadySubmitted) {
            setSubmitted(true);
            setRating(res.data.data.existingRating || 5);
            setComment(res.data.data.existingComment || '');
          }
        }
      } catch (err: any) {
        console.error('Error fetching feedback token:', err);
        if (err.response?.status === 404) {
          setError('رابط التقييم غير صالح أو منتهي الصلاحية');
        } else {
          setError(err.response?.data?.error || 'تعذر تحميل بيانات التقييم');
        }
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchFeedbackInfo();
    }
  }, [token]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;

    try {
      setSubmitting(true);
      const res = await axios.post(`/public/feedback/${token}`, {
        rating,
        comment: comment.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        channel: 'WEB_PORTAL',
      });

      if (res.status === 200 || res.status === 201) {
        setSubmitted(true);
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        setSubmitted(true);
      } else {
        setError(err.response?.data?.error || 'تعذر تسجيل التقييم، يرجى المحاولة لاحقاً');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-900 dark:text-slate-100 font-sans" dir="rtl">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-linear-to-b from-blue-50/70 to-transparent dark:from-blue-950/20 border-b border-slate-100 dark:border-slate-800 text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
            <Package className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">تقييم تجربة الاستلام</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            رأيك يهمنا لمساعدتنا في تحسين جودة وسرعة التوصيل
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto text-blue-600" />
              <p className="text-xs">جاري تجهيز استمارة التقييم...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{error}</p>
            </div>
          ) : submitted ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  شكراً جزيلاً لمشاركتك!
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  تم تسجيل تقييمك بنجاح وسيتم أخذه في الاعتبار لتحسين الخدمة.
                </p>
              </div>

              {/* Submitted Stars summary */}
              <div className="inline-flex items-center gap-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-5 h-5 ${
                      s <= rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-200 dark:text-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Shipment info chip */}
              {data && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">رقم الشحنة</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{data.trackingNumber}</span>
                  </div>
                  {data.courierName && (
                    <div className="text-left">
                      <span className="text-slate-400 block text-[11px] flex items-center gap-1 justify-end">
                        <Truck className="w-3 h-3" />
                        المندوب
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{data.courierName}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Stars Rating Selector */}
              <div className="text-center space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  كيف كانت تجربتك بشكل عام؟
                </label>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-1 transition transform hover:scale-110 active:scale-95 focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          s <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200 dark:text-slate-700 hover:text-amber-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 min-h-[1.25rem]">
                  {RATING_LABELS[rating]}
                </div>
              </div>

              {/* Quick Tags */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  أهم الملاحظات (اختر ما يناسب):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition active:scale-95 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-medium'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comment text area */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  ملاحظات أو تعليق إضافي:
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="شاركنا تفاصيل أكثر لمساعدتنا في خدمتك بشكل أفضل..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري إرسال التقييم...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>إرسال التقييم</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerFeedbackPage;
