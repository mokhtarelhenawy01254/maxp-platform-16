import { useState } from "react";
import Modal, { INPUT_CLS, BTN_PRIMARY, BTN_GHOST } from "./Modal";
import { hotelApi, HotelRoomType, HotelProperty } from "./shared";

export default function RoomTypeModal({
  properties,
  selectedProperty,
  data,
  onClose,
  onSaved,
  onError
}: {
  properties: HotelProperty[];
  selectedProperty: string;
  data?: HotelRoomType;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    propertyId: data?.propertyId || selectedProperty || "",
    name: data?.name || "",
    nameAr: data?.nameAr || "",
    description: data?.description || "",
    capacity: data?.capacity ?? 2,
    basePrice: data?.basePrice ?? 0,
    totalRooms: data?.totalRooms ?? 1,
    amenities: data?.amenities || []
  });

  const save = async () => {
    try {
      if (data) await hotelApi.roomTypes.update(data.id, form);
      else await hotelApi.roomTypes.create(form);
      onSaved();
    } catch (e: any) {
      onError(e.message);
    }
  };

  return (
    <Modal title={data ? "تعديل نوع غرفة" : "إضافة نوع غرفة"} onClose={onClose}>
      <div className="space-y-3">
        <select className={INPUT_CLS} value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })}>
          <option value="">اختر الفندق</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input className={INPUT_CLS} placeholder="الاسم (مفردة)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input className={INPUT_CLS} placeholder="الاسم بالعربية" value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} />
        <div className="grid grid-cols-3 gap-2">
          <div><label className="text-sm text-gray-500">السعة</label><input type="number" className={INPUT_CLS} value={form.capacity} onChange={e => setForm({ ...form, capacity: +e.target.value })} /></div>
          <div className="col-span-2"><label className="text-sm text-gray-500">السعر الأساسي</label><input type="number" className={INPUT_CLS} value={form.basePrice} onChange={e => setForm({ ...form, basePrice: +e.target.value })} /></div>
        </div>
        <input type="number" className={INPUT_CLS} placeholder="عدد الغرف" value={form.totalRooms} onChange={e => setForm({ ...form, totalRooms: +e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button className={BTN_GHOST} onClick={onClose}>إلغاء</button>
        <button className={BTN_PRIMARY} onClick={save}>{data ? "تحديث" : "إضافة"}</button>
      </div>
    </Modal>
  );
}
