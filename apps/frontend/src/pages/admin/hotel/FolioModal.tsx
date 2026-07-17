import { useState, useEffect } from "react";
import Modal, { INPUT_CLS, BTN_PRIMARY, BTN_GHOST } from "./Modal";
import { hotelApi, HotelReservation, HotelService, FOLIO_TYPE_LABELS } from "./shared";

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
  const [catalog, setCatalog] = useState<HotelService[]>([]);
  const [form, setForm] = useState({
    reservationId: preselectedId || "",
    description: "",
    amount: 0,
    itemType: "SERVICE",
    quantity: 1,
    serviceId: ""
  });

  const active = reservations.filter(r => r.status === "CHECKED_IN" || r.status === "CONFIRMED");

  useEffect(() => {
    hotelApi.services.list().then(r => {
      if (r.success) setCatalog(r.data.filter((s: HotelService) => s.isActive));
    }).catch(() => {});
  }, []);

  const pickService = (s: HotelService) => {
    setForm({ ...form, description: s.nameAr || s.name, amount: s.price, itemType: s.itemType, serviceId: s.id });
  };

  const save = async () => {
    try {
      await hotelApi.folio.add(form.reservationId, {
        description: form.description, amount: form.amount, itemType: form.itemType, quantity: form.quantity
      });
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

        {catalog.length > 0 && (
          <div>
            <label className="text-sm text-gray-500 mb-1 block">اختيار من كتالوج الخدمات:</label>
            <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
              {catalog.map(s => (
                <button key={s.id} type="button" onClick={() => pickService(s)}
                  className={`w-full text-right px-2 py-1 text-sm rounded transition ${form.serviceId === s.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                  {s.nameAr || s.name} - {s.price} ج.م
                </button>
              ))}
            </div>
          </div>
        )}

        <select className={INPUT_CLS} value={form.itemType} onChange={e => setForm({ ...form, itemType: e.target.value })}>
          {Object.entries(FOLIO_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className={INPUT_CLS} placeholder="وصف الخدمة" value={form.description} onChange={e => setForm({ ...form, description: e.target.value, serviceId: "" })} />
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
