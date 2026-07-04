import React, { useRef, useReducer, useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import { Card, CardContent } from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
} from "../../components/ui/alert-dialog";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { buildApiUrl } from "../../utils/urlHelper";
import { tokenManager } from "../../utils/tokenManager";
import { toast } from "sonner";
import { Plus, Trash2, Copy, FlaskConical, Search, Check, X, RefreshCw, Eye, EyeOff } from "lucide-react";

function SuperAdminAIKeyManager() {
  return (
    <div className="p-4 max-w-[1440px] mx-auto">
      <h1 className="text-2xl font-bold mb-4">AI Key Manager</h1>
      <KeyManagerContent />
    </div>
  );
}

function KeyManagerContent() {
  var providersRef = useRef([]);
  var keysRef = useRef([]);
  var errorRef = useRef(null);
  var showAddRef = useRef(false);
  var showDeleteRef = useRef(null);
  var showTestRef = useRef(null);
  var rerender = useReducer(function (x) { return x + 1; }, 0);
  var done = rerender[0] > 0;
  var forceUpdate = rerender[1];

  var searchRef = useRef("");
  var providerFilterRef = useRef("");

  useEffect(function () {
    var cancelled = false;
    var h = tokenManager.createAuthHeaders();
    Promise.all([
      fetch(buildApiUrl("ai-admin/providers"), { headers: h }).then(function (r) { return r.ok ? r.json() : []; }),
      fetch(buildApiUrl("ai-admin/keys"), { headers: h }).then(function (r) { return r.ok ? r.json() : []; }),
    ]).then(function (d) {
      if (!cancelled) {
        providersRef.current = Array.isArray(d[0]) ? d[0] : [];
        keysRef.current = Array.isArray(d[1]) ? d[1] : [];
        forceUpdate();
      }
    }, function (err) {
      if (!cancelled) {
        errorRef.current = err;
        forceUpdate();
      }
    });
    return function () { cancelled = true; };
  }, []);

  function refresh() {
    var h = tokenManager.createAuthHeaders();
    Promise.all([
      fetch(buildApiUrl("ai-admin/providers"), { headers: h }).then(function (r) { return r.ok ? r.json() : []; }),
      fetch(buildApiUrl("ai-admin/keys"), { headers: h }).then(function (r) { return r.ok ? r.json() : []; }),
    ]).then(function (d) {
      providersRef.current = Array.isArray(d[0]) ? d[0] : [];
      keysRef.current = Array.isArray(d[1]) ? d[1] : [];
      forceUpdate();
    }, function (err) {
      errorRef.current = err;
      forceUpdate();
    });
  }

  function doToggle(key) {
    var h = tokenManager.createAuthHeaders();
    fetch(buildApiUrl("ai-admin/keys/" + encodeURIComponent(key.id) + "/status"), {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, h),
      body: JSON.stringify({ is_active: !key.is_active }),
    }).then(function (r) {
      if (!r.ok) throw new Error("Failed to update status");
      toast.success(key.is_active ? "Key deactivated" : "Key activated");
      refresh();
    }, function () {
      toast.error("Failed to update key status");
    });
  }

  function doCopy(val) {
    navigator.clipboard.writeText(val).then(function () {
      toast.success("API key copied");
    }, function () {
      toast.error("Failed to copy");
    });
  }

  function doDelete(id) {
    var h = tokenManager.createAuthHeaders();
    fetch(buildApiUrl("ai-admin/keys/" + encodeURIComponent(id)), {
      method: "DELETE",
      headers: h,
    }).then(function (r) {
      if (!r.ok) throw new Error("Delete failed");
      toast.success("Key deleted");
      showDeleteRef.current = null;
      refresh();
    }, function () {
      toast.error("Failed to delete key");
    });
  }

  function doTest(key) {
    var h = tokenManager.createAuthHeaders();
    fetch(buildApiUrl("ai-admin/test"), {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, h),
      body: JSON.stringify({ provider: key.provider, api_key: key.api_key }),
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.detail || data.message || "Test failed");
        return data;
      });
    }).then(function (result) {
      showTestRef.current = { key: key, result: result };
      forceUpdate();
    }, function (err) {
      showTestRef.current = { key: key, error: err.message || "Test request failed" };
      forceUpdate();
    });
  }

  if (errorRef.current) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-500 text-center">
          <p>Failed to load AI keys. Please try again.</p>
        </div>
      </div>
    );
  }

  if (!done) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  var providers = providersRef.current;
  var keys = keysRef.current;
  var sq = searchRef.current.toLowerCase();
  var pf = providerFilterRef.current;
  var filtered = keys.filter(function (k) {
    if (sq && k.name.toLowerCase().indexOf(sq) === -1) return false;
    if (pf && k.provider !== pf) return false;
    return true;
  });

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Providers</p>
            <p className="text-xl font-bold">{providers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Keys</p>
            <p className="text-xl font-bold">{keys.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Active</p>
            <p className="text-xl font-bold">{keys.filter(function (k) { return k.is_active; }).length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            className="pl-8"
            placeholder="Search by name..."
            onChange={function (e) { searchRef.current = e.target.value; forceUpdate(); }}
          />
        </div>
        <Select onValueChange={function (v) { providerFilterRef.current = v === "__all" ? "" : v; forceUpdate(); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All providers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All providers</SelectItem>
            {providers.map(function (p) {
              var val = typeof p === "string" ? p : p.id || p.name || p;
              return <SelectItem key={val} value={val}>{val}</SelectItem>;
            })}
          </SelectContent>
        </Select>
        <Button onClick={function () { showAddRef.current = true; forceUpdate(); }}>
          <Plus className="size-4 ml-1" /> Add Key
        </Button>
        <Button variant="outline" size="icon" onClick={refresh} title="Refresh">
          <RefreshCw className="size-4" />
        </Button>
      </div>

      <div className="border rounded bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Provider</th>
              <th className="text-left p-2">Key</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ?
              <tr><td colSpan={6} className="p-4 text-center text-gray-400">No keys</td></tr> :
              filtered.map(function (k) {
                return (
                  <tr key={k.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{k.name}</td>
                    <td className="p-2">
                      <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{k.provider}</span>
                    </td>
                    <td className="p-2">
                      <span className="font-mono text-xs text-gray-500">
                        {k.api_key ? k.api_key.substring(0, 12) + "..." : "—"}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                        {k.key_type || "CENTRAL"}
                      </span>
                    </td>
                    <td className="p-2">
                      <button
                        onClick={function () { doToggle(k); }}
                        className={"text-xs px-2 py-0.5 rounded border cursor-pointer " + (k.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200")}
                      >
                        {k.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                          title="Copy API key"
                          onClick={function () { doCopy(k.api_key); }}
                        >
                          <Copy className="size-3.5" />
                        </button>
                        <button
                          className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                          title="Test key"
                          onClick={function () { doTest(k); }}
                        >
                          <FlaskConical className="size-3.5" />
                        </button>
                        <button
                          className="p-1 hover:bg-gray-100 rounded text-red-500 hover:text-red-700"
                          title="Delete key"
                          onClick={function () { showDeleteRef.current = k; forceUpdate(); }}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>

      {showAddRef.current ? <AddKeyDialog
        providers={providers}
        onClose={function () { showAddRef.current = false; forceUpdate(); }}
        onCreated={function () { showAddRef.current = false; refresh(); }}
      /> : null}

      {showDeleteRef.current ? <DeleteConfirmDialog
        key={showDeleteRef.current.id}
        target={showDeleteRef.current}
        onConfirm={function () { doDelete(showDeleteRef.current.id); }}
        onCancel={function () { showDeleteRef.current = null; forceUpdate(); }}
      /> : null}

      {showTestRef.current ? <TestResultDialog
        data={showTestRef.current}
        onClose={function () { showTestRef.current = null; forceUpdate(); }}
      /> : null}
    </div>
  );
}

function AddKeyDialog(props) {
  var providers = props.providers;
  var [provider, setProvider] = useState("");
  var [name, setName] = useState("");
  var [apiKey, setApiKey] = useState("");
  var [saving, setSaving] = useState(false);
  var [showKey, setShowKey] = useState(false);

  function handleSave() {
    if (!provider || !name || !apiKey) {
      toast.error("Provider, name, and API key are required");
      return;
    }
    setSaving(true);
    var h = tokenManager.createAuthHeaders();
    fetch(buildApiUrl("ai-admin/keys"), {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, h),
      body: JSON.stringify({ provider: provider, name: name, api_key: apiKey }),
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (d) { throw new Error(d.detail || d.message || "Failed to create key"); });
      toast.success("Key created successfully");
      props.onCreated();
    }, function (err) {
      toast.error(err.message || "Failed to create key");
    }).finally(function () {
      setSaving(false);
    });
  }

  return (
    <Dialog open={true} onOpenChange={function (o) { if (!o) props.onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New API Key</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Provider</label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map(function (p) {
                  var val = typeof p === "string" ? p : p.id || p.name || p;
                  return <SelectItem key={val} value={val}>{val}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Name</label>
            <Input value={name} onChange={function (e) { setName(e.target.value); }} placeholder="e.g. Production GPT-4" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">API Key</label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={function (e) { setApiKey(e.target.value); }}
                placeholder="sk-..."
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={function () { setShowKey(!showKey); }}
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={props.onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" /> : null}
            {saving ? "Creating..." : "Create Key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog(props) {
  return (
    <AlertDialog open={true} onOpenChange={function (o) { if (!o) props.onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Key</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{props.target.name}</strong>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={props.onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={props.onConfirm} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TestResultDialog(props) {
  var data = props.data;
  var result = data.result;
  var error = data.error;

  return (
    <Dialog open={true} onOpenChange={function (o) { if (!o) props.onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Test Result — {data.key.name}</DialogTitle>
        </DialogHeader>
        {error ?
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert> :
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {result.ok || result.success ?
                <Badge variant="default" className="bg-green-100 text-green-700 border-green-200"><Check className="size-3 ml-1" /> Success</Badge> :
                <Badge variant="destructive"><X className="size-3 ml-1" /> Failed</Badge>
              }
              {result.latency_ms != null ?
                <span className="text-xs text-gray-500">{result.latency_ms}ms</span> : null}
            </div>
            {result.model ?
              <div><span className="text-sm font-medium">Model:</span> <span className="text-sm">{result.model}</span></div> : null}
            {result.reply ?
              <div>
                <span className="text-sm font-medium">Reply:</span>
                <pre className="text-xs bg-gray-50 p-2 rounded mt-1 whitespace-pre-wrap max-h-[200px] overflow-auto">{result.reply}</pre>
              </div> : null}
            {typeof result === "object" && !result.reply && !result.model ?
              <pre className="text-xs bg-gray-50 p-2 rounded mt-1 whitespace-pre-wrap max-h-[200px] overflow-auto">{JSON.stringify(result, null, 2)}</pre> : null}
          </div>
        }
        <DialogFooter>
          <Button onClick={props.onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SuperAdminAIKeyManager;
