import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useTheme } from "../hooks/useTheme";
import { buildApiUrl } from "../utils/urlHelper";
import { tokenManager } from "../utils/tokenManager";
import { Send, Copy, RefreshCw, Bot, Timer, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const PROVIDERS = [
  { value: "GOOGLE", label: "Google" }, { value: "GROQ", label: "Groq" }, { value: "CEREBRAS", label: "Cerebras" },
  { value: "OPENROUTER", label: "OpenRouter" }, { value: "NVIDIA", label: "NVIDIA" }, { value: "MISTRAL", label: "Mistral" },
  { value: "SAMBANOVA", label: "SambaNova" }, { value: "GITHUB", label: "GitHub Models" }, { value: "DEEPSEEK", label: "DeepSeek" },
  { value: "OPENAI", label: "OpenAI" }, { value: "ANTHROPIC", label: "Anthropic" }, { value: "OLLAMA", label: "Ollama" }, { value: "HUGGINGFACE", label: "HuggingFace" },
];

const DEFAULT_MODELS = { GOOGLE: "gemini-2.5-flash", GROQ: "llama-3.3-70b-versatile", CEREBRAS: "qwen-3-235b-a22b-instruct-2507", OPENROUTER: "openrouter/auto", NVIDIA: "openai/gpt-oss-120b", MISTRAL: "mistral-large-latest", SAMBANOVA: "DeepSeek-V3.1", GITHUB: "gpt-4o", DEEPSEEK: "deepseek-chat", OPENAI: "gpt-4o-mini", ANTHROPIC: "claude-3-5-sonnet", OLLAMA: "llama3.2", HUGGINGFACE: "mistralai/Mistral-7B-Instruct-v0.3" };

const SuperAdminAIPlayground = () => {
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const [provider, setProvider] = useState("GOOGLE");
  const [model, setModel] = useState(DEFAULT_MODELS.GOOGLE);
  const [prompt, setPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => { setModel(DEFAULT_MODELS[provider] || ""); }, [provider]);

  const handleSend = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setError(""); setResult(null);
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

  return (
    <div className="p-3 rtl">
      <h1 className="text-xl font-bold mb-3 flex items-center gap-1"><Bot className="size-5" /> AI Playground</h1>

      <Card className={`mb-3 ${isDark ? "bg-card border-border" : ""}`}>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Select value={provider} onValueChange={setProvider}><SelectTrigger><SelectValue placeholder="Provider" /></SelectTrigger><SelectContent>{PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select>
            <Input placeholder="Model" value={model} onChange={e => setModel(e.target.value)} />
            <Input type="number" label="Max Tokens" value={maxTokens} onChange={e => setMaxTokens(e.target.value)} min={1} max={128000} />
            <div><Label className="text-xs">Temperature: {temperature}</Label><input type="range" min={0} max={2} step={0.1} value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} className="w-full" /></div>
          </div>
          <Input placeholder="System Prompt (optional)" value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} />
          <Textarea placeholder="اكتب prompt هنا... (Ctrl+Enter للإرسال)" rows={4} value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSend(); }} />
          <Button onClick={handleSend} disabled={loading || !prompt.trim()}><Send className="size-4" /> {loading ? "جارٍ الإرسال..." : "إرسال"}</Button>
        </CardContent>
      </Card>

      {error && <Alert variant="destructive" className="mb-2"><AlertDescription>{error}</AlertDescription></Alert>}

      {result && <Card className={`${isDark ? "bg-card border-border" : ""}`}><CardContent className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <h2 className="text-base font-semibold">الرد</h2>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline"><Timer className="size-3" /> {result.latencyMs}ms</Badge>
            <Badge variant="outline"><BarChart3 className="size-3" /> {result.totalTokens ?? 0} tokens</Badge>
            <Badge variant="outline">Input: {result.inputTokens ?? 0}</Badge>
            <Badge variant="outline">Output: {result.outputTokens ?? 0}</Badge>
            <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(result.reply).then(() => toast.success("تم النسخ")); }}><Copy className="size-4" /></Button>
          </div>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg border max-h-[500px] overflow-auto whitespace-pre-wrap text-left font-mono text-sm leading-relaxed">{result.reply || <span className="italic text-muted-foreground">(رد فارغ)</span>}</div>
        <div className="flex flex-wrap gap-1"><Badge>Provider: {result.provider}</Badge><Badge>Model: {result.model}</Badge>{result.keyName && <Badge>Key: {result.keyName}</Badge>}<Badge>Temp: {result.temperature}</Badge></div>
      </CardContent></Card>}
    </div>
  );
};

export default SuperAdminAIPlayground;