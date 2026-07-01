import React, { useState, useEffect, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { Label } from "../../components/ui/label";
import { Separator } from "../../components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../../components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../components/ui/table";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import tokenManager from "../../utils/tokenManager";
import {
  Plus, Trash2, RefreshCw, FlaskConical, Search, ChevronDown, ChevronRight, Key, Activity, BarChart3, Settings, Save, AlertCircle, ChevronUp,
} from "lucide-react";

const API_BASE = "/api/v1/ai-admin";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Boundary caught:", error.message);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-8">
          <h2 className="text-xl font-bold text-red-600">Error Caught</h2>
          <pre className="mt-4 text-sm whitespace-pre-wrap max-w-full overflow-auto bg-gray-100 p-4 rounded">
            Message: {this.state.error.message}
            {"\n\nStack:\n"}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const SuperAdminAIKeyManager = () => {
  const getAuthHeaders = useCallback(
    (extra: Record<string, string> = {}) => tokenManager.createAuthHeaders(extra),
    [],
  );

  const [providers, setProviders] = useState<Record<string, any>[]>([]);
  const [keys, setKeys] = useState<Record<string, any>[]>([]);
  const [config, setConfig] = useState<Record<string, any> | null>(null);
  const [dashboard, setDashboard] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<Record<string, any> | null>(null);

  const fetchAll = useCallback(async () => {
    const headers = getAuthHeaders();
    try {
      const [provRes, keysRes, configRes, dashRes] = await Promise.all([
        fetch(`${API_BASE}/providers`, { headers }),
        fetch(`${API_BASE}/keys`, { headers }),
        fetch(`${API_BASE}/config`, { headers }),
        fetch(`${API_BASE}/dashboard`, { headers }),
      ]);
      if (provRes.ok) {
        const d = await provRes.json();
        setProviders(d.data || d.providers || d || []);
      }
      if (keysRes.ok) {
        const d = await keysRes.json();
        setKeys(d.data || d.keys || d || []);
      }
      if (configRes.ok) {
        const d = await configRes.json();
        setConfig(d.data || d.config || d || null);
      }
      if (dashRes.ok) {
        const d = await dashRes.json();
        setDashboard(d.data || d.stats || d || null);
      }
    } catch (err) {
      setError({
        message:
          err instanceof Error ? err.message : "Failed to load data",
      });
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (error) {
    return (
      <ErrorBoundary>
        <div className="p-4">
          <h1>Error</h1>
          <p>{JSON.stringify(error)}</p>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-4 max-w-[1440px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Key className="h-6 w-6 text-indigo-500" /> AI Key Manager
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage AI provider API keys
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Key
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">Providers</p>
            <p className="text-xl font-bold mt-1">{providers.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">Keys</p>
            <p className="text-xl font-bold mt-1">{keys.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">Config</p>
            <p className="text-xl font-bold mt-1">
              {config ? "ok" : "—"}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">Dashboard</p>
            <p className="text-xl font-bold mt-1">
              {dashboard ? "ok" : "—"}
            </p>
          </div>
        </div>

        {/* Providers list */}
        <div className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold mb-2">
            Providers ({providers.length})
          </h2>
          <div className="flex flex-wrap gap-1">
            {providers.map((p: any) => (
              <Badge key={p.name} variant="outline">
                {p.display_name || p.name}
              </Badge>
            ))}
            {providers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No providers
              </p>
            )}
          </div>
        </div>

        {/* Keys table */}
        <div className="rounded-xl border bg-card">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Input
                placeholder="Search..."
                className="w-64"
              />
            </div>
            {keys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No API keys found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key: any) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">
                        {key.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{key.provider}</Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs ${key.is_active ? "text-green-600" : "text-red-600"}`}
                        >
                          {key.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default SuperAdminAIKeyManager;
