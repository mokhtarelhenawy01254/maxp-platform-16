import { useState } from "react";
import Modal, { INPUT_CLS, BTN_PRIMARY, BTN_GHOST } from "./Modal";
import { hotelApi, HotelProperty } from "./shared";

export default function PropertyModal({
  data,
  onClose,
  onSaved,
  onError
}: {
  data?: HotelProperty;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    name: data?.name || "",
    city: data?.city || "",
    address: data?.address || "",
    phone: data?.phone || "",
    email: data?.email || "",
    description: data?.description || "",
    checkInTime: data?.checkInTime || "14:00",
    checkOutTime: data?.checkOutTime || "12:00",
    amenities: data?.amenities || []
  });

  const save = async () => {
    try {
      if (data) await hotelApi.properties.update(data.id, form);
      else await hotelApi.properties.create(form);
      onSaved();
    } catch (e: any) {
      onError(e.message);
    }
  };

  return (
    <Modal title={data ? "تعديل فندق" : "إضافة فندق"} onClose={onClose}>
      <div className="space-y-3">
        <input className={INPUT_CLS} placeholder="اسم الفندق" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input className={INPUT_CLS} placeholder="المدينة" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
        <input className={INPUT_CLS} placeholder="العنوان" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
        <input className={INPUT_CLS} placeholder="رقم الهاتف" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        <input className={INPUT_CLS} placeholder="الإيميل" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <textarea className={INPUT_CLS} placeholder="الوصف" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-sm text-gray-500">وقت الوصول</label><input className={INPUT_CLS} value={form.checkInTime} onChange={e => setForm({ ...form, checkInTime: e.target.value })} /></div>
          <div><label className="text-sm text-gray-500">وقت المغادرة</label><input className={INPUT_CLS} value={form.checkOutTime} onChange={e => setForm({ ...form, checkOutTime: e.target.value })} /></div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button className={BTN_GHOST} onClick={onClose}>إلغاء</button>
        <button className={BTN_PRIMARY} onClick={save}>{data ? "تحديث" : "إضافة"}</button>
      </div>
    </Modal>
  );
}
