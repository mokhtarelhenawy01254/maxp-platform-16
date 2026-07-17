import { useState, useEffect } from "react";
import {
  hotelApi, HotelProperty, HotelRoomType, HotelRoom, HotelReservation,
  HotelService, HotelPolicy, HotelRoomRate,
  ROOM_STATUS_LABELS, ROOM_STATUS_COLORS, RESERVATION_STATUS_LABELS, RESERVATION_STATUS_COLORS, FOLIO_TYPE_LABELS
} from "./hotel/shared";
import {
  BuildingOffice2Icon, HomeIcon, KeyIcon, CalendarDaysIcon, CurrencyDollarIcon,
  PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, Cog6ToothIcon
} from "@heroicons/react/24/outline";

import PropertyModal from "./hotel/PropertyModal";
import RoomTypeModal from "./hotel/RoomTypeModal";
import RoomModal from "./hotel/RoomModal";
import ReservationModal from "./hotel/ReservationModal";
import FolioModal from "./hotel/FolioModal";
import RateModal from "./hotel/RateModal";
import ServiceModal from "./hotel/ServiceModal";
import PolicyModal from "./hotel/PolicyModal";

type TabId = "properties" | "roomTypes" | "rooms" | "reservations" | "folio" | "policies";

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "properties", label: "الفنادق", icon: BuildingOffice2Icon },
  { id: "roomTypes", label: "أنواع الغرف", icon: HomeIcon },
  { id: "rooms", label: "الغرف", icon: KeyIcon },
  { id: "reservations", label: "الحجوزات", icon: CalendarDaysIcon },
  { id: "folio", label: "الخدمات والأسعار", icon: CurrencyDollarIcon },
  { id: "policies", label: "السياسات", icon: Cog6ToothIcon },
];

const BTN_CLS = "px-4 py-2 rounded-lg text-sm font-medium transition-colors";
const BTN_PRIMARY = `${BTN_CLS} bg-blue-600 text-white hover:bg-blue-700`;
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
  const [services, setServices] = useState<HotelService[]>([]);
  const [roomRates, setRoomRates] = useState<HotelRoomRate[]>([]);
  const [policies, setPolicies] = useState<HotelPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedProperty, setSelectedProperty] = useState("");
  const [folioSubTab, setFolioSubTab] = useState<"folio" | "services" | "rates">("folio");
  const [modal, setModal] = useState<{ type: string; data?: any } | null>(null);

  const loadAll = async () => {
    setLoading(true); setError("");
    try {
      const [props, rtypes, rms, resvs, svcs, rrates, pols] = await Promise.all([
        fetchJson(() => hotelApi.properties.list().then(r => r.success ? r.data : [])),
        fetchJson(() => hotelApi.roomTypes.list().then(r => r.success ? r.data : [])),
        fetchJson(() => hotelApi.rooms.list().then(r => r.success ? r.data : [])),
        fetchJson(() => hotelApi.reservations.list().then(r => r.success ? r.data : [])),
        fetchJson(() => hotelApi.services.list().then(r => r.success ? r.data : [])),
        fetchJson(() => hotelApi.rates.list().then(r => r.success ? r.data : [])),
        fetchJson(() => hotelApi.policies.get().then(r => r.success ? r.data : null)),
      ]);
      setProperties(props);
      setRoomTypes(rtypes);
      setRooms(rms);
      setReservations(resvs);
      setServices(svcs);
      setRoomRates(rrates);
      setPolicies(pols);
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

  const onSaved = async () => { await loadAll(); setModal(null); };
  const onError = (msg: string) => setError(msg);

  const handleDelete = async (fn: () => Promise<any>) => {
    if (!confirm("حذف؟")) return;
    try { await fn(); await loadAll(); } catch (e: any) { setError(e.message); }
  };

  if (loading) return (
    <div className="p-8"><div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
    </div></div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      <div className="p-6" dir="rtl">
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
                  <button onClick={() => handleDelete(() => hotelApi.properties.delete(p.id))}><TrashIcon className="w-4 h-4 text-red-500" /></button>
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
                      <button onClick={() => handleDelete(() => hotelApi.roomTypes.delete(rt.id))}><TrashIcon className="w-4 h-4 text-red-500" /></button>
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
              <th className={CELL_CLS + " text-right"}>الغرفة</th>
              <th className={CELL_CLS}>الدور</th>
              <th className={CELL_CLS}>النوع</th>
              <th className={CELL_CLS}>الحالة</th>
              <th className={CELL_CLS}></th>
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
                      <button onClick={() => handleDelete(() => hotelApi.rooms.delete(r.id))}><TrashIcon className="w-4 h-4 text-red-500" /></button>
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
                <button className={`${BTN_CLS} bg-purple-100 text-purple-700 text-xs`} onClick={() => setModal({ type: 'folio', data: { reservationId: r.id } })}>+ خدمة</button>
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
        <div>
          <div className="flex gap-1 mb-4 border-b">
            {(["folio", "services", "rates"] as const).map(st => (
              <button key={st} onClick={() => setFolioSubTab(st)}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${folioSubTab === st ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
                {st === 'folio' ? 'الخدمات (Folio)' : st === 'services' ? 'كتالوج الخدمات' : 'الأسعار الموسمية'}
              </button>
            ))}
          </div>

          {folioSubTab === 'folio' && (
            <div className="space-y-2">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-500">الخدمات المضافة للحجوزات النشطة</span>
                <button className={BTN_PRIMARY} onClick={() => setModal({ type: 'folio' })}>إضافة خدمة للحجز</button>
              </div>
              {reservations.filter(r => r.status === 'CHECKED_IN' || r.status === 'CONFIRMED').map(r => (
                <div key={r.id} className="border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                  <p className="font-medium text-sm">{r.customerName} - {r.property?.name}</p>
                  {r.folio?.map(f => (
                    <div key={f.id} className="flex justify-between text-xs text-gray-500 pr-4 mt-1">
                      <span>{f.description} <span className="text-gray-400">({FOLIO_TYPE_LABELS[f.itemType] || f.itemType})</span></span>
                      <span>{f.amount * f.quantity} ج.م <button className="text-red-500 mr-2" onClick={async () => { await hotelApi.folio.remove(r.id, f.id); loadAll(); }}>×</button></span>
                    </div>
                  ))}
                  {(!r.folio || r.folio.length === 0) && <p className="text-xs text-gray-400 pr-4">لا توجد خدمات</p>}
                </div>
              ))}
            </div>
          )}

          {folioSubTab === 'services' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold">كتالوج الخدمات</h2>
                <button className={BTN_PRIMARY} onClick={() => setModal({ type: 'service' })}>إضافة خدمة</button>
              </div>
              {services.length === 0 && <p className="text-gray-500 text-sm">لا توجد خدمات في الكتالوج. أضف الخدمات التي يقدمها الفندق.</p>}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="border-b dark:border-gray-700 text-sm text-gray-500">
                    <th className={CELL_CLS + " text-right"}>الخدمة</th>
                    <th className={CELL_CLS + " text-right"}>بالعربية</th>
                    <th className={CELL_CLS}>النوع</th>
                    <th className={CELL_CLS}>السعر</th>
                    <th className={CELL_CLS}>الحالة</th>
                    <th className={CELL_CLS}></th>
                  </tr></thead>
                  <tbody>
                    {services.map(s => (
                      <tr key={s.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className={CELL_CLS}>{s.name}</td>
                        <td className={CELL_CLS}>{s.nameAr || '-'}</td>
                        <td className={CELL_CLS}>{FOLIO_TYPE_LABELS[s.itemType] || s.itemType}</td>
                        <td className={CELL_CLS + " font-bold"}>{s.price} ج.م</td>
                        <td className={CELL_CLS}><span className={`px-2 py-0.5 rounded-full text-xs ${s.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{s.isActive ? 'نشط' : 'غير نشط'}</span></td>
                        <td className={CELL_CLS}>
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => setModal({ type: 'service', data: s })}><PencilIcon className="w-4 h-4 text-gray-500" /></button>
                            <button onClick={async () => { try { await hotelApi.services.delete(s.id); loadAll(); } catch (e: any) { setError(e.message); } }}><TrashIcon className="w-4 h-4 text-red-500" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {folioSubTab === 'rates' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold">الأسعار الموسمية</h2>
                <button className={BTN_PRIMARY} onClick={() => setModal({ type: 'rate' })}>إضافة سعر</button>
              </div>
              <div className="space-y-3">
                {filteredRoomTypes.map(rt => {
                  const rtRates = roomRates.filter(r => r.roomTypeId === rt.id);
                  return (
                    <div key={rt.id} className="border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                      <p className="font-medium text-sm">{rt.name} - <span className="text-blue-600">{rt.basePrice} ج.م</span> (أساسي)</p>
                      {rtRates.length > 0 ? (
                        <div className="mt-2 space-y-1 pr-4">
                          {rtRates.map(rr => (
                            <div key={rr.id} className="flex justify-between text-xs text-gray-500">
                              <span>{rr.label || 'سعر موسمي'}: {new Date(rr.dateFrom).toLocaleDateString('ar-EG')} → {new Date(rr.dateTo).toLocaleDateString('ar-EG')}</span>
                              <span><span className="font-bold text-gray-700">{rr.price} ج.م</span> <button className="text-red-500 mr-2" onClick={async () => { await hotelApi.rates.delete(rr.id); loadAll(); }}>×</button></span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-gray-400 pr-4 mt-1">لا توجد أسعار موسمية</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Policies Tab ── */}
      {tab === 'policies' && (
        <div className="max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold">سياسة الفندق</h2>
            <button className={BTN_PRIMARY} onClick={() => setModal({ type: 'policy', data: policies })}>
              <PencilIcon className="w-4 h-4 inline ml-1" />تعديل
            </button>
          </div>
          {!policies ? (
            <p className="text-gray-500">جاري التحميل...</p>
          ) : (
            <div className="space-y-4">
              <div className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                <h3 className="font-medium text-sm mb-2">⏰ أوقات الدخول والخروج</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>تسجيل الوصول: {policies.checkInTime || '14:00'}</span>
                  <span>تسجيل المغادرة: {policies.checkOutTime || '12:00'}</span>
                  {policies.earlyCheckInFee > 0 && <span>رسوم الدخول المبكر: {policies.earlyCheckInFee} ج.م</span>}
                  {policies.lateCheckOutFee > 0 && <span>رسوم المغادرة المتأخرة: {policies.lateCheckOutFee} ج.م</span>}
                </div>
              </div>
              <div className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                <h3 className="font-medium text-sm mb-2">📋 سياسة الإلغاء</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  إلغاء مجاني قبل {policies.cancelFreeBefore} أيام من تاريخ الوصول. بعد ذلك، {policies.cancelPenaltyPct}% من قيمة الحجز.
                </p>
              </div>
              <div className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                <h3 className="font-medium text-sm mb-2">👶 سياسة الأطفال</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {policies.childrenAllowed ? 'مسموح بوجود أطفال' : 'غير مسموح بوجود أطفال'}
                  {policies.extraBedPrice > 0 && ` | سرير إضافي: ${policies.extraBedPrice} ج.م`}
                </p>
              </div>
              <div className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                <h3 className="font-medium text-sm mb-2">🚭 سياسات عامة</h3>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p>{policies.smokingAllowed ? 'التدخين مسموح' : 'التدخين ممنوع'}</p>
                  <p>{policies.visitorsAllowed ? `الزوار مسموح بهم (${policies.visitorsHours || '10:00-20:00'})` : 'الزوار غير مسموح بهم'}</p>
                  {policies.quietHoursFrom && policies.quietHoursTo && (
                    <p>ساعات الهدوء: من {policies.quietHoursFrom} إلى {policies.quietHoursTo}</p>
                  )}
                </div>
              </div>
              {policies.customRules && Array.isArray(policies.customRules) && policies.customRules.length > 0 && (
                <div className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                  <h3 className="font-medium text-sm mb-2">📜 قواعد إضافية</h3>
                  <ul className="list-disc pr-5 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {policies.customRules.map((rule: string, i: number) => <li key={i}>{rule}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {modal?.type === 'property' && <PropertyModal data={modal.data} onClose={() => setModal(null)} onSaved={onSaved} onError={onError} />}
      {modal?.type === 'roomType' && <RoomTypeModal properties={properties} selectedProperty={selectedProperty} data={modal.data} onClose={() => setModal(null)} onSaved={onSaved} onError={onError} />}
      {modal?.type === 'room' && <RoomModal properties={properties} roomTypes={roomTypes} selectedProperty={selectedProperty} data={modal.data} onClose={() => setModal(null)} onSaved={onSaved} onError={onError} />}
      {modal?.type === 'reservation' && <ReservationModal properties={properties} roomTypes={roomTypes} rooms={rooms} selectedProperty={selectedProperty} onClose={() => setModal(null)} onSaved={onSaved} onError={onError} />}
      {modal?.type === 'folio' && <FolioModal reservations={reservations} preselectedId={modal.data?.reservationId} onClose={() => setModal(null)} onSaved={onSaved} onError={onError} />}
      {modal?.type === 'rate' && <RateModal roomTypes={roomTypes} selectedProperty={selectedProperty} onClose={() => setModal(null)} onSaved={onSaved} onError={onError} />}
      {modal?.type === 'service' && <ServiceModal data={modal.data} onClose={() => setModal(null)} onSaved={onSaved} onError={onError} />}
      {modal?.type === 'policy' && <PolicyModal data={modal.data} onClose={() => setModal(null)} onSaved={onSaved} onError={onError} />}
    </div>
    </div>
  );
}
