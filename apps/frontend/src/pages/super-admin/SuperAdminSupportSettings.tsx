import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Save, Loader2, Phone } from 'lucide-react';
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";

export default function SuperAdminSupportSettings() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getAuthHeaders = () => {
    const token = tokenManager.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(buildApiUrl("super-admin/support-settings"), {
        headers: getAuthHeaders(),
      });
      if (res.data.success) {
        setPhone(res.data.data.phone || "");
      }
    } catch {
      toast.error("خطأ في جلب إعدادات الدعم الفني");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await axios.put(
        buildApiUrl("super-admin/support-settings"),
        { phone },
        { headers: getAuthHeaders() },
      );
      if (res.data.success) {
        toast.success("تم حفظ رقم الدعم الفني");
      }
    } catch {
      toast.error("فشل حفظ الرقم");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">إعدادات الدعم الفني</h1>
        <p className="text-gray-500 mt-1">رقم واتساب للتواصل مع الدعم الفني</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            رقم واتساب الدعم الفني
          </label>
          <div className="relative">
            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="2010XXXXXXX"
              className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-left"
              dir="ltr"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">برجاء إدخال الرقم بدون + أو 00 (مثال: 201001234567)</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          حفظ
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <strong>ملاحظة:</strong> هذا الرقم سيظهر كأيقونة واتساب عائمة في كل صفحات الداشبورد للتجار ليتمكنوا من التواصل مع الدعم الفني مباشرة.
      </div>
    </div>
  );
}
