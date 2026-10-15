import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Pencil, ArrowRightLeft, ShieldCheck, ShieldAlert, AlertCircle, Search, X } from "lucide-react";
import orderWorkflowService, { OrderStatusDefinition, OrderWorkflowTransition } from "../../../services/orderWorkflowService";
import api from "../../../services/api";
import { useAuth } from "../../../hooks/useAuthSimple";

interface Props {
  statuses: OrderStatusDefinition[];
  onUpdate: () => void;
}

const TransitionRules: React.FC<Props> = ({ statuses, onUpdate }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [transitions, setTransitions] = useState<OrderWorkflowTransition[]>([]);
  const [employees, setEmployees] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [newRule, setNewRule] = useState<Partial<OrderWorkflowTransition>>({
    fromStatusId: "", toStatusId: "", allowedRoles: '["OWNER", "SUPER_ADMIN"]',
    requiresApproval: false, allowOverride: false, restrictBackward: false,
  });

  const availableRoles = [
    { value: "OWNER", label: t("orderSettings.k_70") },
    { value: "SUPER_ADMIN", label: t("orderSettings.k_71") },
    { value: "COMPANY_ADMIN", label: t("orderSettings.k_72") },
    { value: "MANAGER", label: t("orderSettings.k_73") },
    { value: "AGENT", label: t("orderSettings.k_74") },
  ];

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter(emp => `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q));
  }, [employees, employeeSearch]);

  useEffect(() => {
    fetchTransitions();
    if (user?.companyId) fetchEmployees();
  }, [user?.companyId]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get(`/companies/${user.companyId}/users?limit=100&page=1`);
      if (res.data?.success && res.data?.data?.users) {
        setEmployees(res.data.data.users);
      }
    } catch (error) {
      console.error("Failed to fetch employees", error);
    }
  };

  const fetchTransitions = async () => {
    try {
      const res = await orderWorkflowService.getTransitions();
      setTransitions(res.data || []);
    } catch (error) {
      console.error("Failed to fetch transitions", error);
    }
  };

  const resetForm = () => {
    setNewRule({
      fromStatusId: "", toStatusId: "", allowedRoles: '["OWNER", "SUPER_ADMIN"]',
      requiresApproval: false, allowOverride: false, restrictBackward: false,
    });
    setIsAdding(false); setEditingId(null); setSaveError(null); setEmployeeSearch("");
  };

  const handleEdit = (transition: OrderWorkflowTransition) => {
    setNewRule({
      id: transition.id, fromStatusId: transition.fromStatusId || "",
      toStatusId: transition.toStatusId, allowedRoles: transition.allowedRoles,
      requiresApproval: transition.requiresApproval, allowOverride: transition.allowOverride || false,
      restrictBackward: transition.restrictBackward,
    });
    setEditingId(transition.id); setIsAdding(true); setSaveError(null); setEmployeeSearch("");
  };

  const handleSave = async () => {
    if (!newRule.toStatusId) { setSaveError(t("orderSettings.k_75")); return; }
    const roles = JSON.parse(newRule.allowedRoles || "[]");
    if (roles.length === 0) { setSaveError(t("orderSettings.k_76")); return; }
    try {
      setSaveError(null);
      await orderWorkflowService.upsertTransition(newRule);
      resetForm(); fetchTransitions(); onUpdate();
    } catch (error: any) {
      setSaveError(error.message || t("orderSettings.k_77"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("orderSettings.k_78"))) return;
    try {
      await orderWorkflowService.deleteTransition(id);
      fetchTransitions(); onUpdate();
    } catch (error) {
      console.error("Failed to delete", error);
    }
  };

  const getStatusName = (id: string | null) => {
    if (!id) return t("orderSettings.k_79");
    return statuses.find(s => s.id === id)?.name || t("orderSettings.k_80");
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border/70 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-base font-semibold text-foreground tracking-tight">{t("orderSettings.k_81")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t("orderSettings.k_82")}</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsAdding(true); }}
          disabled={isAdding && !editingId}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-medium hover:bg-primary/90 transition shadow-xs disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          {t("orderSettings.k_153")}
        </button>
      </div>

      <div className="space-y-2.5">
        {transitions.length === 0 && !isAdding && (
          <div className="p-12 text-center bg-card rounded-xl border border-dashed border-border/70 space-y-2">
            <ArrowRightLeft className="w-8 h-8 text-muted-foreground/30 mx-auto" />
            <p className="text-xs text-muted-foreground">{t("orderSettings.k_83")}</p>
          </div>
        )}

        {isAdding && (
          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 shadow-xs space-y-3.5 animate-in fade-in-0 duration-150">
            <div className="flex items-center justify-between border-b border-primary/20 pb-2.5">
              <h3 className="text-xs font-semibold text-foreground">
                {editingId ? t("orderSettings.k_166") : t("orderSettings.k_153")}
              </h3>
              <button onClick={resetForm} className="text-muted-foreground hover:text-foreground p-1 rounded-md">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">{t("orderSettings.k_84")}</label>
                <select
                  value={newRule.fromStatusId}
                  onChange={(e) => setNewRule({ ...newRule, fromStatusId: e.target.value })}
                  className="w-full p-2 rounded-xl border border-border/70 bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{t("orderSettings.k_79")}</option>
                  {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">{t("orderSettings.k_85")}</label>
                <select
                  value={newRule.toStatusId}
                  onChange={(e) => setNewRule({ ...newRule, toStatusId: e.target.value })}
                  className="w-full p-2 rounded-xl border border-border/70 bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{t("orderSettings.k_86")}</option>
                  {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/60">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-foreground">{t("orderSettings.k_87")}</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {availableRoles.map(role => (
                    <label key={role.value} className="flex items-center gap-1.5 text-xs p-1.5 rounded-lg bg-card border border-border/60 cursor-pointer hover:bg-muted/30">
                      <input
                        type="checkbox"
                        checked={JSON.parse(newRule.allowedRoles || "[]").includes(role.value)}
                        onChange={(e) => {
                          const roles = JSON.parse(newRule.allowedRoles || "[]");
                          const updated = e.target.checked ? [...roles, role.value] : roles.filter((r: string) => r !== role.value);
                          setNewRule({ ...newRule, allowedRoles: JSON.stringify(updated) });
                        }}
                      />
                      <span>{role.label}</span>
                    </label>
                  ))}
                </div>

                <div className="relative pt-0.5">
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder={t("orderSettings.k_167")}
                    className="w-full pr-8 pl-3 py-1.5 text-xs rounded-xl border border-border/70 bg-background text-foreground"
                  />
                </div>

                <div className="grid grid-cols-2 gap-1 max-h-28 overflow-y-auto p-1.5 border border-border/60 rounded-xl bg-card text-xs">
                  {filteredEmployees.map(emp => (
                    <label key={emp.id} className="flex items-center gap-1.5 p-1 rounded hover:bg-muted/40 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={JSON.parse(newRule.allowedRoles || "[]").includes(emp.id)}
                        onChange={(e) => {
                          const roles = JSON.parse(newRule.allowedRoles || "[]");
                          const updated = e.target.checked ? [...roles, emp.id] : roles.filter((r: string) => r !== emp.id);
                          setNewRule({ ...newRule, allowedRoles: JSON.stringify(updated) });
                        }}
                      />
                      <span className="truncate">{emp.firstName} {emp.lastName}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="flex items-start gap-2 cursor-pointer p-2 rounded-xl bg-card border border-border/60">
                  <input
                    type="checkbox"
                    checked={newRule.requiresApproval}
                    onChange={(e) => setNewRule({ ...newRule, requiresApproval: e.target.checked })}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">{t("orderSettings.k_90")}</p>
                    <p className="text-muted-foreground text-[11px]">{t("orderSettings.k_91")}</p>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer p-2 rounded-xl bg-card border border-border/60">
                  <input
                    type="checkbox"
                    checked={newRule.allowOverride}
                    onChange={(e) => setNewRule({ ...newRule, allowOverride: e.target.checked })}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">{t("orderSettings.k_170")}</p>
                    <p className="text-muted-foreground text-[11px]">{t("orderSettings.k_171")}</p>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer p-2 rounded-xl bg-card border border-border/60">
                  <input
                    type="checkbox"
                    checked={newRule.restrictBackward}
                    onChange={(e) => setNewRule({ ...newRule, restrictBackward: e.target.checked })}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">{t("orderSettings.k_92")}</p>
                    <p className="text-muted-foreground text-[11px]">{t("orderSettings.k_93")}</p>
                  </div>
                </label>
              </div>
            </div>

            {saveError && (
              <div className="p-2 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {saveError}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} className="px-4 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition shadow-xs">
                {editingId ? t("orderSettings.k_149") : t("orderSettings.k_94")}
              </button>
              <button onClick={resetForm} className="px-4 py-1.5 border border-border/70 rounded-xl text-xs hover:bg-muted/40 transition">
                {t("orderSettings.k_95")}
              </button>
            </div>
          </div>
        )}

        {transitions.map((tr) => (
          <div key={tr.id} className="flex flex-col md:flex-row items-center justify-between p-3.5 rounded-xl bg-card border border-border/70 hover:border-primary/40 transition-colors shadow-xs gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                <span className="text-foreground">{getStatusName(tr.fromStatusId)}</span>
                <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary">{getStatusName(tr.toStatusId)}</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 border-r border-border/60 pr-3 mr-3">
                {JSON.parse(tr.allowedRoles || "[]").map((role: string) => {
                  const roleObj = availableRoles.find(r => r.value === role);
                  const empObj = employees.find(e => e.id === role);
                  const label = roleObj ? roleObj.label : (empObj ? `${empObj.firstName} ${empObj.lastName}` : role);
                  return (
                    <span key={role} className="text-[11px] bg-muted/50 text-foreground border border-border/60 px-2 py-0.5 rounded-md font-medium">
                      {label}
                    </span>
                  );
                })}
                {tr.requiresApproval && <ShieldCheck className="w-4 h-4 text-amber-500" title={t("orderSettings.k_96")} />}
                {tr.allowOverride && <ShieldAlert className="w-4 h-4 text-orange-500" title={t("orderSettings.k_170")} />}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => handleEdit(tr)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors" title={t("orderSettings.k_168")}>
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(tr.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="حذف القاعدة">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransitionRules;
