import { useState } from "react";
import Modal, { INPUT_CLS, BTN_PRIMARY, BTN_GHOST } from "./Modal";
import { hotelApi, HotelReservation, FOLIO_TYPE_LABELS } from "./shared";

export default function FolioModal({
  reservations,
  preselectedId,
  onClose,
  onSaved,
  onError
}: {
  reservations: HotelReservation[];
  preselectedId?: string;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    reservationId: preselectedId || "",
    description: "",
    amount: 0,
    itemType: "SERVICE",
    quantity: 1
  });

  const active = reservations.filter(r => r.status === "CHECKED_IN" || r.status === "CONFIRMED");

  const save = async () => {
    try {
      await hotelApi.folio.add(form.reservationId, form);
      onSaved();
    } catch (e: any) {
      onError(e.message);
    }
  };

  return (
    <Modal title="إضافة خدمة للحجز" onClose={onClose}>
      <div className="space-y-3">
        <select className={INPUT_CLS} value={form.reservationId} onChange={e => setForm({ ...form, reservationId: e.target.value })}>
          <option value="">اختر الحجز</option>
          {active.map(r => <option key={r.id} value={r.id}>{r.customerName} - {r.property?.name}</option>)}
        </select>
        <select className={INPUT_CLS} value={form.itemType} onChange={e => setForm({ ...form, itemType: e.target.value })}>
          {Object.entries(FOLIO_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className={INPUT_CLS} placeholder="وصف الخدمة" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" className={INPUT_CLS} placeholder="المبلغ" value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })} />
          <input type="number" className={INPUT_CLS} placeholder="العدد" value={form.quantity} onChange={e => setForm({ ...form, quantity: +e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button className={BTN_GHOST} onClick={onClose}>إلغاء</button>
        <button className={BTN_PRIMARY} onClick={save}>إضافة</button>
      </div>
    </Modal>
  );
}
