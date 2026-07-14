import { useState } from "react";
import Modal, { INPUT_CLS, BTN_PRIMARY, BTN_GHOST } from "./Modal";
import { hotelApi, HotelRoom, HotelProperty, HotelRoomType } from "./shared";

export default function RoomModal({
  properties,
  roomTypes,
  selectedProperty,
  data,
  onClose,
  onSaved,
  onError
}: {
  properties: HotelProperty[];
  roomTypes: HotelRoomType[];
  selectedProperty: string;
  data?: HotelRoom;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    propertyId: data?.propertyId || selectedProperty || "",
    roomTypeId: data?.roomTypeId || "",
    roomNumber: data?.roomNumber || "",
    floor: data?.floor ?? 0
  });

  const filteredRoomTypes = roomTypes.filter(r => r.propertyId === form.propertyId);

  const save = async () => {
    try {
      if (data) await hotelApi.rooms.update(data.id, form);
      else await hotelApi.rooms.create(form);
      onSaved();
    } catch (e: any) {
      onError(e.message);
    }
  };

  return (
    <Modal title={data ? "تعديل غرفة" : "إضافة غرفة"} onClose={onClose}>
      <div className="space-y-3">
        <select className={INPUT_CLS} value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value, roomTypeId: "" })}>
          <option value="">اختر الفندق</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className={INPUT_CLS} value={form.roomTypeId} onChange={e => setForm({ ...form, roomTypeId: e.target.value })}>
          <option value="">اختر النوع</option>
          {filteredRoomTypes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.nameAr})</option>)}
        </select>
        <input className={INPUT_CLS} placeholder="رقم الغرفة" value={form.roomNumber} onChange={e => setForm({ ...form, roomNumber: e.target.value })} />
        <input type="number" className={INPUT_CLS} placeholder="الدور" value={form.floor} onChange={e => setForm({ ...form, floor: +e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button className={BTN_GHOST} onClick={onClose}>إلغاء</button>
        <button className={BTN_PRIMARY} onClick={save}>{data ? "تحديث" : "إضافة"}</button>
      </div>
    </Modal>
  );
}
