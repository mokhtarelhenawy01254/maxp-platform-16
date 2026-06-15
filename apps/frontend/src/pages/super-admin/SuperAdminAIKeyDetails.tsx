import React, { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../components/ui/table";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";
import { ArrowLeft, CheckCircle, MessageSquare, XCircle, ExternalLink, RefreshCw, FlaskConical, AlertTriangle, Info } from "lucide-react";

const statusColor = (s) => s === "healthy" || s === "success" ? "default" : s === "warning" || s === "inactive" ? "secondary" : s === "critical" || s === "failed" ? "destructive" : "outline";
const diagnosticIcon = (severity) => { if (severity === "critical") return <XCircle className="size-4" />; if (severity === "warning") return <AlertTriangle className="size-4" />; return <Info className="size-4" />; };
const formatDate = (v) => v ? new Date(v).toLocaleString() : "Never";

const Metric = ({ label, value }) => (
  <div className="rounded-xl border bg-card p-3 min-h-[92px]">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-bold mt-0.5 break-words">{value}</p>
  </div>
);

const SuperAdminAIKeyDetails = () => {
  const { id } = useParams();
  const [details, setDetails] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [chatTesting, setChatTesting] = useState(false);
  const [error, setError] = useState(null);
  const [chatError, setChatError] = useState(null);
  const [testMessage, setTestMessage] = useState("العميل بيسأل: المنتج ده مناسب للخروج اليومي؟");
  const [testCompany, setTestCompany] = useState("Wofod");
  const [testChatResult, setTestChatResult] = useState(null);

  const getAuthHeaders = useCallback(() => tokenManager.createAuthHeaders({ "Content-Type": "application/json" }), []);

  const loadDetails = useCallback(async () => {
    if (!id) return; setLoading(true); setError(null);
    try { const response = await fetch(buildApiUrl(`super-admin/ai/keys/${id}/details`), { headers: getAuthHeaders() }); const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.message || "Failed to load key details"); setDetails(payload.data); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Failed to load key details"); } finally { setLoading(false); }
  }, [getAuthHeaders, id]);

  const loadLogs = useCallback(async () => {
    if (!id) return; setLogsLoading(true);
    try { const response = await fetch(buildApiUrl(`super-admin/ai/keys/${id}/logs?limit=40`), { headers: getAuthHeaders() }); const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.message || "Failed to load provider logs"); setLogs(payload.data?.logs || []); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Failed to load provider logs"); } finally { setLogsLoading(false); }
  }, [getAuthHeaders, id]);

  useEffect(() => { loadDetails(); loadLogs(); }, [loadDetails, loadLogs]);

  const testKey = async () => { if (!id) return; setTesting(true); setError(null); try { const response = await fetch(buildApiUrl(`super-admin/ai/keys/${id}/test`), { method: "POST", headers: getAuthHeaders() }); const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.message || "Key test failed"); await loadDetails(); await loadLogs(); } catch (testError) { setError(testError instanceof Error ? testError.message : "Key test failed"); } finally { setTesting(false); } };

  const runTestChat = async () => {
    if (!id) return; setChatTesting(true); setChatError(null); setTestChatResult(null);
    try { const response = await fetch(buildApiUrl(`super-admin/ai/keys/${id}/test-chat`), { method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ message: testMessage, companyName: testCompany }) }); const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.message || "AI key chat failed"); setTestChatResult(payload.data); await loadLogs(); } catch (testError) { setChatError(testError instanceof Error ? testError.message : "AI key chat failed"); await loadLogs(); } finally { setChatTesting(false); }
  };

  if (loading && !details) return <div className="p-4 flex justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="p-3 max-w-[1440px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between gap-2 mb-3">
        <div className="space-y-1">
          <Button variant="link" asChild className="p-0 h-auto"><RouterLink to="/super-admin/ai-providers"><ArrowLeft className="size-4" /> Back to providers</RouterLink></Button>
          <h1 className="text-2xl font-bold">Provider key diagnostics</h1>
          <p className="text-sm text-muted-foreground">تفاصيل صحة المفتاح، آخر اختبار، آخر استخدام فعلي، وهل يدخل مسار الإنتاج أم لا.</p>
        </div>
        <div className="flex gap-1 items-center">
          <Button variant="outline" onClick={() => { loadDetails(); loadLogs(); }} disabled={loading || testing}><RefreshCw className="size-4" /> Refresh</Button>
          <Button onClick={testKey} disabled={testing || !details}>{testing ? <LoadingSpinner size="sm" /> : <FlaskConical className="size-4" />} Test key</Button>
        </div>
      </div>

      {error && <Alert variant="destructive" className="mb-2"><AlertDescription>{error}</AlertDescription></Alert>}

      {details && <div className="space-y-3">
        <div className="rounded-xl border bg-card p-3"><div className="flex flex-col md:flex-row justify-between gap-2">
          <div className="space-y-1"><div className="flex items-center gap-1 flex-wrap"><h2 className="text-xl font-bold">{details.key.name}</h2><Badge variant="outline">{details.key.provider}</Badge><Badge variant={statusColor(details.health.status)}>{details.health.status}</Badge><Badge variant={details.key.isActive ? "default" : "secondary"}>{details.key.isActive ? "Active" : "Inactive"}</Badge></div><p className="text-sm font-mono text-muted-foreground">{details.key.maskedApiKey || "No key fingerprint"}</p><p className="text-sm text-muted-foreground">{details.key.company ? `${details.key.company.name} / ${details.key.company.email || details.key.company.id}` : details.key.keyType}</p></div>
          <div className="text-sm text-muted-foreground"><p>Base URL: {details.key.baseUrl || "Provider default"}</p><p>Created: {formatDate(details.key.createdAt)}</p><p>Updated: {formatDate(details.key.updatedAt)}</p></div>
        </div></div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <Metric label="Active model" value={details.activeModel?.modelName || "No enabled model"} />
          <Metric label="Routing" value={details.routing.isActiveProvider ? "Active provider" : details.routing.isPreferredForProvider ? "Preferred key" : "Not current route"} />
          <Metric label="Success rate" value={details.usage.successRate === null || details.usage.successRate === undefined ? "No traffic" : `${details.usage.successRate}%`} />
          <Metric label="Daily usage" value={`${details.usage.currentUsage}/${details.usage.maxRequestsPerDay}`} />
        </div>

        <div className="rounded-xl border bg-card p-3"><h3 className="font-bold mb-2">Diagnostics</h3>
          {details.health.diagnostics.length === 0 ? <Alert><AlertDescription>No key-level problems detected by the current telemetry.</AlertDescription></Alert> : <div className="space-y-1">{details.health.diagnostics.map(item => <Alert key={item.code} variant={item.severity === "critical" ? "destructive" : item.severity === "warning" ? "destructive" : "default"}><div className="flex items-center gap-1">{diagnosticIcon(item.severity)}<AlertDescription><strong>{item.code}</strong> — {item.message}</AlertDescription></div></Alert>)}</div>}
        </div>

        <div className="rounded-xl border bg-card p-3"><div className="flex flex-col md:flex-row justify-between gap-2 mb-2"><div><h3 className="font-bold">Diagnostic chat</h3><p className="text-sm text-muted-foreground">اختبار مباشر لنفس المفتاح والموديل بدون إرسال أي رسالة للعميل.</p></div><Badge variant={statusColor(testChatResult?.status || "")}>{testChatResult?.status || "not tested"}</Badge></div>
          <div className="space-y-2">
            <Input label="Company context" value={testCompany} onChange={e => setTestCompany(e.target.value)} helperText="للتون فقط في الاختبار." />
            <Textarea label="Test message" value={testMessage} onChange={e => setTestMessage(e.target.value)} rows={3} />
            <Button onClick={runTestChat} disabled={chatTesting || !testMessage.trim()}>{chatTesting ? <LoadingSpinner size="sm" /> : <MessageSquare className="size-4" />} Send diagnostic chat</Button>
            {chatError && <Alert variant="destructive"><AlertDescription>{chatError}</AlertDescription></Alert>}
            {testChatResult && <Alert variant={testChatResult.ok ? "default" : "destructive"}><div className="space-y-1"><p className="font-bold">{testChatResult.provider} / {testChatResult.model} / {testChatResult.latencyMs}ms</p><p className="whitespace-pre-wrap">{testChatResult.reply || "Empty response"}</p></div></Alert>}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3"><div className="flex flex-col sm:flex-row justify-between gap-2 mb-2"><div><h3 className="font-bold">Provider logs</h3><p className="text-sm text-muted-foreground">آخر اختيارات وتشغيل واختبارات لهذا المفتاح.</p></div><div className="flex gap-1"><Button variant="outline" onClick={loadLogs} disabled={logsLoading}>{logsLoading ? <LoadingSpinner size="sm" /> : <RefreshCw className="size-4" />} Refresh</Button><Button variant="outline" asChild><RouterLink to={`/super-admin/ai-providers/logs?keyId=${details.key.id}`}><ExternalLink className="size-4" /> Full logs</RouterLink></Button></div></div>
          <Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Status</TableHead><TableHead>Model</TableHead><TableHead>Latency</TableHead><TableHead>Message</TableHead></TableRow></TableHeader>
            <TableBody>{logs.length === 0 ? <TableRow><TableCell colSpan={6}><Alert><AlertDescription>No provider logs recorded for this key yet.</AlertDescription></Alert></TableCell></TableRow> : logs.slice(0, 20).map(log => <TableRow key={log.id}><TableCell>{formatDate(log.createdAt)}</TableCell><TableCell>{log.action}</TableCell><TableCell><Badge variant={statusColor(log.status)}>{log.status}</Badge></TableCell><TableCell>{log.model || "—"}</TableCell><TableCell>{Number.isFinite(Number(log.latencyMs)) ? `${log.latencyMs}ms` : "—"}</TableCell><TableCell className="max-w-[420px]"><p className="text-sm truncate" title={log.message || ""}>{log.message || "—"}</p></TableCell></TableRow>)}</TableBody></Table>
        </div>

        <div className="rounded-xl border bg-card p-3"><h3 className="font-bold mb-2">Configured models</h3>
          <div className="space-y-1">{details.models.map(model => <div key={model.id} className="flex flex-col sm:flex-row justify-between gap-1 border rounded-lg p-2"><p className="font-bold">{model.modelName}</p><div className="flex gap-1"><Badge variant={model.isEnabled ? "default" : "secondary"}>{model.isEnabled ? "Enabled" : "Disabled"}</Badge><Badge variant="outline">Priority {model.priority}</Badge></div></div>)}</div>
        </div>
      </div>}
    </div>
  );
};

export default SuperAdminAIKeyDetails;