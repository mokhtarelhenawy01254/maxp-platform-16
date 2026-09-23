import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { buildApiUrl } from "../../utils/urlHelper";
import { tokenManager } from "../../utils/tokenManager";
import { Send, Copy, RefreshCw, Bot, Timer, BarChart3, Radio } from "lucide-react";
import { toast } from "sonner";
import i18n from "../../i18n";

const PROVIDERS = [
  { value: "GOOGLE", label: "Google" }, { value: "GROQ", label: "Groq" }, { value: "CEREBRAS", label: "Cerebras" },
  { value: "OPENROUTER", label: "OpenRouter" }, { value: "NVIDIA", label: "NVIDIA" }, { value: "MISTRAL", label: "Mistral" },
  { value: "SAMBANOVA", label: "SambaNova" }, { value: "GITHUB", label: "GitHub Models" }, { value: "DEEPSEEK", label: "DeepSeek" },
  { value: "OPENAI", label: "OpenAI" }, { value: "ANTHROPIC", label: "Anthropic" }, { value: "OLLAMA", label: "Ollama" }, { value: "HUGGINGFACE", label: "HuggingFace" },
];

const DEFAULT_MODELS: Record<string, string> = { GOOGLE: "gemini-2.5-flash", DEEPSEEK: "deepseek-flash", OPENAI: "gpt-4o-mini", ANTHROPIC: "claude-sonnet-4-20250514", HUGGINGFACE: "mistralai/Mistral-7B-Instruct-v0.3", OLLAMA: "llama3.2", GROQ: "openai/gpt-oss-120b", OPENROUTER: "openrouter/auto", NVIDIA: "openai/gpt-oss-120b", CEREBRAS: "qwen-3-235b-a22b-instruct-2507", GITHUB: "gpt-4o", SAMBANOVA: "DeepSeek-V3.1", MISTRAL: "mistral-large-latest" };

const SuperAdminAIPlayground = () => {
  const [provider, setProvider] = useState("GOOGLE");
  const [model, setModel] = useState(DEFAULT_MODELS.GOOGLE);
  const [prompt, setPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [streaming, setStreaming] = useState(true);
  const [streamContent, setStreamContent] = useState("");
  const [streamMeta, setStreamMeta] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => { setModel(DEFAULT_MODELS[provider] || ""); }, [provider]);

  const handleSendStream = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true); setError(""); setResult(null); setStreamContent(""); setStreamMeta(null);
    const params = new URLSearchParams({
      provider, model: model.trim(), prompt: prompt.trim(),
      temperature: String(temperature), maxTokens: String(maxTokens),
    });
    if (systemPrompt.trim()) params.set("systemPrompt", systemPrompt.trim());
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch(buildApiUrl(`super-admin/ai/playground/chat/stream?${params}`), {
        headers: tokenManager.createAuthHeaders(),
        signal: controller.signal,
      });
      if (!response.ok) { setError(`HTTP ${response.status}`); setLoading(false); return; }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        for (const line of text.split("\n").filter(l => l.startsWith("data: "))) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) { setError(data.error); setLoading(false); return; }
            if (data.chunk !== undefined) setStreamContent(data.reply);
            if (data.done) {
              setStreamMeta({ latencyMs: data.latencyMs, provider: data.provider, model: data.model });
              setResult({ reply: streamContent + (data.finalChunk || ""), ...data, totalTokens: 0 });
              setLoading(false);
              return;
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message || "Stream failed");
    }
    setLoading(false);
  }, [provider, model, prompt, systemPrompt, temperature, maxTokens]);

  const handleSendBatch = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setError(""); setResult(null); setStreamContent("");
    try {
      const response = await fetch(buildApiUrl("super-admin/ai/playground/chat"), {
        method: "POST", headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ provider, model: model.trim() || undefined, prompt: prompt.trim(), systemPrompt: systemPrompt.trim() || undefined, temperature, maxTokens: Number(maxTokens) }),
      });
      if (!response.ok) { let m = `HTTP ${response.status}`; try { const d = await response.json(); m = d.message || d.error || m; } catch {} throw new Error(m); }
      const data = await response.json();
      if (!data.success) setError(data.message || "Playground request failed");
      else setResult(data.data);
    } catch (err) { setError(err.message || "Network error"); } finally { setLoading(false); }
  };

  const handleSend = streaming ? handleSendStream : handleSendBatch;

  const handleStop = () => {
    if (abortRef.current) { abortRef.current.abort(); setLoading(false); }
  };

  const displayReply = streamContent || result?.reply || "";
  const displayMeta = streamMeta || result || {};

  return (
    <div className="p-3 rtl">
      <h1 className="text-xl font-bold mb-3 flex items-center gap-1"><Bot className="size-5" /> AI Playground</h1>

      <Card className="mb-3">
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Select value={provider} onValueChange={setProvider}><SelectTrigger><SelectValue placeholder="Provider" /></SelectTrigger><SelectContent>{PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select>
            <Input placeholder="Model" value={model} onChange={e => setModel(e.target.value)} />
            <Input type="number" label="Max Tokens" value={maxTokens} onChange={e => setMaxTokens(e.target.value)} min={1} max={128000} />
            <div><Label className="text-xs">Temperature: {temperature}</Label><input type="range" min={0} max={2} step={0.1} value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} className="w-full" /></div>
          </div>
          <Input placeholder="System Prompt (optional)" value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} />
          <Textarea placeholder={i18n.t("aiPlayground.promptPlaceholder")} rows={4} value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSend(); }} />
          <div className="flex items-center gap-4">
            <Button onClick={handleSend} disabled={loading || !prompt.trim()}><Send className="size-4" /> {loading ? i18n.t("aiPlayground.sending") : i18n.t("aiPlayground.send")}</Button>
            {loading && <Button variant="destructive" onClick={handleStop}><Radio className="size-4" /> {i18n.t("aiPlayground.stop")}</Button>}
            <div className="flex items-center gap-2 mr-auto">
              <Label className="text-xs cursor-pointer">Streaming</Label>
              <Switch checked={streaming} onCheckedChange={setStreaming} />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <Alert variant="destructive" className="mb-2"><AlertDescription>{error}</AlertDescription></Alert>}

      {(displayReply || loading) && <Card><CardContent className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <h2 className="text-base font-semibold">{i18n.t("aiPlayground.reply")}</h2>
          <div className="flex items-center gap-1 flex-wrap">
            {displayMeta.latencyMs != null && <Badge variant="outline"><Timer className="size-3" /> {displayMeta.latencyMs}ms</Badge>}
            {displayMeta.totalTokens != null && <Badge variant="outline"><BarChart3 className="size-3" /> {displayMeta.totalTokens} tokens</Badge>}
            {displayReply && <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(displayReply).then(() => toast.success(i18n.t("aiPlayground.copied"))); }}><Copy className="size-4" /></Button>}
          </div>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg border max-h-[500px] overflow-auto whitespace-pre-wrap text-left font-mono text-sm leading-relaxed">
          {displayReply || (loading ? <span className="italic text-muted-foreground">{i18n.t("aiPlayground.receivingReply")}</span> : <span className="italic text-muted-foreground">{i18n.t("aiPlayground.emptyReply")}</span>)}
          {loading && <span className="animate-pulse">▌</span>}
        </div>
        <div className="flex flex-wrap gap-1">
          {displayMeta.provider && <Badge>Provider: {displayMeta.provider}</Badge>}
          {displayMeta.model && <Badge>Model: {displayMeta.model}</Badge>}
          {result?.keyName && <Badge>Key: {result.keyName}</Badge>}
          <Badge>Temp: {temperature}</Badge>
          {streaming && <Badge variant="secondary"><Radio className="size-3" /> Streaming</Badge>}
        </div>
      </CardContent></Card>}
    </div>
  );
};

export default SuperAdminAIPlayground;