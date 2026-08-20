import React, { useEffect, useState } from "react";

interface Slot {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const DoctorAvailabilityPage: React.FC = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const token = localStorage.getItem('doctorToken');
        const res = await fetch('/api/v1/booking/doctor-portal/availability', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
          if (json.data.length > 0) {
            setSlots(json.data);
          } else {
            setSlots(DAYS.map((_, i) => ({
              dayOfWeek: i, startTime: '09:00', endTime: '17:00', isAvailable: true
            })));
          }
        }
      } catch {}
      finally { setLoading(false); }
    };
    fetchSlots();
  }, []);

  const updateSlot = (index: number, field: keyof Slot, value: any) => {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage("");
      const token = localStorage.getItem('doctorToken');
      const res = await fetch('/api/v1/booking/doctor-portal/availability', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots })
      });
      const json = await res.json();
      if (json.success) setMessage("تم حفظ الأوقات بنجاح");
      else setMessage(json.message || 'حدث خطأ');
    } catch { setMessage('فشل الاتصال'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">أوقات العمل</h1>
      <p className="text-gray-500 mb-6">حدد أيام وأوقات العمل المتاحة لديك — سيراعيها النظام عند عرض مواعيدك على المرضى.</p>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.includes('نجاح') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}

      <div className="space-y-4">
        {slots.map((slot, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4">
            <label className="flex items-center gap-2 min-w-[80px]">
              <input type="checkbox" checked={slot.isAvailable}
                onChange={e => updateSlot(i, 'isAvailable', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="font-medium">{DAYS[slot.dayOfWeek]}</span>
            </label>
            <div className="flex items-center gap-2">
              <input type="time" value={slot.startTime}
                onChange={e => updateSlot(i, 'startTime', e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm" disabled={!slot.isAvailable} />
              <span className="text-gray-400">—</span>
              <input type="time" value={slot.endTime}
                onChange={e => updateSlot(i, 'endTime', e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm" disabled={!slot.isAvailable} />
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleSave} disabled={saving}
        className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {saving ? 'جاري الحفظ...' : 'حفظ الأوقات'}
      </button>
    </div>
  );
};

export default DoctorAvailabilityPage;
