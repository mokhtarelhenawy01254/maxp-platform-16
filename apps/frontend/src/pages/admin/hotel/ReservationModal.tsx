import { useState } from "react";
import Modal, { INPUT_CLS, BTN_PRIMARY, BTN_GHOST } from "./Modal";
import { hotelApi, HotelProperty, HotelRoomType, HotelRoom } from "./shared";

const fmtDate = (d: Date) => d.toISOString().split("T")[0];

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
  const today = fmtDate(new Date());
  const tomorrow = fmtDate(new Date(Date.now() + 86400000));

  const [form, setForm] = useState({
    propertyId: selectedProperty || "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerNotes: "",
    checkIn: today,
    checkOut: tomorrow,
    adults: 1,
    children: 0,
    depositRequired: false,
    depositAmount: 0,
    depositPaid: false,
    paymentMethod: "",
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
      const rooms = form.rooms
        .filter(r => r.roomTypeId)
        .map(r => ({ roomTypeId: r.roomTypeId, roomId: r.roomId || undefined, nightlyRate: r.nightlyRate }));
      const payload = { ...form, rooms };
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
            <p className="text-sm font-medium text-green-600">الغرف المتاحة (اضغط لإضافة):</p>
            {avail.map((a: any) => (
              <button
                key={a.roomType.id}
                type="button"
                className="w-full flex justify-between items-center text-sm border-b pb-1 text-right hover:bg-gray-50 dark:hover:bg-gray-800 px-2 py-1 rounded transition"
                onClick={() => {
                  const existing = form.rooms.find(r => r.roomTypeId === a.roomType.id);
                  if (existing) {
                    setForm({
                      ...form,
                      rooms: form.rooms.map(r => r.roomTypeId === a.roomType.id ? { ...r, nightlyRate: a.effectivePrice } : r)
                    });
                  } else {
                    const emptyIdx = form.rooms.findIndex(r => !r.roomTypeId);
                    if (emptyIdx >= 0) {
                      const next = [...form.rooms];
                      next[emptyIdx] = { ...next[emptyIdx], roomTypeId: a.roomType.id, roomId: undefined, nightlyRate: a.effectivePrice };
                      setForm({ ...form, rooms: next });
                    } else {
                      setForm({ ...form, rooms: [...form.rooms, { roomTypeId: a.roomType.id, roomId: undefined, nightlyRate: a.effectivePrice }] });
                    }
                  }
                }}
              >
                <span>{a.roomType.nameAr || a.roomType.name} ({a.availableRooms} متاحة)</span>
                <span className="font-bold">{a.effectivePrice} ج.م/{a.roomType.pricingModel === "PER_PERSON" ? "للفرد/ليلة" : "ليلة"}</span>
              </button>
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

        <div className="border-t pt-3">
          <p className="text-sm font-medium mb-2">الدفع المقدم:</p>
          <div className="flex items-center gap-2 mb-2">
            <input type="checkbox" id="depositRequired" checked={form.depositRequired} onChange={e => setForm({ ...form, depositRequired: e.target.checked })} />
            <label htmlFor="depositRequired" className="text-sm text-gray-500">مطلوب دفعة مقدمة</label>
          </div>
          {form.depositRequired && (
            <div className="grid grid-cols-3 gap-2 pr-6">
              <div><label className="text-sm text-gray-500">المبلغ</label><input type="number" className={INPUT_CLS} value={form.depositAmount} onChange={e => setForm({ ...form, depositAmount: +e.target.value })} /></div>
              <div className="flex items-center gap-2 mt-5">
                <input type="checkbox" id="depositPaid" checked={form.depositPaid} onChange={e => setForm({ ...form, depositPaid: e.target.checked })} />
                <label htmlFor="depositPaid" className="text-sm text-gray-500">تم الدفع</label>
              </div>
              <div><label className="text-sm text-gray-500">طريقة الدفع</label>
                <select className={INPUT_CLS} value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
                  <option value="">اختر</option><option value="vodafone_cash">فودافون كاش</option><option value="instapay">انستا باي</option><option value="cib_topup">CIB توب أب</option><option value="card">بطاقة</option><option value="other">أخرى</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button className={BTN_GHOST} onClick={onClose}>إلغاء</button>
        <button className={BTN_PRIMARY} onClick={save}>تأكيد الحجز</button>
      </div>
    </Modal>
  );
}
