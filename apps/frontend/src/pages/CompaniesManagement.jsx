import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getApiUrl } from "../config/environment";
import tokenManager from "../utils/tokenManager";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Card, CardContent } from "../components/ui/card";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { Eye, Edit, Trash2, Plus, Building2, Users, ShoppingCart, MessageSquare, Package, TrendingUp, Search } from "lucide-react";

const CompaniesManagement = () => {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", website: "", address: "", currency: "EGP", isActive: true });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ search: "", isActive: "" });
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const getAuthHeaders = (json = false) => tokenManager.createAuthHeaders(json ? { "Content-Type": "application/json" } : {});

  const fetchCompanies = async () => { setLoading(true); setError(null); try { const params = new URLSearchParams({ page: pagination.page, limit: pagination.limit, sortBy, sortOrder, ...filters }); const r = await fetch(`${getApiUrl()}/companies?${params}`, { headers: getAuthHeaders() }); const d = await r.json(); if (!d.success) throw new Error(d.message || t("companies.fetchError")); setCompanies(d.data.companies || []); if (d.data.pagination) setPagination(d.data.pagination); } catch (err) { setError(t("companies.fetchDataError") + ": " + err.message); } finally { setLoading(false); } };
  useEffect(() => { fetchCompanies(); }, [pagination.page, pagination.limit, sortBy, sortOrder, filters]);

  const handleFilterChange = (field, value) => { setFilters(p => ({ ...p, [field]: value })); setPagination(p => ({ ...p, page: 1 })); };

  const formatDate = (ds) => new Date(ds).toLocaleDateString("ar-SA");

  const handleSubmit = async () => {
    const errors = {}; if (!formData.name.trim()) errors.name = t("companies.form.nameRequired"); if (!formData.email.trim()) errors.email = t("companies.form.emailRequired"); else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = t("companies.form.emailInvalid"); setFormErrors(errors); if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    try { const url = editModalOpen ? `${getApiUrl()}/companies/${selectedCompany.id}` : `${getApiUrl()}/companies`; const r = await fetch(url, { method: editModalOpen ? "PUT" : "POST", headers: getAuthHeaders(true), body: JSON.stringify(formData) }); const d = await r.json(); if (d.success) { await fetchCompanies(); setModalOpen(false); setEditModalOpen(false);     setFormData({ name: "", email: "", phone: "", website: "", address: "", currency: "EGP", isActive: true }); setSelectedCompany(null); setError(null); } else setError(d.message || t("companies.saveError")); } catch (err) { setError(t("companies.saveError") + ": " + err.message); } finally { setSubmitting(false); }
  };

  const handleDeleteCompany = async (company) => { if (!window.confirm(t("companies.confirmDelete", { name: company.name }))) return; try { const r = await fetch(`${getApiUrl()}/companies/${company.id}`, { method: "DELETE", headers: getAuthHeaders() }); const d = await r.json(); if (d.success) { await fetchCompanies(); setError(null); } else setError(d.message || t("companies.deleteError")); } catch (err) { setError(t("companies.deleteError") + ": " + err.message); } };

  if (loading && companies.length === 0) return <div className="flex justify-center items-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-3"><h1 className="text-2xl font-bold">{t("companies.title")}</h1><Button onClick={() => { setFormData({ name: "", email: "", phone: "", website: "", address: "", currency: "EGP", isActive: true }); setModalOpen(true); }}><Plus className="size-4" /> {t("companies.addNew")}</Button></div>
      {error && <Alert variant="destructive" className="mb-3"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        {[{ icon: <Building2 className="size-10 text-primary" />, label: t("companies.total"), value: pagination.total || 0 }, { icon: <TrendingUp className="size-10 text-green-600" />, label: t("companies.active"), value: companies.filter(c => c.isActive).length }, { icon: <Users className="size-10 text-blue-500" />, label: t("companies.totalUsers"), value: companies.reduce((s, c) => s + (c._count?.users || 0), 0) }, { icon: <MessageSquare className="size-10 text-yellow-600" />, label: t("companies.totalConversations"), value: companies.reduce((s, c) => s + (c._count?.conversations || 0), 0) }].map((card, i) => <Card key={i}><CardContent><div className="flex items-center gap-2">{card.icon}<div><p className="text-lg font-bold">{card.value}</p><p className="text-xs text-muted-foreground">{card.label}</p></div></div></CardContent></Card>)}
      </div>

      <Card className="mb-3"><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input className="pr-10" placeholder={t("companies.filters.search")} value={filters.search} onChange={e => handleFilterChange("search", e.target.value)} /></div>

        <Select value={filters.isActive} onValueChange={v => handleFilterChange("isActive", v)}><SelectTrigger><SelectValue placeholder={t("companies.filters.status")} /></SelectTrigger><SelectContent><SelectItem value="">{t("companies.filters.all")}</SelectItem><SelectItem value="true">{t("companies.filters.active")}</SelectItem><SelectItem value="false">{t("companies.filters.inactive")}</SelectItem></SelectContent></Select>
        <Select value={String(pagination.limit)} onValueChange={v => { setPagination(p => ({ ...p, limit: parseInt(v), page: 1 })); }}><SelectTrigger><SelectValue placeholder={t("companies.filters.limit")} /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent></Select>
      </div></CardContent></Card>

      <Card><CardContent>
        <Table><TableHeader><TableRow><TableHead>{t("companies.table.company")}</TableHead><TableHead className="text-center">{t("companies.table.users")}</TableHead><TableHead className="text-center">{t("companies.table.customers")}</TableHead><TableHead className="text-center">{t("companies.table.products")}</TableHead><TableHead className="text-center">{t("companies.table.conversations")}</TableHead><TableHead className="text-center">{t("companies.table.status")}</TableHead><TableHead className="text-center">{t("companies.table.createdAt")}</TableHead><TableHead className="text-center">{t("companies.table.actions")}</TableHead></TableRow></TableHeader>
          <TableBody>{companies.map(company => <TableRow key={company.id}>
            <TableCell><div className="flex items-center gap-2"><Avatar className="bg-primary"><AvatarFallback><Building2 className="size-4" /></AvatarFallback></Avatar><div><p className="font-bold text-sm">{company.name}</p><p className="text-xs text-muted-foreground">{company.email}</p></div></div></TableCell>
            <TableCell className="text-center"><div className="flex items-center justify-center gap-0.5"><Users className="size-4 text-muted-foreground" />{company._count?.users || 0}</div></TableCell>
            <TableCell className="text-center"><div className="flex items-center justify-center gap-0.5"><Users className="size-4 text-muted-foreground" />{company._count?.customers || 0}</div></TableCell>
            <TableCell className="text-center"><div className="flex items-center justify-center gap-0.5"><Package className="size-4 text-muted-foreground" />{company._count?.products || 0}</div></TableCell>
            <TableCell className="text-center"><div className="flex items-center justify-center gap-0.5"><MessageSquare className="size-4 text-muted-foreground" />{company._count?.conversations || 0}</div></TableCell>
            <TableCell className="text-center"><Badge variant={company.isActive ? "default" : "secondary"}>{company.isActive ? t("companies.filters.active") : t("companies.filters.inactive")}</Badge></TableCell>
            <TableCell className="text-center text-sm">{formatDate(company.createdAt)}</TableCell>
            <TableCell className="text-center"><div className="flex justify-center gap-0.5"><Button variant="ghost" size="icon" onClick={() => handleViewCompany(company)}><Eye className="size-4" /></Button><Button variant="ghost" size="icon" onClick={() => {                     setFormData({ name: company.name, email: company.email, phone: company.phone || "", website: company.website || "", address: company.address || "", currency: company.currency, isActive: company.isActive }); setSelectedCompany(company); setEditModalOpen(true); }}><Edit className="size-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDeleteCompany(company)}><Trash2 className="size-4" /></Button></div></TableCell>
          </TableRow>)}</TableBody></Table>
      </CardContent></Card>
    </div>
  );

  async function handleViewCompany(company) { try { const r = await fetch(`${getApiUrl()}/companies/${company.id}`, { headers: getAuthHeaders() }); const d = await r.json(); if (d.success) { setSelectedCompany(d.data); setDetailsModalOpen(true); } } catch { setError(t("companies.fetchDetailsError")); } }
};

export default CompaniesManagement;