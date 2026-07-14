import { useState, useEffect } from "react";
import { hotelApi, HotelProperty, HotelRoomType, HotelRoom, HotelReservation, HotelFolioItem,
  ROOM_STATUS_LABELS, ROOM_STATUS_COLORS, RESERVATION_STATUS_LABELS, RESERVATION_STATUS_COLORS, FOLIO_TYPE_LABELS } from "./hotel/shared";
import {
  BuildingOffice2Icon, HomeIcon, KeyIcon, CalendarDaysIcon, CurrencyDollarIcon,
  PlusIcon, PencilIcon, TrashIcon, XMarkIcon, CheckIcon, MagnifyingGlassIcon
} from "@heroicons/react/24/outline";

type TabId = "properties" | "roomTypes" | "rooms" | "reservations" | "folio";
const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "properties", label: "الفنادق", icon: BuildingOffice2Icon },
  { id: "roomTypes", label: "أنواع الغرف", icon: HomeIcon },
  { id: "rooms", label: "الغرف", icon: KeyIcon },
  { id: "reservations", label: "الحجوزات", icon: CalendarDaysIcon },
  { id: "folio", label: "الخدمات والأسعار", icon: CurrencyDollarIcon },
];

const INPUT_CLS = "w-full border rounded-lg px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";
const BTN_CLS = "px-4 py-2 rounded-lg text-sm font-medium transition-colors";
const BTN_PRIMARY = `${BTN_CLS} bg-blue-600 text-white hover:bg-blue-700`;
const BTN_DANGER = `${BTN_CLS} bg-red-600 text-white hover:bg-red-700`;
const BTN_GHOST = `${BTN_CLS} text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700`;
const CELL_CLS = "py-3 px-4";

const fetchJson = async (fn: () => Promise<any>, retries = 2): Promise<any> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const data = await fn();
      return data;
    } catch (e: any) {
      if (attempt < retries) { await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); continue; }
      throw e;
    }
  }
};

export default function HotelManagementPage() {
  const [tab, setTab] = useState<TabId>("properties");
  const [properties, setProperties] = useState<HotelProperty[]>([]);
  const [roomTypes, setRoomTypes] = useState<HotelRoomType[]>([]);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [reservations, setReservations] = useState<HotelReservation[]>([]);
  const [folioItems, setFolioItems] = useState<HotelFolioItem[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedProperty, setSelectedProperty] = useState("");
  const [modal, setModal] = useState<{ type: string; data?: any } | null>(null);
  const [availability, setAvailability] = useState<any[]>([]);
  const [availDates, setAvailDates] = useState({ checkIn: "", checkOut: "" });

  const loadAll = async () => {
    setLoading(true); setError("");
    try {
      const [props, rtypes, rms, resvs] = await Promise.all([
        fetchJson(() => hotelApi.properties.list().then(r => r.success ? r.data : [])),
        fetchJson(() => hotelApi.roomTypes.list().then(r => r.success ? r.data : [])),
        fetchJson(() => hotelApi.rooms.list().then(r => r.success ? r.data : [])),
        fetchJson(() => hotelApi.reservations.list().then(r => r.success ? r.data : [])),
      ]);
      setProperties(props);
      setRoomTypes(rtypes);
      setRooms(rms);
      setReservations(resvs);
      if (props.length && !selectedProperty) setSelectedProperty(props[0].id);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const filteredRooms = rooms.filter(r =>
    (!selectedProperty || r.propertyId === selectedProperty) &&
    (!search || r.roomNumber.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredReservations = reservations.filter(r =>
    (!selectedProperty || r.propertyId === selectedProperty) &&
    (!search || r.customerName.includes(search))
  );
  const filteredRoomTypes = roomTypes.filter(r =>
    !selectedProperty || r.propertyId === selectedProperty
  );

  const renderModal = () => {
    if (!modal) return null;
    const close = () => setModal(null);

    if (modal.type === "property") {
      const [form, setForm] = useState(modal.data || { name: "", address: "", city: "", phone: "", email: "", description: "", amenities: [], checkInTime: "14:00", checkOutTime: "12:00" });
      return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={close}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">{modal.data ? 'تعديل فندق' : 'إضافة فندق'}</h2><button onClick={close}><XMarkIcon className="w-5 h-5" /></button></div>
            <div className="space-y-3">
              <input className={INPUT_CLS} placeholder="اسم الفندق" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <input className={INPUT_CLS} placeholder="المدينة" value={form.city || ''} onChange={e => setForm({...form, city: e.target.value})} />
              <input className={INPUT_CLS} placeholder="العنوان" value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} />
              <input className={INPUT_CLS} placeholder="رقم الهاتف" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} />
              <input className={INPUT_CLS} placeholder="الإيميل" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} />
              <textarea className={INPUT_CLS} placeholder="الوصف" rows={3} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-sm text-gray-500">وقت الوصول</label><input className={INPUT_CLS} value={form.checkInTime} onChange={e => setForm({...form, checkInTime: e.target.value})} /></div>
                <div><label className="text-sm text-gray-500">وقت المغادرة</label><input className={INPUT_CLS} value={form.checkOutTime} onChange={e => setForm({...form, checkOutTime: e.target.value})} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button className={BTN_GHOST} onClick={close}>إلغاء</button>
              <button className={BTN_PRIMARY} onClick={async () => {
                try {
                  if (modal.data) await hotelApi.properties.update(modal.data.id, form);
                  else await hotelApi.properties.create(form);
                  await loadAll(); close();
                } catch (e: any) { setError(e.message); }
              }}>{modal.data ? 'تحديث' : 'إضافة'}</button>
            </div>
          </div>
        </div>
      );
    }

    if (modal.type === "roomType") {
      const [form, setForm] = useState(modal.data || { propertyId: selectedProperty, name: "", nameAr: "", description: "", capacity: 2, basePrice: 0, totalRooms: 1, amenities: [] });
      return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={close}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">{modal.data ? 'تعديل نوع غرفة' : 'إضافة نوع غرفة'}</h2><button onClick={close}><XMarkIcon className="w-5 h-5" /></button></div>
            <div className="space-y-3">
              <select className={INPUT_CLS} value={form.propertyId} onChange={e => setForm({...form, propertyId: e.target.value})}>
                <option value="">اختر الفندق</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input className={INPUT_CLS} placeholder="الاسم (مفردة)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <input className={INPUT_CLS} placeholder="الاسم بالعربية" value={form.nameAr || ''} onChange={e => setForm({...form, nameAr: e.target.value})} />
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-sm text-gray-500">السعة</label><input type="number" className={INPUT_CLS} value={form.capacity} onChange={e => setForm({...form, capacity: +e.target.value})} /></div>
                <div className="col-span-2"><label className="text-sm text-gray-500">السعر الأساسي</label><input type="number" className={INPUT_CLS} value={form.basePrice} onChange={e => setForm({...form, basePrice: +e.target.value})} /></div>
              </div>
              <input type="number" className={INPUT_CLS} placeholder="عدد الغرف" value={form.totalRooms} onChange={e => setForm({...form, totalRooms: +e.target.value})} />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button className={BTN_GHOST} onClick={close}>إلغاء</button>
              <button className={BTN_PRIMARY} onClick={async () => {
                try {
                  if (modal.data) await hotelApi.roomTypes.update(modal.data.id, form);
                  else await hotelApi.roomTypes.create(form);
                  await loadAll(); close();
                } catch (e: any) { setError(e.message); }
              }}>{modal.data ? 'تحديث' : 'إضافة'}</button>
            </div>
          </div>
        </div>
      );
    }

    if (modal.type === "room") {
      const [form, setForm] = useState(modal.data || { propertyId: selectedProperty, roomTypeId: "", roomNumber: "", floor: 0 });
      const filtered = roomTypes.filter(r => r.propertyId === form.propertyId);
      return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={close}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">{modal.data ? 'تعديل غرفة' : 'إضافة غرفة'}</h2><button onClick={close}><XMarkIcon className="w-5 h-5" /></button></div>
            <div className="space-y-3">
              <select className={INPUT_CLS} value={form.propertyId} onChange={e => setForm({...form, propertyId: e.target.value, roomTypeId: ''})}>
                <option value="">اختر الفندق</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select className={INPUT_CLS} value={form.roomTypeId} onChange={e => setForm({...form, roomTypeId: e.target.value})}>
                <option value="">اختر النوع</option>
                {filtered.map(r => <option key={r.id} value={r.id}>{r.name} ({r.nameAr})</option>)}
              </select>
              <input className={INPUT_CLS} placeholder="رقم الغرفة" value={form.roomNumber} onChange={e => setForm({...form, roomNumber: e.target.value})} />
              <input type="number" className={INPUT_CLS} placeholder="الدور" value={form.floor || ''} onChange={e => setForm({...form, floor: +e.target.value})} />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button className={BTN_GHOST} onClick={close}>إلغاء</button>
              <button className={BTN_PRIMARY} onClick={async () => {
                try {
                  if (modal.data) await hotelApi.rooms.update(modal.data.id, form);
                  else await hotelApi.rooms.create(form);
                  await loadAll(); close();
                } catch (e: any) { setError(e.message); }
              }}>{modal.data ? 'تحديث' : 'إضافة'}</button>
            </div>
          </div>
        </div>
      );
    }

    if (modal.type === "reservation") {
      const [form, setForm] = useState(modal.data || { propertyId: selectedProperty, customerName: "", customerPhone: "", customerEmail: "", customerNotes: "", checkIn: "", checkOut: "", adults: 1, children: 0, rooms: [{ roomTypeId: "", roomId: "", nightlyRate: 0 }] });
      const [avail, setAvail] = useState<any[]>([]);
      const propertyRoomTypes = roomTypes.filter(r => r.propertyId === form.propertyId);
      const propertyRooms = rooms.filter(r => r.propertyId === form.propertyId && r.status === 'AVAILABLE');

      const checkAvail = async () => {
        if (!form.propertyId || !form.checkIn || !form.checkOut) return;
        const res = await hotelApi.availability.check(form.propertyId, form.checkIn, form.checkOut);
        if (res.success) setAvail(res.data);
      };

      return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={close}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">حجز جديد</h2><button onClick={close}><XMarkIcon className="w-5 h-5" /></button></div>
            <div className="space-y-3">
              <select className={INPUT_CLS} value={form.propertyId} onChange={e => setForm({...form, propertyId: e.target.value})}>
                <option value="">اختر الفندق</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input className={INPUT_CLS} placeholder="اسم العميل" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <input className={INPUT_CLS} placeholder="رقم الجوال" value={form.customerPhone || ''} onChange={e => setForm({...form, customerPhone: e.target.value})} />
                <input className={INPUT_CLS} placeholder="الإيميل" value={form.customerEmail || ''} onChange={e => setForm({...form, customerEmail: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-sm text-gray-500">تاريخ الوصول</label><input type="date" className={INPUT_CLS} value={form.checkIn} onChange={e => setForm({...form, checkIn: e.target.value})} /></div>
                <div><label className="text-sm text-gray-500">تاريخ المغادرة</label><input type="date" className={INPUT_CLS} value={form.checkOut} onChange={e => setForm({...form, checkOut: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-sm text-gray-500">البالغين</label><input type="number" className={INPUT_CLS} value={form.adults} onChange={e => setForm({...form, adults: +e.target.value})} /></div>
                <div><label className="text-sm text-gray-500">الأطفال</label><input type="number" className={INPUT_CLS} value={form.children} onChange={e => setForm({...form, children: +e.target.value})} /></div>
              </div>
              <button className={`${BTN_CLS} bg-gray-100 dark:bg-gray-700 text-sm`} onClick={checkAvail}>التحقق من التوفر</button>
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
                {form.rooms.map((r: any, i: number) => (
                  <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                    <select className={INPUT_CLS} value={r.roomTypeId} onChange={e => {
                      const rooms = [...form.rooms];
                      rooms[i].roomTypeId = e.target.value;
                      setForm({...form, rooms});
                    }}>
                      <option value="">النوع</option>
                      {propertyRoomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                    </select>
                    <select className={INPUT_CLS} value={r.roomId} onChange={e => {
                      const rooms = [...form.rooms];
                      rooms[i].roomId = e.target.value;
                      setForm({...form, rooms});
                    }}>
                      <option value="">رقم الغرفة</option>
                      {propertyRooms.map(rm => <option key={rm.id} value={rm.id}>{rm.roomNumber}</option>)}
                    </select>
                    <input type="number" className={INPUT_CLS} placeholder="السعر" value={r.nightlyRate} onChange={e => {
                      const rooms = [...form.rooms];
                      rooms[i].nightlyRate = +e.target.value;
                      setForm({...form, rooms});
                    }} />
                  </div>
                ))}
                <button className={`${BTN_CLS} text-blue-600 text-sm`} onClick={() => setForm({...form, rooms: [...form.rooms, { roomTypeId: "", roomId: "", nightlyRate: 0 }]})}>+ إضافة غرفة</button>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button className={BTN_GHOST} onClick={close}>إلغاء</button>
              <button className={BTN_PRIMARY} onClick={async () => {
                try {
                  await hotelApi.reservations.create(form);
                  await loadAll(); close();
                } catch (e: any) { setError(e.message); }
              }}>تأكيد الحجز</button>
            </div>
          </div>
        </div>
      );
    }

    if (modal.type === "folio") {
      const [form, setForm] = useState({ reservationId: "", description: "", amount: 0, itemType: "SERVICE", quantity: 1 });
      return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={close}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">إضافة خدمة للحجز</h2><button onClick={close}><XMarkIcon className="w-5 h-5" /></button></div>
            <div className="space-y-3">
              <select className={INPUT_CLS} value={form.reservationId} onChange={e => setForm({...form, reservationId: e.target.value})}>
                <option value="">اختر الحجز</option>
                {reservations.filter(r => r.status === 'CHECKED_IN' || r.status === 'CONFIRMED').map(r => (
                  <option key={r.id} value={r.id}>{r.customerName} - {r.property?.name}</option>
                ))}
              </select>
              <select className={INPUT_CLS} value={form.itemType} onChange={e => setForm({...form, itemType: e.target.value})}>
                {Object.entries(FOLIO_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input className={INPUT_CLS} placeholder="وصف الخدمة" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" className={INPUT_CLS} placeholder="المبلغ" value={form.amount} onChange={e => setForm({...form, amount: +e.target.value})} />
                <input type="number" className={INPUT_CLS} placeholder="العدد" value={form.quantity} onChange={e => setForm({...form, quantity: +e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button className={BTN_GHOST} onClick={close}>إلغاء</button>
              <button className={BTN_PRIMARY} onClick={async () => {
                try {
                  await hotelApi.folio.add(form.reservationId, form);
                  await loadAll(); close();
                } catch (e: any) { setError(e.message); }
              }}>إضافة</button>
            </div>
          </div>
        </div>
      );
    }

    if (modal.type === "rate") {
      const [form, setForm] = useState({ roomTypeId: "", dateFrom: "", dateTo: "", price: 0, label: "" });
      return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={close}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">إضافة سعر موسمي</h2><button onClick={close}><XMarkIcon className="w-5 h-5" /></button></div>
            <div className="space-y-3">
              <select className={INPUT_CLS} value={form.roomTypeId} onChange={e => setForm({...form, roomTypeId: e.target.value})}>
                <option value="">اختر نوع الغرفة</option>
                {roomTypes.filter(rt => !selectedProperty || rt.propertyId === selectedProperty).map(rt => (
                  <option key={rt.id} value={rt.id}>{rt.name}</option>
                ))}
              </select>
              <input className={INPUT_CLS} placeholder="المسمى (مثل: الموسم الصيفي)" value={form.label} onChange={e => setForm({...form, label: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-sm text-gray-500">من تاريخ</label><input type="date" className={INPUT_CLS} value={form.dateFrom} onChange={e => setForm({...form, dateFrom: e.target.value})} /></div>
                <div><label className="text-sm text-gray-500">إلى تاريخ</label><input type="date" className={INPUT_CLS} value={form.dateTo} onChange={e => setForm({...form, dateTo: e.target.value})} /></div>
              </div>
              <input type="number" className={INPUT_CLS} placeholder="السعر لليلة" value={form.price} onChange={e => setForm({...form, price: +e.target.value})} />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button className={BTN_GHOST} onClick={close}>إلغاء</button>
              <button className={BTN_PRIMARY} onClick={async () => {
                try {
                  await hotelApi.rates.create(form);
                  await loadAll(); close();
                } catch (e: any) { setError(e.message); }
              }}>إضافة</button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading) return (
    <div className="p-8"><div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
    </div></div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">🏨 نظام إدارة الفنادق</h1>
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}

      <div className="flex gap-1 mb-6 border-b overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 items-center">
          <select className="border rounded-lg px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800" value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)}>
            <option value="">كل الفنادق</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
            <input className="border rounded-lg pr-8 pl-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {tab === 'properties' && <button className={BTN_PRIMARY} onClick={() => setModal({ type: 'property' })}><PlusIcon className="w-4 h-4 inline ml-1" />إضافة فندق</button>}
        {tab === 'roomTypes' && <button className={BTN_PRIMARY} onClick={() => setModal({ type: 'roomType' })}><PlusIcon className="w-4 h-4 inline ml-1" />إضافة نوع</button>}
        {tab === 'rooms' && <button className={BTN_PRIMARY} onClick={() => setModal({ type: 'room' })}><PlusIcon className="w-4 h-4 inline ml-1" />إضافة غرفة</button>}
        {tab === 'reservations' && <button className={BTN_PRIMARY} onClick={() => setModal({ type: 'reservation' })}><PlusIcon className="w-4 h-4 inline ml-1" />حجز جديد</button>}
      </div>

      {/* ── Properties Tab ── */}
      {tab === 'properties' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.filter(p => !selectedProperty || p.id === selectedProperty).map(p => (
            <div key={p.id} className="border dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{p.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => setModal({ type: 'property', data: p })}><PencilIcon className="w-4 h-4 text-gray-500" /></button>
                  <button onClick={async () => { if (confirm('حذف الفندق؟')) { await hotelApi.properties.delete(p.id); loadAll(); } }}><TrashIcon className="w-4 h-4 text-red-500" /></button>
                </div>
              </div>
              {p.city && <p className="text-sm text-gray-500">{p.city} - {p.address}</p>}
              {p.phone && <p className="text-sm text-gray-500">📞 {p.phone}</p>}
              <div className="text-xs text-gray-400 mt-2">الوصول {p.checkInTime} | المغادرة {p.checkOutTime}</div>
              {p.roomTypes && <p className="text-xs text-gray-400 mt-1">{p.roomTypes.length} أنواع غرف | {p.rooms?.length || 0} غرفة</p>}
            </div>
          ))}
          {properties.length === 0 && <p className="text-gray-500 col-span-full">لا توجد فنادق. أضف فندقاً جديداً.</p>}
        </div>
      )}

      {/* ── Room Types Tab ── */}
      {tab === 'roomTypes' && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr className="border-b dark:border-gray-700 text-sm text-gray-500">
              <th className={CELL_CLS + " text-right"}>الاسم</th>
              <th className={CELL_CLS + " text-right"}>العربية</th>
              <th className={CELL_CLS}>السعة</th>
              <th className={CELL_CLS}>السعر</th>
              <th className={CELL_CLS}>الغرف</th>
              <th className={CELL_CLS}></th>
            </tr></thead>
            <tbody>
              {filteredRoomTypes.map(rt => (
                <tr key={rt.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className={CELL_CLS}>{rt.name}</td>
                  <td className={CELL_CLS}>{rt.nameAr || '-'}</td>
                  <td className={CELL_CLS + " text-center"}>{rt.capacity}</td>
                  <td className={CELL_CLS + " text-center font-bold"}>{rt.basePrice} ج.م</td>
                  <td className={CELL_CLS + " text-center"}>{rt._count?.rooms || 0}/{rt.totalRooms}</td>
                  <td className={CELL_CLS}>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setModal({ type: 'roomType', data: rt })}><PencilIcon className="w-4 h-4 text-gray-500" /></button>
                      <button onClick={async () => { if (confirm('حذف؟')) { await hotelApi.roomTypes.delete(rt.id); loadAll(); } }}><TrashIcon className="w-4 h-4 text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Rooms Tab ── */}
      {tab === 'rooms' && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr className="border-b dark:border-gray-700 text-sm text-gray-500">
              <th className={CELL_CLS + " text-right"}>الغرفة</th><th className={CELL_CLS}>الدور</th>
              <th className={CELL_CLS}>النوع</th><th className={CELL_CLS}>الحالة</th><th className={CELL_CLS}></th>
            </tr></thead>
            <tbody>
              {filteredRooms.map(r => (
                <tr key={r.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className={CELL_CLS}>{r.roomNumber}</td>
                  <td className={CELL_CLS + " text-center"}>{r.floor || '-'}</td>
                  <td className={CELL_CLS}>{r.roomType?.name || '-'}</td>
                  <td className={CELL_CLS}>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${ROOM_STATUS_COLORS[r.status] || ''}`}>
                      {ROOM_STATUS_LABELS[r.status] || r.status}
                    </span>
                  </td>
                  <td className={CELL_CLS}>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setModal({ type: 'room', data: r })}><PencilIcon className="w-4 h-4 text-gray-500" /></button>
                      <button onClick={async () => { if (confirm('حذف؟')) { await hotelApi.rooms.delete(r.id); loadAll(); } }}><TrashIcon className="w-4 h-4 text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Reservations Tab ── */}
      {tab === 'reservations' && (
        <div className="space-y-3">
          {filteredReservations.map(r => (
            <div key={r.id} className="border dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold">{r.customerName}</h3>
                  <p className="text-sm text-gray-500">{r.property?.name} | {new Date(r.checkIn).toLocaleDateString('ar-EG')} → {new Date(r.checkOut).toLocaleDateString('ar-EG')}</p>
                  <p className="text-xs text-gray-400">{r.adults} بالغين, {r.children} أطفال | {r.rooms?.length || 0} غرف</p>
                </div>
                <div className="text-left">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${RESERVATION_STATUS_COLORS[r.status] || ''}`}>
                    {RESERVATION_STATUS_LABELS[r.status] || r.status}
                  </span>
                  <p className="font-bold mt-1">{r.totalAmount} ج.م</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {r.status === 'PENDING' && <button className={`${BTN_CLS} bg-blue-100 text-blue-700 text-xs`} onClick={async () => { await hotelApi.reservations.updateStatus(r.id, 'CONFIRMED'); loadAll(); }}>تأكيد</button>}
                {r.status === 'CONFIRMED' && <button className={`${BTN_CLS} bg-green-100 text-green-700 text-xs`} onClick={async () => { await hotelApi.reservations.updateStatus(r.id, 'CHECKED_IN'); loadAll(); }}>تسجيل وصول</button>}
                {r.status === 'CHECKED_IN' && <button className={`${BTN_CLS} bg-gray-100 text-gray-700 text-xs`} onClick={async () => { await hotelApi.reservations.updateStatus(r.id, 'CHECKED_OUT'); loadAll(); }}>تسجيل مغادرة</button>}
                {(r.status === 'PENDING' || r.status === 'CONFIRMED') && <button className={`${BTN_CLS} bg-red-100 text-red-700 text-xs`} onClick={async () => { await hotelApi.reservations.updateStatus(r.id, 'CANCELLED'); loadAll(); }}>إلغاء</button>}
              </div>
              {r.folio?.length > 0 && (
                <div className="mt-3 border-t pt-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">الخدمات الإضافية:</p>
                  {r.folio.map(f => (
                    <div key={f.id} className="flex justify-between text-xs text-gray-500">
                      <span>{f.description} ({FOLIO_TYPE_LABELS[f.itemType] || f.itemType}) x{f.quantity}</span>
                      <span>{f.amount * f.quantity} ج.م</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filteredReservations.length === 0 && <p className="text-gray-500">لا توجد حجوزات</p>}
        </div>
      )}

      {/* ── Folio & Rates Tab ── */}
      {tab === 'folio' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">الخدمات الإضافية (Folio)</h2>
              <button className={BTN_PRIMARY} onClick={() => setModal({ type: 'folio' })}>إضافة خدمة</button>
            </div>
            <div className="space-y-2">
              {reservations.filter(r => r.status === 'CHECKED_IN' || r.status === 'CONFIRMED').map(r => (
                <div key={r.id} className="border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                  <p className="font-medium text-sm">{r.customerName} - {r.property?.name}</p>
                  {r.folio?.map(f => (
                    <div key={f.id} className="flex justify-between text-xs text-gray-500 pr-4 mt-1">
                      <span>{f.description} <span className="text-gray-400">({FOLIO_TYPE_LABELS[f.itemType] || f.itemType})</span></span>
                      <span>{f.amount * f.quantity} ج.م <button className="text-red-500 mr-2" onClick={async () => { await hotelApi.folio.remove(r.id, f.id); loadAll(); }}><XMarkIcon className="w-3 h-3 inline" /></button></span>
                    </div>
                  ))}
                  {(!r.folio || r.folio.length === 0) && <p className="text-xs text-gray-400 pr-4">لا توجد خدمات</p>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">الأسعار الموسمية</h2>
              <button className={BTN_PRIMARY} onClick={() => setModal({ type: 'rate' })}>إضافة سعر</button>
            </div>
            <div className="space-y-2">
              {roomTypes.filter(rt => !selectedProperty || rt.propertyId === selectedProperty).map(rt => (
                <div key={rt.id} className="border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                  <p className="font-medium text-sm">{rt.name} - {rt.basePrice} ج.م (أساسي)</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modal && renderModal()}
    </div>
  );
}
