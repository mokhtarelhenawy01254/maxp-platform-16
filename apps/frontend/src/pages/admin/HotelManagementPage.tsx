import { useState, useEffect } from "react";
import {
  hotelApi,
  HotelProperty,
  HotelRoomType,
  HotelRoom,
  HotelReservation,
  HotelService,
  HotelPolicy,
  HotelRoomRate,
  ROOM_STATUS_LABELS,
  ROOM_STATUS_COLORS,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_COLORS,
  FOLIO_TYPE_LABELS,
} from "./hotel/shared";
import {
  Building2,
  Home,
  Key,
  Calendar,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Search,
  Settings,
  Phone,
  Clock,
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

import PropertyModal from "./hotel/PropertyModal";
import RoomTypeModal from "./hotel/RoomTypeModal";
import RoomModal from "./hotel/RoomModal";
import ReservationModal from "./hotel/ReservationModal";
import FolioModal from "./hotel/FolioModal";
import RateModal from "./hotel/RateModal";
import ServiceModal from "./hotel/ServiceModal";
import PolicyModal from "./hotel/PolicyModal";
import PriceTierModal from "./hotel/PriceTierModal";
import { Button } from "../../components/ui/button";

type TabId =
  | "properties"
  | "roomTypes"
  | "rooms"
  | "reservations"
  | "folio"
  | "policies";

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "properties", label: "الفنادق", icon: Building2 },
  { id: "roomTypes", label: "أنواع الغرف", icon: Home },
  { id: "rooms", label: "الغرف", icon: Key },
  { id: "reservations", label: "الحجوزات", icon: Calendar },
  { id: "folio", label: "الخدمات والأسعار", icon: DollarSign },
  { id: "policies", label: "السياسات", icon: Settings },
];

const CELL_CLS = "py-2.5 px-3.5";

const fetchJson = async (fn: () => Promise<any>, retries = 2): Promise<any> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const data = await fn();
      return data;
    } catch (e: any) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
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
  const [folioSubTab, setFolioSubTab] = useState<
    "folio" | "services" | "rates"
  >("folio");
  const [modal, setModal] = useState<{ type: string; data?: any } | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [props, rtypes, rms, resvs, svcs, rrates, pols] = await Promise.all([
        fetchJson(() =>
          hotelApi.properties.list().then((r) => (r.success ? r.data : [])),
        ),
        fetchJson(() =>
          hotelApi.roomTypes.list().then((r) => (r.success ? r.data : [])),
        ),
        fetchJson(() =>
          hotelApi.rooms.list().then((r) => (r.success ? r.data : [])),
        ),
        fetchJson(() =>
          hotelApi.reservations.list().then((r) => (r.success ? r.data : [])),
        ),
        fetchJson(() =>
          hotelApi.services.list().then((r) => (r.success ? r.data : [])),
        ),
        fetchJson(() =>
          hotelApi.rates.list().then((r) => (r.success ? r.data : [])),
        ),
        fetchJson(() =>
          hotelApi.policies.get().then((r) => (r.success ? r.data : null)),
        ),
      ]);
      setProperties(props);
      setRoomTypes(rtypes);
      setRooms(rms);
      setReservations(resvs);
      setServices(svcs);
      setRoomRates(rrates);
      setPolicies(pols);
      if (props.length && !selectedProperty) setSelectedProperty(props[0].id);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredRooms = rooms.filter(
    (r) =>
      (!selectedProperty || r.propertyId === selectedProperty) &&
      (!search || r.roomNumber.toLowerCase().includes(search.toLowerCase())),
  );
  const filteredReservations = reservations.filter(
    (r) =>
      (!selectedProperty || r.propertyId === selectedProperty) &&
      (!search || r.customerName.includes(search)),
  );
  const filteredRoomTypes = roomTypes.filter(
    (r) => !selectedProperty || r.propertyId === selectedProperty,
  );

  const onSaved = async () => {
    await loadAll();
    setModal(null);
  };
  const onError = (msg: string) => setError(msg);

  const handleDelete = async (fn: () => Promise<any>) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    try {
      await fn();
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <RefreshCw className="size-4 animate-spin text-primary" />
          <span>جاري تحميل بيانات نظام الفنادق والغرف...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" dir="rtl">
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <Building2 className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                نظام إدارة الفنادق
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                {properties.length} فنادق
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              إدارة العقارات الفندقية، أنواع الغرف، الحجوزات، والخدمات الإضافية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {tab === "properties" && (
            <Button
              size="sm"
              onClick={() => setModal({ type: "property" })}
              className="h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.98] transition-transform"
            >
              <Plus className="size-3.5" />
              <span>إضافة فندق</span>
            </Button>
          )}
          {tab === "roomTypes" && (
            <Button
              size="sm"
              onClick={() => setModal({ type: "roomType" })}
              className="h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.98] transition-transform"
            >
              <Plus className="size-3.5" />
              <span>إضافة نوع غرفة</span>
            </Button>
          )}
          {tab === "rooms" && (
            <Button
              size="sm"
              onClick={() => setModal({ type: "room" })}
              className="h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.98] transition-transform"
            >
              <Plus className="size-3.5" />
              <span>إضافة غرفة</span>
            </Button>
          )}
          {tab === "reservations" && (
            <Button
              size="sm"
              onClick={() => setModal({ type: "reservation" })}
              className="h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.98] transition-transform"
            >
              <Plus className="size-3.5" />
              <span>حجز جديد</span>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Single-Surface Chassis with Tabs */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        {/* Chassis Top Bar: Tabs + Filters */}
        <div className="p-2 sm:p-2.5 border-b border-border/60 bg-muted/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Tab Buttons */}
          <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/40 text-xs shrink-0 overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
                    tab === t.id
                      ? "bg-card text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="h-8 border border-border rounded-lg px-2.5 text-xs bg-card text-foreground outline-none font-medium"
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
            >
              <option value="">كل الفنادق</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="relative w-full sm:w-48">
              <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full h-8 border border-border rounded-lg pr-8 pl-2.5 text-xs bg-card text-foreground placeholder:text-muted-foreground outline-none"
                placeholder="بحث..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-5">
          {/* PROPERTIES TAB */}
          {tab === "properties" && (
            <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
              {properties
                .filter((p) => !selectedProperty || p.id === selectedProperty)
                .map((p) => (
                  <div
                    key={p.id}
                    className="border border-border/80 rounded-xl p-3.5 bg-muted/10 hover:bg-muted/25 transition-colors space-y-2.5"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-semibold text-sm text-foreground">
                          {p.name}
                        </h3>
                        {p.city && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {p.city} - {p.address}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setModal({ type: "property", data: p })}
                          className="size-7 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleDelete(() => hotelApi.properties.delete(p.id))
                          }
                          className="size-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>

                    {p.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                        <Phone className="size-3 text-muted-foreground/70" />
                        <span>{p.phone}</span>
                      </p>
                    )}

                    <div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between border-t border-border/40 pt-2">
                      <span>
                        الوصول: {p.checkInTime} | المغادرة: {p.checkOutTime}
                      </span>
                      <span>{p.roomTypes?.length || 0} أنواع غرف</span>
                    </div>
                  </div>
                ))}
              {properties.length === 0 && (
                <div className="p-12 text-center col-span-full border border-dashed border-border/80 rounded-xl">
                  <Building2 className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">لا توجد فنادق مسجلة بعد</p>
                </div>
              )}
            </div>
          )}

          {/* ROOM TYPES TAB */}
          {tab === "roomTypes" && (
            <div className="border border-border/60 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-right">
                <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground">
                  <tr>
                    <th className={CELL_CLS}>الاسم</th>
                    <th className={CELL_CLS}>العربية</th>
                    <th className={CELL_CLS + " text-center"}>السعة</th>
                    <th className={CELL_CLS + " text-center"}>السعر</th>
                    <th className={CELL_CLS + " text-center"}>الغرف</th>
                    <th className={CELL_CLS}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {filteredRoomTypes.map((rt) => (
                    <tr
                      key={rt.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className={CELL_CLS + " font-sans font-medium text-foreground"}>
                        {rt.name}
                      </td>
                      <td className={CELL_CLS + " font-sans text-muted-foreground"}>
                        {rt.nameAr || "-"}
                      </td>
                      <td className={CELL_CLS + " text-center tabular-nums"}>
                        {rt.capacity}
                      </td>
                      <td className={CELL_CLS + " text-center font-bold text-foreground tabular-nums"}>
                        {rt.basePrice} ج.م
                      </td>
                      <td className={CELL_CLS + " text-center tabular-nums text-muted-foreground"}>
                        {rt._count?.rooms || 0}/{rt.totalRooms}
                      </td>
                      <td className={CELL_CLS}>
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setModal({ type: "roomType", data: rt })}
                            className="size-6 text-muted-foreground hover:text-foreground"
                            title="تعديل"
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setModal({ type: "priceTier", data: rt })}
                            className="h-6 px-1.5 text-[10px] font-mono"
                            title="تسعير حسب النزلاء"
                          >
                            1-4
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleDelete(() => hotelApi.roomTypes.delete(rt.id))
                            }
                            className="size-6 text-muted-foreground hover:text-destructive"
                            title="حذف"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ROOMS TAB */}
          {tab === "rooms" && (
            <div className="border border-border/60 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-right">
                <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground">
                  <tr>
                    <th className={CELL_CLS}>الغرفة</th>
                    <th className={CELL_CLS + " text-center"}>الدور</th>
                    <th className={CELL_CLS}>النوع</th>
                    <th className={CELL_CLS + " text-center"}>الحالة</th>
                    <th className={CELL_CLS}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {filteredRooms.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className={CELL_CLS + " font-bold text-foreground tabular-nums"}>
                        {r.roomNumber}
                      </td>
                      <td className={CELL_CLS + " text-center tabular-nums text-muted-foreground"}>
                        {r.floor || "-"}
                      </td>
                      <td className={CELL_CLS + " font-sans text-muted-foreground"}>
                        {r.roomType?.name || "-"}
                      </td>
                      <td className={CELL_CLS + " text-center"}>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] border ${
                            ROOM_STATUS_COLORS[r.status] || ""
                          }`}
                        >
                          {ROOM_STATUS_LABELS[r.status] || r.status}
                        </span>
                      </td>
                      <td className={CELL_CLS}>
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setModal({ type: "room", data: r })}
                            className="size-6 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleDelete(() => hotelApi.rooms.delete(r.id))
                            }
                            className="size-6 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* RESERVATIONS TAB */}
          {tab === "reservations" && (
            <div className="space-y-3">
              {filteredReservations.map((r) => (
                <div
                  key={r.id}
                  className="border border-border/80 rounded-xl p-3.5 bg-muted/10 hover:bg-muted/20 transition-colors space-y-2.5"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">
                        {r.customerName}
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {r.property?.name} |{" "}
                        {new Date(r.checkIn).toLocaleDateString("ar-EG")} ←{" "}
                        {new Date(r.checkOut).toLocaleDateString("ar-EG")}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.adults} بالغين، {r.children} أطفال | {r.rooms?.length || 0} غرف
                      </p>
                    </div>
                    <div className="text-left font-mono shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] border ${
                          RESERVATION_STATUS_COLORS[r.status] || ""
                        }`}
                      >
                        {RESERVATION_STATUS_LABELS[r.status] || r.status}
                      </span>
                      <p className="font-bold text-sm text-foreground tabular-nums mt-1">
                        {r.totalAmount} ج.م
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {r.status === "PENDING" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-primary border-primary/30"
                        onClick={async () => {
                          await hotelApi.reservations.updateStatus(r.id, "CONFIRMED");
                          loadAll();
                        }}
                      >
                        تأكيد الحجز
                      </Button>
                    )}
                    {r.status === "CONFIRMED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-emerald-600 border-emerald-500/30"
                        onClick={async () => {
                          await hotelApi.reservations.updateStatus(r.id, "CHECKED_IN");
                          loadAll();
                        }}
                      >
                        تسجيل وصول
                      </Button>
                    )}
                    {r.status === "CHECKED_IN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={async () => {
                          await hotelApi.reservations.updateStatus(r.id, "CHECKED_OUT");
                          loadAll();
                        }}
                      >
                        تسجيل مغادرة
                      </Button>
                    )}
                    {(r.status === "PENDING" || r.status === "CONFIRMED") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                        onClick={async () => {
                          await hotelApi.reservations.updateStatus(r.id, "CANCELLED");
                          loadAll();
                        }}
                      >
                        إلغاء
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() =>
                        setModal({ type: "folio", data: { reservationId: r.id } })
                      }
                    >
                      + إضافة خدمة
                    </Button>
                  </div>

                  {r.folio?.length > 0 && (
                    <div className="border-t border-border/40 pt-2 space-y-1">
                      <p className="text-[11px] font-medium text-muted-foreground">
                        الخدمات الإضافية:
                      </p>
                      {r.folio.map((f) => (
                        <div
                          key={f.id}
                          className="flex justify-between text-[11px] text-muted-foreground font-mono"
                        >
                          <span>
                            {f.description} ({FOLIO_TYPE_LABELS[f.itemType] || f.itemType}) x
                            {f.quantity}
                          </span>
                          <span className="font-bold tabular-nums">
                            {f.amount * f.quantity} ج.م
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {filteredReservations.length === 0 && (
                <div className="p-12 text-center border border-dashed border-border/80 rounded-xl">
                  <Calendar className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">لا توجد حجوزات مسجلة</p>
                </div>
              )}
            </div>
          )}

          {/* FOLIO & RATES TAB */}
          {tab === "folio" && (
            <div className="space-y-4">
              <div className="flex gap-1 border-b border-border/60 pb-2">
                {(["folio", "services", "rates"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFolioSubTab(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      folioSubTab === st
                        ? "bg-card text-foreground font-semibold shadow-2xs border border-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st === "folio"
                      ? "الخدمات المضافة (Folio)"
                      : st === "services"
                      ? "كتالوج الخدمات"
                      : "الأسعار الموسمية"}
                  </button>
                ))}
              </div>

              {folioSubTab === "folio" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      الخدمات المسجلة للحجوزات النشطة
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setModal({ type: "folio" })}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Plus className="size-3.5" />
                      <span>إضافة خدمة لحجز</span>
                    </Button>
                  </div>
                  {reservations
                    .filter((r) => r.status === "CHECKED_IN" || r.status === "CONFIRMED")
                    .map((r) => (
                      <div
                        key={r.id}
                        className="border border-border/70 rounded-xl p-3 bg-muted/10 space-y-2"
                      >
                        <p className="font-semibold text-xs text-foreground">
                          {r.customerName} - {r.property?.name}
                        </p>
                        {r.folio?.map((f) => (
                          <div
                            key={f.id}
                            className="flex justify-between text-xs text-muted-foreground font-mono"
                          >
                            <span>
                              {f.description}{" "}
                              <span className="text-muted-foreground/60">
                                ({FOLIO_TYPE_LABELS[f.itemType] || f.itemType})
                              </span>
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="font-bold tabular-nums">
                                {f.amount * f.quantity} ج.م
                              </span>
                              <button
                                className="text-destructive hover:opacity-80"
                                onClick={async () => {
                                  await hotelApi.folio.remove(r.id, f.id);
                                  loadAll();
                                }}
                              >
                                ×
                              </button>
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                </div>
              )}

              {folioSubTab === "services" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      كتالوج الخدمات المتاحة بالفندق
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setModal({ type: "service" })}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Plus className="size-3.5" />
                      <span>إضافة خدمة جديدة</span>
                    </Button>
                  </div>
                  <div className="border border-border/60 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground">
                        <tr>
                          <th className={CELL_CLS}>الخدمة</th>
                          <th className={CELL_CLS}>بالعربية</th>
                          <th className={CELL_CLS}>النوع</th>
                          <th className={CELL_CLS + " text-center"}>السعر</th>
                          <th className={CELL_CLS + " text-center"}>الحالة</th>
                          <th className={CELL_CLS}></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-mono">
                        {services.map((s) => (
                          <tr
                            key={s.id}
                            className="hover:bg-muted/20 transition-colors"
                          >
                            <td className={CELL_CLS + " font-sans font-medium text-foreground"}>
                              {s.name}
                            </td>
                            <td className={CELL_CLS + " font-sans text-muted-foreground"}>
                              {s.nameAr || "-"}
                            </td>
                            <td className={CELL_CLS + " text-muted-foreground"}>
                              {FOLIO_TYPE_LABELS[s.itemType] || s.itemType}
                            </td>
                            <td className={CELL_CLS + " text-center font-bold text-foreground tabular-nums"}>
                              {s.price} ج.م
                            </td>
                            <td className={CELL_CLS + " text-center"}>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] border ${
                                  s.isActive
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-muted text-muted-foreground border-border/40"
                                }`}
                              >
                                {s.isActive ? "نشط" : "معطل"}
                              </span>
                            </td>
                            <td className={CELL_CLS}>
                              <div className="flex gap-1 justify-end">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setModal({ type: "service", data: s })}
                                  className="size-6 text-muted-foreground hover:text-foreground"
                                >
                                  <Pencil className="size-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={async () => {
                                    try {
                                      await hotelApi.services.delete(s.id);
                                      loadAll();
                                    } catch (e: any) {
                                      setError(e.message);
                                    }
                                  }}
                                  className="size-6 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {folioSubTab === "rates" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      تخصيص الأسعار في المواسم والعطلات
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setModal({ type: "rate" })}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Plus className="size-3.5" />
                      <span>إضافة سعر موسمي</span>
                    </Button>
                  </div>
                  <div className="space-y-2.5">
                    {filteredRoomTypes.map((rt) => {
                      const rtRates = roomRates.filter((r) => r.roomTypeId === rt.id);
                      return (
                        <div
                          key={rt.id}
                          className="border border-border/70 rounded-xl p-3 bg-muted/10"
                        >
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-foreground">
                              {rt.name}
                            </span>
                            <span className="font-mono font-bold text-primary tabular-nums">
                              {rt.basePrice} ج.م (أساسي)
                            </span>
                          </div>
                          {rtRates.length > 0 ? (
                            <div className="mt-2 space-y-1 text-xs divide-y divide-border/30">
                              {rtRates.map((rr) => (
                                <div
                                  key={rr.id}
                                  className="flex justify-between items-center pt-1 text-muted-foreground font-mono"
                                >
                                  <span>
                                    {rr.label || "سعر موسمي"}:{" "}
                                    {new Date(rr.dateFrom).toLocaleDateString("ar-EG")}{" "}
                                    ← {new Date(rr.dateTo).toLocaleDateString("ar-EG")}
                                  </span>
                                  <span className="flex items-center gap-2">
                                    <span className="font-bold text-foreground tabular-nums">
                                      {rr.price} ج.م
                                    </span>
                                    <button
                                      className="text-destructive hover:opacity-80"
                                      onClick={async () => {
                                        await hotelApi.rates.delete(rr.id);
                                        loadAll();
                                      }}
                                    >
                                      ×
                                    </button>
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              لا توجد أسعار موسمية مخصصة
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* POLICIES TAB */}
          {tab === "policies" && (
            <div className="max-w-2xl space-y-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">
                  سياسات الإلغاء والدخول والإقامة
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModal({ type: "policy", data: policies })}
                  className="h-8 text-xs gap-1.5"
                >
                  <Pencil className="size-3" />
                  <span>تعديل السياسات</span>
                </Button>
              </div>

              {!policies ? (
                <p className="text-xs text-muted-foreground">لا توجد سياسات مسجلة</p>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="border border-border/70 rounded-xl p-3.5 bg-muted/10 space-y-2">
                    <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="size-3.5 text-primary" />
                      <span>أوقات الدخول والخروج</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-muted-foreground font-mono">
                      <span>تسجيل الوصول: {policies.checkInTime || "14:00"}</span>
                      <span>تسجيل المغادرة: {policies.checkOutTime || "12:00"}</span>
                      {policies.earlyCheckInFee > 0 && (
                        <span>رسوم الدخول المبكر: {policies.earlyCheckInFee} ج.م</span>
                      )}
                      {policies.lateCheckOutFee > 0 && (
                        <span>رسوم المغادرة المتأخرة: {policies.lateCheckOutFee} ج.م</span>
                      )}
                    </div>
                  </div>

                  <div className="border border-border/70 rounded-xl p-3.5 bg-muted/10 space-y-2">
                    <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                      <Shield className="size-3.5 text-primary" />
                      <span>سياسة الإلغاء</span>
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      إلغاء مجاني قبل {policies.cancelFreeBefore} أيام من تاريخ الوصول.
                      بعد ذلك يتم خصم {policies.cancelPenaltyPct}% من قيمة الحجز.
                    </p>
                  </div>

                  <div className="border border-border/70 rounded-xl p-3.5 bg-muted/10 space-y-2">
                    <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                      <Users className="size-3.5 text-primary" />
                      <span>سياسة الأطفال والنزلاء</span>
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {policies.childrenAllowed
                        ? "مسموح بوجود أطفال"
                        : "غير مسموح بوجود أطفال"}
                      {policies.extraBedPrice > 0 &&
                        ` | سرير إضافي: ${policies.extraBedPrice} ج.م`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === "property" && (
        <PropertyModal
          data={modal.data}
          onClose={() => setModal(null)}
          onSaved={onSaved}
          onError={onError}
        />
      )}
      {modal?.type === "roomType" && (
        <RoomTypeModal
          properties={properties}
          selectedProperty={selectedProperty}
          data={modal.data}
          onClose={() => setModal(null)}
          onSaved={onSaved}
          onError={onError}
        />
      )}
      {modal?.type === "room" && (
        <RoomModal
          properties={properties}
          roomTypes={roomTypes}
          selectedProperty={selectedProperty}
          data={modal.data}
          onClose={() => setModal(null)}
          onSaved={onSaved}
          onError={onError}
        />
      )}
      {modal?.type === "reservation" && (
        <ReservationModal
          properties={properties}
          roomTypes={roomTypes}
          rooms={rooms}
          selectedProperty={selectedProperty}
          onClose={() => setModal(null)}
          onSaved={onSaved}
          onError={onError}
        />
      )}
      {modal?.type === "folio" && (
        <FolioModal
          reservations={reservations}
          preselectedId={modal.data?.reservationId}
          onClose={() => setModal(null)}
          onSaved={onSaved}
          onError={onError}
        />
      )}
      {modal?.type === "rate" && (
        <RateModal
          roomTypes={roomTypes}
          selectedProperty={selectedProperty}
          onClose={() => setModal(null)}
          onSaved={onSaved}
          onError={onError}
        />
      )}
      {modal?.type === "service" && (
        <ServiceModal
          data={modal.data}
          onClose={() => setModal(null)}
          onSaved={onSaved}
          onError={onError}
        />
      )}
      {modal?.type === "policy" && (
        <PolicyModal
          data={modal.data}
          onClose={() => setModal(null)}
          onSaved={onSaved}
          onError={onError}
        />
      )}
      {modal?.type === "priceTier" && (
        <PriceTierModal
          roomType={modal.data}
          onClose={() => setModal(null)}
          onSaved={onSaved}
          onError={onError}
        />
      )}
    </div>
  );
}
