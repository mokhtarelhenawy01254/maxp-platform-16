import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";

interface Patient {
  id: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  gender?: string;
  bloodType?: string;
  _count?: { appointments: number };
}

const DoctorPatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const token = localStorage.getItem('doctorToken');
        const res = await fetch('/api/v1/booking/doctor-portal/patients', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setPatients(json.data || []);
      } catch {}
      finally { setLoading(false); }
    };
    fetchPatients();
  }, []);

  const filtered = patients.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.firstName || "").toLowerCase().includes(q)
      || (p.lastName || "").toLowerCase().includes(q)
      || (p.phone || "").toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">مرضاي</h1>
        <div className="relative"><Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" /><input className="border rounded-lg pr-9 pl-3 py-2 text-sm w-56" placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-12 text-gray-400">لا يوجد مرضى بعد</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b bg-gray-50 text-gray-500 text-sm">{["الاسم", "الهاتف", "الجنس", "فصيلة الدم", "الزيارات"].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}</tr></thead>
            <tbody>{filtered.map(p => (
              <tr key={p.id} className="border-b hover:bg-gray-50 text-sm">
                <td className="py-3 px-4 font-medium">{p.firstName} {p.lastName || ""}</td>
                <td className="py-3 px-4" dir="ltr">{p.phone || "—"}</td>
                <td className="py-3 px-4 text-gray-500">{p.gender ? (p.gender === "female" ? "أنثى" : "ذكر") : "—"}</td>
                <td className="py-3 px-4 text-gray-500">{p.bloodType || "—"}</td>
                <td className="py-3 px-4 text-gray-500">{p._count?.appointments ?? 0}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DoctorPatientsPage;
