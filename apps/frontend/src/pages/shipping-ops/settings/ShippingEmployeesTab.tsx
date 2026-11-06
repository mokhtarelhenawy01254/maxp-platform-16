import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Briefcase,
  Link2,
  Unlink,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  X,
  UserCheck,
} from 'lucide-react';
import { shippingOpsService, ShippingEmployeeItem } from '../../../services/shippingOpsService';

interface TeamMemberUser {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

export const ShippingEmployeesTab: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [employees, setEmployees] = useState<ShippingEmployeeItem[]>([]);
  const [teamUsers, setTeamUsers] = useState<TeamMemberUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<ShippingEmployeeItem | null>(null);
  const [linkingEmployee, setLinkingEmployee] = useState<ShippingEmployeeItem | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    employeeCode: '',
    fullName: '',
    jobTitle: '',
    photoUrl: '',
    personalPhone: '',
    workPhone: '',
    hireDate: '',
    isActive: true,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [empList, teamRes] = await Promise.allSettled([
        shippingOpsService.getEmployees({ search: search || undefined }),
        fetch('/api/v1/team/members', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
        }).then((r) => r.json()),
      ]);

      if (empList.status === 'fulfilled') {
        setEmployees(empList.value || []);
      }
      if (teamRes.status === 'fulfilled' && teamRes.value?.success) {
        setTeamUsers(teamRes.value.members || teamRes.value.data || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل تحميل قائمة الموظفين');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditingEmployee(null);
    setFormData({
      employeeCode: `EMP-${Math.floor(100 + Math.random() * 900)}`,
      fullName: '',
      jobTitle: isEn ? 'Courier Coordinator' : 'مسؤول استلام وشحن',
      photoUrl: '',
      personalPhone: '',
      workPhone: '',
      hireDate: new Date().toISOString().slice(0, 10),
      isActive: true,
    });
    setShowAddModal(true);
  };

  const openEdit = (emp: ShippingEmployeeItem) => {
    setEditingEmployee(emp);
    setFormData({
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      jobTitle: emp.jobTitle,
      photoUrl: emp.photoUrl || '',
      personalPhone: emp.personalPhone || '',
      workPhone: emp.workPhone || '',
      hireDate: emp.hireDate ? emp.hireDate.slice(0, 10) : '',
      isActive: emp.isActive,
    });
    setShowAddModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeCode || !formData.fullName || !formData.jobTitle) {
      setError(isEn ? 'Required fields: Code, Name, Job Title' : 'الحقول المطلوبة: الكود، الاسم، والمسمى الوظيفي');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      if (editingEmployee) {
        await shippingOpsService.updateEmployee(editingEmployee.id, formData);
        setSuccessMsg(isEn ? 'Employee updated' : 'تم تحديث بيانات الموظف بنجاح');
      } else {
        await shippingOpsService.createEmployee(formData);
        setSuccessMsg(isEn ? 'Employee created' : 'تم إضافة الموظف الجديد بنجاح');
      }
      setShowAddModal(false);
      loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل حفظ بيانات الموظف');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(isEn ? 'Delete this employee record?' : 'هل أنت متأكد من حذف ملف الموظف؟')) return;
    try {
      await shippingOpsService.deleteEmployee(id);
      setSuccessMsg(isEn ? 'Employee deleted' : 'تم حذف ملف الموظف');
      loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل حذف الموظف');
    }
  };

  const handleLinkUser = async () => {
    if (!linkingEmployee) return;
    if (!selectedUserId) {
      setError(isEn ? 'Please select a user account' : 'يرجى اختيار حساب المستخدم للربط');
      return;
    }
    try {
      setSaving(true);
      await shippingOpsService.linkEmployeeUser(linkingEmployee.id, selectedUserId);
      setSuccessMsg(isEn ? 'Account linked' : 'تم ربط الموظف بحساب المستخدم');
      setLinkingEmployee(null);
      loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل ربط الحساب');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkUser = async (emp: ShippingEmployeeItem) => {
    try {
      await shippingOpsService.unlinkEmployeeUser(emp.id);
      setSuccessMsg(isEn ? 'Account unlinked' : 'تم إلغاء ربط الموظف بحساب المستخدم');
      loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل إلغاء الربط');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isEn ? 'Search employees by name, code, phone...' : 'بحث بالاسم، الكود، الهاتف، أو المسمى...'}
            className="w-full pr-9 pl-3 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="تحديث"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isEn ? 'Add Employee' : 'إضافة موظف جديد'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                <th className="px-4 py-3 text-center w-12">#</th>
                <th className="px-4 py-3">{isEn ? 'Employee' : 'الموظف'}</th>
                <th className="px-4 py-3">{isEn ? 'Code' : 'الكود'}</th>
                <th className="px-4 py-3">{isEn ? 'Job Title' : 'المسمى الوظيفي'}</th>
                <th className="px-4 py-3">{isEn ? 'Phone' : 'الهاتف'}</th>
                <th className="px-4 py-3">{isEn ? 'Linked User' : 'حساب المنصة'}</th>
                <th className="px-4 py-3">{isEn ? 'Status' : 'الحالة'}</th>
                <th className="px-4 py-3 text-center">{isEn ? 'Actions' : 'إجراءات'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    {loading ? (isEn ? 'Loading...' : 'جاري التحميل...') : (isEn ? 'No employees found' : 'لا يوجد موظفون مسجلون حالياً')}
                  </td>
                </tr>
              ) : (
                employees.map((emp, idx) => {
                  const linkedUser = teamUsers.find((u) => u.id === emp.userId);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {emp.photoUrl ? (
                            <img src={emp.photoUrl} alt={emp.fullName} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                              {emp.fullName.slice(0, 2)}
                            </div>
                          )}
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{emp.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                          {emp.employeeCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{emp.jobTitle}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {emp.workPhone || emp.personalPhone || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {emp.userId ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <UserCheck className="w-3 h-3" />
                            <span>{linkedUser?.name || linkedUser?.email || 'مربوط'}</span>
                            <button
                              onClick={() => handleUnlinkUser(emp)}
                              className="text-slate-400 hover:text-red-500 mr-1"
                              title="إلغاء الربط"
                            >
                              <Unlink className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setLinkingEmployee(emp);
                              setSelectedUserId('');
                            }}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>{isEn ? 'Link User' : 'ربط بحساب'}</span>
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            emp.isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {emp.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>{emp.isActive ? (isEn ? 'Active' : 'نشط') : (isEn ? 'Inactive' : 'معطل')}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openEdit(emp)}
                            className="p-1 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id)}
                            className="p-1 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 w-full max-w-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>{editingEmployee ? (isEn ? 'Edit Employee' : 'تعديل بيانات الموظف') : (isEn ? 'New Employee' : 'إضافة موظف جديد')}</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {isEn ? 'Employee Code *' : 'كود الموظف *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.toUpperCase() })}
                    placeholder="EMP-001"
                    className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-1.5 text-xs sm:text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {isEn ? 'Full Name *' : 'الاسم بالكامل *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="أحمد محمد علي"
                    className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-1.5 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {isEn ? 'Job Title *' : 'المسمى الوظيفي *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  placeholder="مسؤول استلام / مندوب تسليم / مدير فرع"
                  className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-1.5 text-xs sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {isEn ? 'Work Phone' : 'هاتف العمل'}
                  </label>
                  <input
                    type="text"
                    value={formData.workPhone}
                    onChange={(e) => setFormData({ ...formData, workPhone: e.target.value })}
                    placeholder="01012345678"
                    className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-1.5 text-xs sm:text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {isEn ? 'Personal Phone' : 'الهاتف الشخصي'}
                  </label>
                  <input
                    type="text"
                    value={formData.personalPhone}
                    onChange={(e) => setFormData({ ...formData, personalPhone: e.target.value })}
                    placeholder="01112345678"
                    className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-1.5 text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {isEn ? 'Photo URL' : 'رابط الصورة'}
                  </label>
                  <input
                    type="url"
                    value={formData.photoUrl}
                    onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-1.5 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {isEn ? 'Hire Date' : 'تاريخ التعيين'}
                  </label>
                  <input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-1.5 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isEn ? 'Active Employee' : 'حساب الموظف نشط'}
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {isEn ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? (isEn ? 'Saving...' : 'جاري الحفظ...') : (isEn ? 'Save Employee' : 'حفظ الموظف')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Account Modal */}
      {linkingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-600" />
                <span>{isEn ? 'Link User Account' : `ربط الموظف: ${linkingEmployee.fullName}`}</span>
              </h3>
              <button onClick={() => setLinkingEmployee(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 text-slate-700 dark:text-slate-300">
                {isEn ? 'Select Team Member' : 'اختر حساب المستخدم التابع للشركة'}
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 text-xs sm:text-sm"
              >
                <option value="">{isEn ? '-- Select user --' : '-- اختر حساب المستخدم --'}</option>
                {teamUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email || u.role || 'عضو'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setLinkingEmployee(null)}
                className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {isEn ? 'Cancel' : 'إلغاء'}
              </button>
              <button
                onClick={handleLinkUser}
                disabled={saving || !selectedUserId}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {saving ? (isEn ? 'Linking...' : 'جاري الربط...') : (isEn ? 'Confirm Link' : 'تأكيد الربط')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ShippingEmployeesTab;
