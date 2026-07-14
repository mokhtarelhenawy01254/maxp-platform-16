import { useState } from "react";
import Modal, { INPUT_CLS, BTN_PRIMARY, BTN_GHOST } from "./Modal";
import { hotelApi, HotelProperty, HotelRoomType, HotelRoom } from "./shared";

type RoomLine = { roomTypeId: string; roomId?: string; nightlyRate: number };

export default function ReservationModal({
  properties,
  roomTypes,
  rooms,
  selectedProperty,
  onClose,
  onSaved,
  onError
}: {
  properties: HotelProperty[];
  roomTypes: HotelRoomType[];
  rooms: HotelRoom[];
  selectedProperty: string;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    propertyId: selectedProperty || "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerNotes: "",
    checkIn: "",
    checkOut: "",
    adults: 1,
    children: 0,
    rooms: [{ roomTypeId: "", roomId: "", nightlyRate: 0 }] as RoomLine[]
  });
  const [avail, setAvail] = useState<any[]>([]);

  const propertyRoomTypes = roomTypes.filter(r => r.propertyId === form.propertyId);

  const checkAvail = async () => {
    if (!form.propertyId || !form.checkIn || !form.checkOut) return;
    try {
      const res = await hotelApi.availability.check(form.propertyId, form.checkIn, form.checkOut);
      if (res.success) setAvail(res.data);
    } catch (e: any) {
      onError(e.message);
    }
  };

  const propertyRooms = rooms.filter(r => r.propertyId === form.propertyId && r.status === "AVAILABLE");

  const updateRoom = (i: number, key: keyof RoomLine, value: string | number) => {
    const next = [...form.rooms];
    next[i] = { ...next[i], [key]: value };
    setForm({ ...form, rooms: next });
  };

  const addRoomLine = () => setForm({ ...form, rooms: [...form.rooms, { roomTypeId: "", roomId: "", nightlyRate: 0 }] });

  const save = async () => {
    try {
      const payload = {
        ...form,
        rooms: form.rooms.map(r => ({ roomTypeId: r.roomTypeId, roomId: r.roomId || undefined, nightlyRate: r.nightlyRate }))
      };
      await hotelApi.reservations.create(payload);
      onSaved();
    } catch (e: any) {
      onError(e.message);
    }
  };

  return (
    <Modal title="حجز جديد" onClose={onClose}>
      <div className="space-y-3">
        <select className={INPUT_CLS} value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })}>
          <option value="">اختر الفندق</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input className={INPUT_CLS} placeholder="اسم العميل" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className={INPUT_CLS} placeholder="رقم الجوال" value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} />
          <input className={INPUT_CLS} placeholder="الإيميل" value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-sm text-gray-500">تاريخ الوصول</label><input type="date" className={INPUT_CLS} value={form.checkIn} onChange={e => setForm({ ...form, checkIn: e.target.value })} /></div>
          <div><label className="text-sm text-gray-500">تاريخ المغادرة</label><input type="date" className={INPUT_CLS} value={form.checkOut} onChange={e => setForm({ ...form, checkOut: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-sm text-gray-500">البالغين</label><input type="number" className={INPUT_CLS} value={form.adults} onChange={e => setForm({ ...form, adults: +e.target.value })} /></div>
          <div><label className="text-sm text-gray-500">الأطفال</label><input type="number" className={INPUT_CLS} value={form.children} onChange={e => setForm({ ...form, children: +e.target.value })} /></div>
        </div>

        <button className={`${BTN_GHOST} w-full`} onClick={checkAvail}>التحقق من التوفر</button>
        {avail.length > 0 && (
          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-green-600">الغرف المتاحة:</p>
            {avail.map((a: any) => (
              <div key={a.roomType.id} className="flex justify-between items-center text-sm border-b pb-1">
                <span>{a.roomType.nameAr || a.roomType.name} ({a.availableRooms} متاحة)</span>
                <span className="font-bold">{a.effectivePrice} ج.م/ليلة</span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-3">
          <p className="text-sm font-medium mb-2">الغرف المختارة:</p>
          {form.rooms.map((r, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 mb-2">
              <select className={INPUT_CLS} value={r.roomTypeId} onChange={e => updateRoom(i, "roomTypeId", e.target.value)}>
                <option value="">النوع</option>
                {propertyRoomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
              </select>
              <select className={INPUT_CLS} value={r.roomId} onChange={e => updateRoom(i, "roomId", e.target.value)}>
                <option value="">رقم الغرفة (اختياري)</option>
                {propertyRooms.map(rm => <option key={rm.id} value={rm.id}>{rm.roomNumber}</option>)}
              </select>
              <input type="number" className={INPUT_CLS} placeholder="السعر" value={r.nightlyRate} onChange={e => updateRoom(i, "nightlyRate", +e.target.value)} />
            </div>
          ))}
          <button className={`${BTN_GHOST} text-blue-600 text-sm`} onClick={addRoomLine}>+ إضافة غرفة</button>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button className={BTN_GHOST} onClick={onClose}>إلغاء</button>
        <button className={BTN_PRIMARY} onClick={save}>تأكيد الحجز</button>
      </div>
    </Modal>
  );
}
