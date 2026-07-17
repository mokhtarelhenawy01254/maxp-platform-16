import { useState, useEffect } from "react";
import Modal, { INPUT_CLS, BTN_PRIMARY, BTN_GHOST } from "./Modal";
import { hotelApi, HotelRoomType, HotelRoomTypePrice } from "./shared";

export default function PriceTierModal({
  roomType,
  onClose,
  onSaved,
  onError
}: {
  roomType: HotelRoomType;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [tiers, setTiers] = useState<{ guests: number; price: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hotelApi.pricingTiers.get(roomType.id).then(r => {
      if (r.success) {
        setTiers(r.data.map((p: HotelRoomTypePrice) => ({ guests: p.guests, price: p.price })));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [roomType.id]);

  const upsertTier = (guests: number, price: number) => {
    const next = [...tiers.filter(t => t.guests !== guests), { guests, price }];
    next.sort((a, b) => a.guests - b.guests);
    setTiers(next);
  };

  const removeTier = (guests: number) => {
    setTiers(tiers.filter(t => t.guests !== guests));
  };

  const save = async () => {
    try {
      await hotelApi.pricingTiers.set(roomType.id, tiers);
      onSaved();
    } catch (e: any) {
      onError(e.message);
    }
  };

  if (loading) return <Modal title="" onClose={onClose}><p className="text-gray-500">جاري التحميل...</p></Modal>;

  return (
    <Modal title={`تسعير حسب عدد النزلاء - ${roomType.nameAr || roomType.name}`} onClose={onClose}>
      <p className="text-sm text-gray-500 mb-4">حدد سعر كل عدد من النزلاء. النظام هيستخدم السعر المطابق لعدد الضيوف تلقائياً.</p>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {[1, 2, 3, 4].map(n => {
          const tier = tiers.find(t => t.guests === n);
          return (
            <div key={n} className="flex items-center gap-3 border dark:border-gray-700 rounded-lg p-3">
              <span className="text-sm font-medium w-24">{n} {n === 1 ? 'نزيل' : 'نزلاء'}</span>
              <input type="number" className={INPUT_CLS}
                placeholder="السعر"
                value={tier?.price ?? ""}
                onChange={e => { const v = +e.target.value; if (v > 0) upsertTier(n, v); else removeTier(n); }}
              />
              <span className="text-sm text-gray-400">ج.م/ليلة</span>
            </div>
          );
        })}
        <div className="border-t pt-3 mt-3">
          <p className="text-xs text-gray-400">إذا تركت حقل فارغ للسعر، معناه إنه غير متوفر لهذا العدد من النزلاء (النظام هيستخدم الـ basePrice كبديل).</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button className={BTN_GHOST} onClick={onClose}>إلغاء</button>
        <button className={BTN_PRIMARY} onClick={save}>حفظ الأسعار</button>
      </div>
    </Modal>
  );
}
