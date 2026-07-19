import { useState } from "react";
import Modal, { INPUT_CLS, BTN_PRIMARY, BTN_GHOST } from "./Modal";
import { hotelApi, HotelService, FOLIO_TYPE_LABELS } from "./shared";

export default function ServiceModal({
  data,
  onClose,
  onSaved,
  onError
}: {
  data?: HotelService;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    name: data?.name || "",
    nameAr: data?.nameAr || "",
    itemType: data?.itemType || "SERVICE",
    price: data?.price ?? 0,
  });

  const save = async () => {
    try {
      if (data) await hotelApi.services.update(data.id, form);
      else await hotelApi.services.create(form);
      onSaved();
    } catch (e: any) {
      onError(e.message);
    }
  };

  return (
    <Modal title={data ? "تعديل خدمة" : "إضافة خدمة"} onClose={onClose}>
      <div className="space-y-3">
        <input className={INPUT_CLS} placeholder="اسم الخدمة (English)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input className={INPUT_CLS} placeholder="اسم الخدمة (عربي)" value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} />
        <select className={INPUT_CLS} value={form.itemType} onChange={e => setForm({ ...form, itemType: e.target.value })}>
          {Object.entries(FOLIO_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="number" className={INPUT_CLS} placeholder="السعر" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button className={BTN_GHOST} onClick={onClose}>إلغاء</button>
        <button className={BTN_PRIMARY} onClick={save}>{data ? "تحديث" : "إضافة"}</button>
      </div>
    </Modal>
  );
}
