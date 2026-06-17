import React, { useCallback, useEffect, useState } from "react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useAuth } from "../hooks/useAuthSimple";
import { buildApiUrl } from "../utils/apiHelpers";
import { Plus, Edit, Trash2, ChevronDown, Shield, Lock } from "lucide-react";

const DOMAIN_LABELS = {
  DASHBOARD: "لوحة التحكم",
  ORDERS: "الطلبات",
  PRODUCTS: "المنتجات",
  CUSTOMERS: "العملاء",
  CONVERSATIONS: "المحادثات",
  SETTINGS: "الإعدادات",
  USERS: "المستخدمين",
  ROLES: "الأدوار والصلاحيات",
  REPORTS: "التقارير",
  WHATSAPP: "واتساب",
  FACEBOOK: "فيسبوك",
  MARKETING: "التسويق",
  STOREFRONT: "المتجر",
  HR: "الموارد البشرية",
  FINANCE: "المالية",
  AI: "الذكاء الاصطناعي",
  INVENTORY: "المخزون",
};

const RolesManagement = () => {
  const { user } = useAuth();
  const getAuthHeaders = () => tokenManager.createAuthHeaders({ "Content-Type": "application/json" });
  const [roles, setRoles] = useState({});
  const [permissions, setPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [expandedDomain, setExpandedDomain] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "", permissions: [], isActive: true });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const normalizeOldRole = (roleKey, role) => ({
    id: roleKey,
    key: roleKey,
    name: role.name || roleKey,
    description: role.description || "",
    isBuiltIn: role.isBuiltIn || false,
    isActive: role.isActive !== false,
    permissions: Array.isArray(role.permissions) ? role.permissions.map(p => {
      if (typeof p === "string") return { key: p, name: p };
      if (p.permission) return { key: p.permission.key, name: p.permission.name };
      return { key: p.key || p, name: p.name || p };
    }) : [],
    priority: role.priority || 0,
    companyId: role.companyId || null,
  });

  const fetchRoles = useCallback(async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      const r = await fetch(buildApiUrl(`permissions/companies/${user.companyId}/roles`), { headers: getAuthHeaders() });
      const d = await r.json();
      if (d.success && Object.keys(d.data || {}).length > 0) {
        setRoles(d.data);
      } else {
        // Fallback: try old endpoint
        const r2 = await fetch(buildApiUrl(`companies/${user.companyId}/roles`), { headers: getAuthHeaders() });
        const d2 = await r2.json();
        if (d2.success) {
          const normalized = {};
          for (const [key, role] of Object.entries(d2.data || {})) {
            normalized[key] = normalizeOldRole(key, role);
          }
          setRoles(normalized);
        } else {
          setError(d.message || "فشل في جلب الأدوار");
        }
      }
    } catch (err) {
      setError("فشل في جلب البيانات: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.companyId]);

  const fetchPermissions = useCallback(async () => {
    setPermissionsLoading(true);
    try {
      const r = await fetch(buildApiUrl("permissions"), { headers: getAuthHeaders() });
      const d = await r.json();
      if (r.ok && d.success) setPermissions(d.data || []);
      else setPermissions([]);
    } catch {
      setPermissions([]);
    } finally {
      setPermissionsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoles(); fetchPermissions(); }, [fetchPermissions, fetchRoles]);

  const handlePermissionToggle = (permKey) => {
    setFormData(p => ({
      ...p,
      permissions: p.permissions.includes(permKey)
        ? p.permissions.filter(pp => pp !== permKey)
        : [...p.permissions, permKey],
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
      const url = editModalOpen
        ? buildApiUrl(`permissions/companies/${user.companyId}/roles/${roleId}`)
        : buildApiUrl(`permissions/companies/${user.companyId}/roles`);
      const r = await fetch(url, {
        method: editModalOpen ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...(editModalOpen ? {} : { key: formData.name.trim().replace(/\s+/g, "_").toUpperCase() }),
          name: formData.name.trim(),
          description: formData.description.trim(),
          permissions: formData.permissions,
          isActive: formData.isActive,
        }),
      });
      const d = await r.json();
      if (d.success) {
        await fetchRoles();
        setModalOpen(false);
        setEditModalOpen(false);
        setFormData({ name: "", description: "", permissions: [], isActive: true });
        setSelectedRole(null);
        setError(null);
      } else {
        setError(d.error || d.message || "فشل في حفظ الدور");
      }
    } catch (err) {
      setError("فشل في حفظ الدور: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.isBuiltIn) { setError("لا يمكن حذف الأدوار الأساسية"); return; }
    if (!window.confirm(`هل أنت متأكد من حذف دور "${role.name}"؟`)) return;
    try {
      const roleId = role.id;
      const r = await fetch(buildApiUrl(`permissions/companies/${user.companyId}/roles/${roleId}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const d = await r.json();
      if (d.success) { await fetchRoles(); setError(null); }
      else setError(d.message || "فشل في حذف الدور");
    } catch (err) {
      setError("فشل في حذف الدور: " + err.message);
    }
  };

  const handleEditRole = (roleKey, role) => {
    const perms = role.permissions && Array.isArray(role.permissions)
      ? role.permissions.map(p => {
          if (typeof p === "string") return p;
          if (p.permission) return p.permission.key || p.permission.name;
          return p.key || p.name;
        })
      : [];
    setFormData({ name: role.name, description: role.description || "", permissions: perms, isActive: role.isActive !== false });
    setSelectedRole({ key: roleKey, id: role.id, ...role });
    setEditModalOpen(true);
  };

  // Group permissions by domain
  const groupedPermissions = {};
  for (const perm of permissions) {
    const domain = perm.domain || "OTHER";
    if (!groupedPermissions[domain]) groupedPermissions[domain] = [];
    groupedPermissions[domain].push(perm);
  }

  const getPermName = (p) => {
    if (!p) return "";
    if (typeof p === "string") return p;
    if (p.permission) return p.permission.name || p.permission.key;
    return p.name || p.key || "";
  };

  // Helper to render role permissions display
  const renderRolePermissions = (role) => {
    if (!role.permissions || role.permissions.length === 0) return <span className="text-xs text-muted-foreground">لا توجد صلاحيات</span>;
    return role.permissions.map((p, i) => (
      <Badge key={i} variant="outline" className="text-xs">{getPermName(p)}</Badge>
    ));
  };

  const getPermissionCount = (role) => {
    if (!role.permissions) return 0;
    return role.permissions.length;
  };

  if (loading) return <div className="flex justify-center items-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-2xl font-bold">إدارة الأدوار والصلاحيات</h1>
          <p className="text-sm text-muted-foreground">إدارة أدوار المستخدمين وصلاحياتهم في النظام</p>
        </div>
        <Button onClick={() => { setFormData({ name: "", description: "", permissions: [], isActive: true }); setModalOpen(true); }}>
          <Plus className="size-4" /> إضافة دور جديد
        </Button>
      </div>

      {error && <Alert variant="destructive" className="mb-3"><AlertDescription>{error}</AlertDescription>
        <Button variant="ghost" size="sm" className="mr-auto" onClick={() => setError(null)}>×</Button></Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(roles).map(([roleKey, role]) => (
          <Card key={roleKey} className={`h-full ${role.isBuiltIn ? "border-2 border-blue-200 dark:border-blue-800" : ""} relative`}>
            {role.isBuiltIn && (
              <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                <Lock className="size-3" /> أساسي
              </div>
            )}
            <CardContent>
              <div className="flex items-center gap-1 mb-2">
                <Shield className="size-5 text-primary" />
                <h2 className="text-base font-bold">{role.name}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{role.description}</p>
              <div className="mb-2">
                <p className="text-xs font-semibold mb-1">الصلاحيات ({getPermissionCount(role)}):</p>
                <div className="max-h-[120px] overflow-auto flex flex-wrap gap-0.5">
                  {renderRolePermissions(role)}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <Badge variant={role.isActive !== false ? "default" : "secondary"}>
                  {role.isActive !== false ? "نشط" : "غير نشط"}
                </Badge>
                <div>
                  {!role.isBuiltIn && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => handleEditRole(roleKey, role)}>
                        <Edit className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRole(role)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={modalOpen || editModalOpen} onOpenChange={o => {
        if (!o) {
          setModalOpen(false);
          setEditModalOpen(false);
          setFormData({ name: "", description: "", permissions: [], isActive: true });
          setSelectedRole(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editModalOpen ? "تعديل الدور" : "إضافة دور جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>اسم الدور *</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} disabled={submitting} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={formData.isActive} onCheckedChange={v => setFormData(p => ({ ...p, isActive: v }))} disabled={submitting} />
                <Label>نشط</Label>
              </div>
            </div>
            <div>
              <Label>وصف الدور</Label>
              <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={2} disabled={submitting} />
            </div>
            <div>
              <h3 className="font-bold mb-2">الصلاحيات *</h3>
              {formErrors.permissions && <Alert variant="destructive" className="mb-2"><AlertDescription>{formErrors.permissions}</AlertDescription></Alert>}
            </div>
            {permissionsLoading ? (
              <div className="flex items-center gap-1 py-2 text-muted-foreground">
                <LoadingSpinner size="sm" />
                <span className="text-sm">جاري تحميل قائمة الصلاحيات...</span>
              </div>
            ) : (
              Object.entries(groupedPermissions).map(([domain, domainPermissions]) => (
                <div key={domain} className="rounded-lg border">
                  <button
                    onClick={() => setExpandedDomain(expandedDomain === domain ? null : domain)}
                    className="flex items-center justify-between w-full p-2 text-sm font-bold"
                  >
                    <span>{DOMAIN_LABELS[domain] || domain} ({domainPermissions.filter(p => formData.permissions.includes(p.key)).length}/{domainPermissions.length})</span>
                    <ChevronDown className={`size-4 transition-transform ${expandedDomain === domain ? "rotate-180" : ""}`} />
                  </button>
                  {expandedDomain === domain && (
                    <div className="p-2 grid grid-cols-1 gap-1">
                      {domainPermissions.map(permission => (
                        <label key={permission.key} className="flex items-center gap-2 p-1 rounded hover:bg-muted/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission.key)}
                            onChange={() => handlePermissionToggle(permission.key)}
                            disabled={submitting}
                          />
                          <div>
                            <p className="text-sm font-medium">{permission.name}</p>
                            <p className="text-xs text-muted-foreground">{permission.description || permission.key}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setModalOpen(false);
              setEditModalOpen(false);
              setFormData({ name: "", description: "", permissions: [], isActive: true });
              setSelectedRole(null);
            }} disabled={submitting}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={submitting || permissionsLoading}>
              {submitting ? <LoadingSpinner size="sm" /> : editModalOpen ? "تحديث" : "إنشاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesManagement;
