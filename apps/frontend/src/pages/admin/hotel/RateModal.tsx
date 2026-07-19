import { useState } from "react";
import Modal, { INPUT_CLS, BTN_PRIMARY, BTN_GHOST } from "./Modal";
import { hotelApi, HotelRoomType } from "./shared";

export default function RateModal({
  roomTypes,
  selectedProperty,
  onClose,
  onSaved,
  onError
}: {
  roomTypes: HotelRoomType[];
  selectedProperty: string;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    roomTypeId: "",
    dateFrom: "",
    dateTo: "",
    price: 0,
    label: ""
  });

  const filtered = roomTypes.filter(rt => !selectedProperty || rt.propertyId === selectedProperty);

  const save = async () => {
    try {
      await hotelApi.rates.create(form);
      onSaved();
    } catch (e: any) {
      onError(e.message);
    }
  };

  return (
    <Modal title="إضافة سعر موسمي" onClose={onClose}>
      <div className="space-y-3">
        <select className={INPUT_CLS} value={form.roomTypeId} onChange={e => setForm({ ...form, roomTypeId: e.target.value })}>
          <option value="">اختر نوع الغرفة</option>
          {filtered.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
        </select>
        <input className={INPUT_CLS} placeholder="المسمى (مثل: الموسم الصيفي)" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-sm text-gray-500">من تاريخ</label><input type="date" className={INPUT_CLS} value={form.dateFrom} onChange={e => setForm({ ...form, dateFrom: e.target.value })} /></div>
          <div><label className="text-sm text-gray-500">إلى تاريخ</label><input type="date" className={INPUT_CLS} value={form.dateTo} onChange={e => setForm({ ...form, dateTo: e.target.value })} /></div>
        </div>
        <input type="number" className={INPUT_CLS} placeholder="السعر لليلة" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button className={BTN_GHOST} onClick={onClose}>إلغاء</button>
        <button className={BTN_PRIMARY} onClick={save}>إضافة</button>
      </div>
    </Modal>
  );
}
