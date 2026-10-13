import React, { useCallback, useEffect, useState, useMemo } from "react";
import { cn } from "../lib/utils";
import tokenManager from "../utils/tokenManager";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Card, CardContent } from "../components/ui/card";
import {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "../components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useAuth } from "../hooks/useAuthSimple";
import { buildApiUrl } from "../utils/apiHelpers";
import {
  Plus, Edit, Trash2, ChevronDown, Shield, Lock, Search, X, CheckCircle2, Copy
} from "lucide-react";

const DOMAIN_LABELS = {
  DASHBOARD: "لوحة التحكم", ORDERS: "الطلبات", PRODUCTS: "المنتجات",
  CUSTOMERS: "العملاء", CONVERSATIONS: "المحادثات", SETTINGS: "الإعدادات",
  USERS: "المستخدمين", ROLES: "الأدوار والصلاحيات", REPORTS: "التقارير",
  WHATSAPP: "واتساب", FACEBOOK: "فيسبوك", MARKETING: "التسويق",
  STOREFRONT: "المتجر", HR: "الموارد البشرية", FINANCE: "المالية",
  AI: "الذكاء الاصطناعي", INVENTORY: "المخزون",
};

const ROLE_COLORS = {
  OWNER: { border: "border-amber-400 dark:border-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: "text-amber-600", label: "bg-amber-600" },
  COMPANY_ADMIN: { border: "border-blue-400 dark:border-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: "text-blue-600", label: "bg-blue-600" },
  MANAGER: { border: "border-emerald-400 dark:border-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", icon: "text-emerald-600", label: "bg-emerald-600" },
  AGENT: { border: "border-slate-300 dark:border-slate-600", bg: "bg-white dark:bg-slate-950/10", badge: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300", icon: "text-slate-500", label: "bg-slate-500" },
  AFFILIATE: { border: "border-violet-400 dark:border-violet-600", bg: "bg-violet-50 dark:bg-violet-950/20", badge: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300", icon: "text-violet-600", label: "bg-violet-600" },
};
const defaultColor = { border: "border-gray-300 dark:border-gray-600", bg: "bg-white dark:bg-gray-950/10", badge: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300", icon: "text-gray-500", label: "bg-gray-500" };

const SUCCESS = "success";

const RolesManagement = () => {
  const { user } = useAuth();
  const getAuthHeaders = () => tokenManager.createAuthHeaders({ "Content-Type": "application/json" });
  const [roles, setRoles] = useState({});
  const [permissions, setPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [expandedDomain, setExpandedDomain] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "", permissions: [], isActive: true });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedRole, setExpandedRole] = useState(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [roleTypeTab, setRoleTypeTab] = useState("all");

  const getRoleColor = (roleKey) => ROLE_COLORS[roleKey] || defaultColor;

  const showToast = (message) => {
    setToast({ message });
    setTimeout(() => setToast(null), 3000);
  };

  const normalizeOldRole = (roleKey, role) => ({
    id: roleKey, key: roleKey, name: role.name || roleKey,
    description: role.description || "", isBuiltIn: role.isBuiltIn || false,
    isActive: role.isActive !== false,
    permissions: Array.isArray(role.permissions) ? role.permissions.map(p => {
      if (typeof p === "string") return { key: p, name: p };
      if (p.permission) return { key: p.permission.key, name: p.permission.name };
      return { key: p.key || p, name: p.name || p };
    }) : [],
    priority: role.priority || 0, companyId: role.companyId || null,
  });

  const fetchRoles = useCallback(async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      const r = await fetch(buildApiUrl(`permissions/companies/${user.companyId}/roles`), { headers: getAuthHeaders() });
      const d = await r.json();
      if (d.success && Object.keys(d.data || {}).length > 0) setRoles(d.data);
      else {
        const r2 = await fetch(buildApiUrl(`companies/${user.companyId}/roles`), { headers: getAuthHeaders() });
        const d2 = await r2.json();
        if (d2.success) {
          const normalized = {};
          for (const [key, role] of Object.entries(d2.data || {})) normalized[key] = normalizeOldRole(key, role);
          setRoles(normalized);
        } else setError(d.message || "فشل في جلب الأدوار");
      }
    } catch (err) { setError("فشل في جلب البيانات: " + err.message); }
    finally { setLoading(false); }
  }, [user?.companyId]);

  const fetchPermissions = useCallback(async () => {
    setPermissionsLoading(true);
    try {
      const r = await fetch(buildApiUrl("permissions"), { headers: getAuthHeaders() });
      const d = await r.json();
      if (r.ok && d.success) setPermissions(d.data || []);
      else setPermissions([]);
    } catch { setPermissions([]); }
    finally { setPermissionsLoading(false); }
  }, []);

  useEffect(() => { fetchRoles(); fetchPermissions(); }, [fetchPermissions, fetchRoles]);

  const handlePermissionToggle = (permKey) => setFormData(p => ({
    ...p, permissions: p.permissions.includes(permKey) ? p.permissions.filter(pp => pp !== permKey) : [...p.permissions, permKey],
  }));

  const handleSelectAll = (domainPerms) => {
    const domainKeys = domainPerms.map(p => p.key);
    const allSelected = domainKeys.every(k => formData.permissions.includes(k));
    setFormData(p => ({
      ...p,
      permissions: allSelected ? p.permissions.filter(pp => !domainKeys.includes(pp)) : [...p.permissions, ...domainKeys.filter(k => !p.permissions.includes(k))],
    }));
  };

  const handleSubmit = async () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "اسم الدور مطلوب";
    if (permissionsLoading) errors.permissions = "انتظر تحميل الصلاحيات";
    else if (formData.permissions.length === 0) errors.permissions = "يجب اختيار صلاحية واحدة على الأقل";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const roleId = selectedRole?.id;
      const url = editModalOpen ? buildApiUrl(`permissions/companies/${user.companyId}/roles/${roleId}`) : buildApiUrl(`permissions/companies/${user.companyId}/roles`);
      const r = await fetch(url, {
        method: editModalOpen ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...(editModalOpen ? {} : { key: formData.name.trim().replace(/\s+/g, "_").toUpperCase() }),
          name: formData.name.trim(), description: formData.description.trim(),
          permissions: formData.permissions, isActive: formData.isActive,
        }),
      });
      const d = await r.json();
      if (d.success) {
        await fetchRoles();
        setModalOpen(false); setEditModalOpen(false);
        setFormData({ name: "", description: "", permissions: [], isActive: true });
        setSelectedRole(null); setError(null); setSearchQuery("");
        showToast(editModalOpen ? "تم تحديث الدور بنجاح" : "تم إنشاء الدور بنجاح");
      } else setError(d.error || d.message || "فشل في حفظ الدور");
    } catch (err) { setError("فشل في حفظ الدور: " + err.message); }
    finally { setSubmitting(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const roleId = deleteTarget.id;
      const r = await fetch(buildApiUrl(`permissions/companies/${user.companyId}/roles/${roleId}`), { method: "DELETE", headers: getAuthHeaders() });
      const d = await r.json();
      if (d.success) { await fetchRoles(); setError(null); showToast("تم حذف الدور بنجاح"); }
      else setError(d.message || "فشل في حذف الدور");
    } catch (err) { setError("فشل في حذف الدور: " + err.message); }
    finally { setDeleteTarget(null); }
  };

  const handleEditRole = (roleKey, role) => {
    const perms = role.permissions && Array.isArray(role.permissions)
      ? role.permissions.map(p => { if (typeof p === "string") return p; if (p.permission) return p.permission.key || p.permission.name; return p.key || p.name; })
      : [];
    setFormData({ name: role.name, description: role.description || "", permissions: perms, isActive: role.isActive !== false });
    setSelectedRole({ key: roleKey, id: role.id, ...role });
    setEditModalOpen(true);
  };

  const handleDuplicateRole = (roleKey, role) => {
    const perms = role.permissions && Array.isArray(role.permissions)
      ? role.permissions.map(p => { if (typeof p === "string") return p; if (p.permission) return p.permission.key || p.permission.name; return p.key || p.name; })
      : [];
    setFormData({ name: role.name + " (نسخة)", description: role.description || "", permissions: perms, isActive: true });
    setSelectedRole(null);
    setModalOpen(true);
  };

  const groupedPermissions = {};
  for (const perm of permissions) {
    const domain = perm.domain || "OTHER";
    if (!groupedPermissions[domain]) groupedPermissions[domain] = [];
    groupedPermissions[domain].push(perm);
  }

  const filteredGroupedPermissions = {};
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    for (const [domain, perms] of Object.entries(groupedPermissions)) {
      const filtered = perms.filter(p => p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q));
      if (filtered.length > 0) filteredGroupedPermissions[domain] = filtered;
    }
  } else Object.assign(filteredGroupedPermissions, groupedPermissions);

  const getPermName = (p) => {
    if (!p) return "";
    if (typeof p === "string") return p;
    if (p.permission) return p.permission.name || p.permission.key;
    return p.name || p.key || "";
  };

  const getPermKey = (p) => {
    if (!p) return "";
    if (typeof p === "string") return p;
    if (p.permission) return p.permission.key;
    return p.key || p.name || "";
  };

  const filteredRolesList = useMemo(() => {
    return Object.entries(roles).filter(([roleKey, role]) => {
      if (roleTypeTab === "builtin" && !role.isBuiltIn) return false;
      if (roleTypeTab === "custom" && role.isBuiltIn) return false;
      if (roleFilter) {
        const q = roleFilter.toLowerCase();
        return (
          (role.name && role.name.toLowerCase().includes(q)) ||
          roleKey.toLowerCase().includes(q) ||
          (role.description && role.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [roles, roleTypeTab, roleFilter]);

  if (loading) return <div className="flex justify-center items-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="p-4 md:p-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium">
            <CheckCircle2 className="size-4" /> {toast.message}
          </div>
        </div>
      )}

      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">إدارة الأدوار والصلاحيات</h1>
          <p className="text-xs text-muted-foreground">تخصيص مستويات الوصول وتعيين الصلاحيات لفريق العمل</p>
        </div>
        <Button
          onClick={() => { setFormData({ name: "", description: "", permissions: [], isActive: true }); setModalOpen(true); }}
          className="h-8.5 px-3 rounded-lg text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs transition-all active:scale-[0.98] gap-1.5"
        >
          <Plus className="size-3.5" /> إضافة دور جديد
        </Button>
      </div>

      {/* Linear Telemetry Strip */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">إجمالي الأدوار</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {Object.keys(roles).length}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">أدوار النظام الأساسية</span>
              <span className="size-1.5 rounded-full bg-sky-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {Object.values(roles).filter(r => r.isBuiltIn).length}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">أدوار مخصصة</span>
              <span className="size-1.5 rounded-full bg-violet-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {Object.values(roles).filter(r => !r.isBuiltIn).length}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">الأدوار النشطة</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {Object.values(roles).filter(r => r.isActive !== false).length}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
          <Button variant="ghost" size="sm" className="mr-auto" onClick={() => setError(null)}><X className="size-4" /></Button>
        </Alert>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-4">
        <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/40 text-xs shrink-0 self-start">
          <button
            type="button"
            onClick={() => setRoleTypeTab("all")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              roleTypeTab === "all" ? "bg-card text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            كل الأدوار ({Object.keys(roles).length})
          </button>
          <button
            type="button"
            onClick={() => setRoleTypeTab("builtin")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              roleTypeTab === "builtin" ? "bg-card text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            الأساسية ({Object.values(roles).filter(r => r.isBuiltIn).length})
          </button>
          <button
            type="button"
            onClick={() => setRoleTypeTab("custom")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              roleTypeTab === "custom" ? "bg-card text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            المخصصة ({Object.values(roles).filter(r => !r.isBuiltIn).length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            placeholder="بحث في الأدوار..."
            className="h-8 text-xs pr-8 rounded-lg bg-card border-border/60"
          />
        </div>
      </div>

      {/* Role Architectural Cards */}
      {filteredRolesList.length === 0 ? (
        <div className="rounded-xl border border-border/80 bg-card p-10 text-center">
          <Shield className="size-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">لا توجد أدوار تطابق البحث</p>
          <p className="text-xs text-muted-foreground mt-0.5">جرب تعديل كلمة البحث أو فلتر الأدوار</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredRolesList.map(([roleKey, role]) => {
            const colors = getRoleColor(roleKey);
            const isExpanded = expandedRole === roleKey;
            const perms = role.permissions || [];
            const displayPerms = isExpanded ? perms : perms.slice(0, 8);
            const hasMore = perms.length > 8;
            return (
              <div
                key={roleKey}
                className="rounded-xl border border-border/80 dark:border-border/60 bg-card hover:border-border shadow-2xs transition-all duration-150 flex flex-col justify-between overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-muted/60 text-foreground">
                        <Shield className="size-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-foreground leading-snug">{role.name}</h2>
                        <span className="text-[10px] font-mono text-muted-foreground">{roleKey}</span>
                      </div>
                    </div>
                    {role.isBuiltIn ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Lock className="size-2.5" /> أساسي
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300">
                        مخصص
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2 min-h-[32px]">{role.description || "بدون وصف إضافي"}</p>

                  <div className="mb-2">
                    <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-1.5">
                      <span>الصلاحيات المرتبطة:</span>
                      <span className="font-mono tabular-nums">{perms.length} صلاحية</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {perms.length > 0 ? (
                        displayPerms.map((p, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-normal bg-muted/60 text-foreground/80 border border-border/40"
                          >
                            {getPermName(p)}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">لا توجد صلاحيات</span>
                      )}
                    </div>
                    {hasMore && (
                      <button onClick={() => setExpandedRole(isExpanded ? null : roleKey)} className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline mt-1.5 font-medium">
                        {isExpanded ? "عرض أقل" : `عرض باقي الصلاحيات (+${perms.length - 8})`}
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-3.5 py-2.5 bg-muted/20 border-t border-border/60 flex justify-between items-center text-xs">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
                    <span className={cn("size-1.5 rounded-full", role.isActive !== false ? "bg-emerald-500" : "bg-zinc-400")} />
                    {role.isActive !== false ? "نشط" : "غير نشط"}
                  </span>
                  <div className="flex items-center gap-1">
                    {role.isBuiltIn ? (
                      <span className="text-[10px] text-muted-foreground">نظام محمي</span>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" className="size-7 rounded-md" onClick={() => handleEditRole(roleKey, role)}>
                          <Edit className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7 rounded-md text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={() => setDeleteTarget(role)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="size-7 rounded-md text-muted-foreground hover:text-foreground" onClick={() => handleDuplicateRole(roleKey, role)} title="نسخ الدور">
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد حذف الدور</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف دور <strong>"{deleteTarget?.name}"</strong>؟
                هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>

      {/* Create/Edit Dialog */}
      <Dialog open={modalOpen || editModalOpen} onOpenChange={o => {
        if (!o) { setModalOpen(false); setEditModalOpen(false); setFormData({ name: "", description: "", permissions: [], isActive: true }); setSelectedRole(null); setSearchQuery(""); }
      }}>
        <DialogContent className="max-w-xl max-h-full sm:max-h-[85vh] h-dvh sm:h-auto flex flex-col sm:rounded-2xl rounded-none p-0">
          <DialogHeader className="px-4 pt-4 pb-0 shrink-0">
            <DialogTitle>{editModalOpen ? "تعديل الدور" : "إضافة دور جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto px-4 flex-1 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label>اسم الدور *</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  disabled={submitting} className={formErrors.name ? "border-destructive" : ""} />
                {formErrors.name && <p className="text-xs text-destructive mt-1">{formErrors.name}</p>}
              </div>
              <div className="flex items-center gap-2 sm:pb-1 sm:items-end">
                <Switch checked={formData.isActive} onCheckedChange={v => setFormData(p => ({ ...p, isActive: v }))} disabled={submitting} />
                <Label>نشط</Label>
              </div>
            </div>
            <div>
              <Label>وصف الدور</Label>
              <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={2} disabled={submitting} />
            </div>

            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="ابحث عن صلاحية..." value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setExpandedDomain(null); }} className="pr-9" />
            </div>

            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-sm">الصلاحيات</h3>
              <span className="text-xs text-muted-foreground">{formData.permissions.length}/{permissions.length}</span>
            </div>
            {formErrors.permissions && <Alert variant="destructive" className="mb-2"><AlertDescription>{formErrors.permissions}</AlertDescription></Alert>}

            {permissionsLoading ? (
              <div className="flex items-center gap-1 py-2 text-muted-foreground">
                <LoadingSpinner size="sm" /> <span className="text-sm">جاري تحميل قائمة الصلاحيات...</span>
              </div>
            ) : Object.keys(filteredGroupedPermissions).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">لا توجد صلاحيات تطابق البحث</p>
            ) : (
              Object.entries(filteredGroupedPermissions).map(([domain, domainPermissions]) => (
                <div key={domain} className="rounded-lg border overflow-hidden">
                  <button onClick={() => setExpandedDomain(expandedDomain === domain ? null : domain)}
                    className="flex items-center justify-between w-full p-3 sm:p-2.5 text-sm font-bold hover:bg-muted/50 transition-colors min-h-12 sm:min-h-0">
                    <span>{DOMAIN_LABELS[domain] || domain}
                      <span className="text-xs font-normal text-muted-foreground mr-1">
                        ({domainPermissions.filter(p => formData.permissions.includes(p.key)).length}/{domainPermissions.length})
                      </span>
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span onClick={e => { e.stopPropagation(); handleSelectAll(domainPermissions); }}
                        className="text-xs font-normal text-muted-foreground hover:text-foreground px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors">
                        {domainPermissions.every(p => formData.permissions.includes(p.key)) ? "إلغاء الكل" : "تحديد الكل"}
                      </span>
                      <ChevronDown className={`size-4 transition-transform ${expandedDomain === domain ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  {expandedDomain === domain && (
                    <div className="border-t">
                      <div className="p-2 grid grid-cols-1 gap-0.5">
                        {domainPermissions.map(permission => (
                          <label key={permission.key} className="flex items-center gap-3 p-2.5 rounded hover:bg-muted/50 cursor-pointer transition-colors min-h-12">
                            <input type="checkbox" checked={formData.permissions.includes(permission.key)}
                              onChange={() => handlePermissionToggle(permission.key)} disabled={submitting} className="size-5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{permission.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{permission.description || permission.key}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <DialogFooter className="pt-3 border-t mt-0 px-4 py-3 shrink-0">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditModalOpen(false); setFormData({ name: "", description: "", permissions: [], isActive: true }); setSelectedRole(null); setSearchQuery(""); }} disabled={submitting} className="flex-1 sm:flex-none">إلغاء</Button>
            <Button onClick={handleSubmit} disabled={submitting || permissionsLoading} className="flex-1 sm:flex-none">
              {submitting ? <LoadingSpinner size="sm" /> : editModalOpen ? "تحديث" : "إنشاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesManagement;
