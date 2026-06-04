import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  TextField,
  MenuItem,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  Slider,
  Grid,
} from "@mui/material";
import {
  Send as SendIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  SmartToy as BotIcon,
  Timer as TimerIcon,
  AutoGraph as TokenIcon,
} from "@mui/icons-material";
import { useTheme } from "../hooks/useTheme";
import { buildApiUrl } from "../utils/urlHelper";
import { tokenManager } from "../utils/tokenManager";

const PROVIDERS = [
  { value: "GOOGLE", label: "Google" },
  { value: "GROQ", label: "Groq" },
  { value: "CEREBRAS", label: "Cerebras" },
  { value: "OPENROUTER", label: "OpenRouter" },
  { value: "NVIDIA", label: "NVIDIA" },
  { value: "MISTRAL", label: "Mistral" },
  { value: "SAMBANOVA", label: "SambaNova" },
  { value: "GITHUB", label: "GitHub Models" },
  { value: "DEEPSEEK", label: "DeepSeek" },
  { value: "OPENAI", label: "OpenAI" },
  { value: "ANTHROPIC", label: "Anthropic" },
  { value: "OLLAMA", label: "Ollama" },
  { value: "HUGGINGFACE", label: "HuggingFace" },
];

const DEFAULT_MODELS = {
  GOOGLE: "gemini-2.5-flash",
  GROQ: "llama-3.3-70b-versatile",
  CEREBRAS: "qwen-3-235b-a22b-instruct-2507",
  OPENROUTER: "openrouter/auto",
  NVIDIA: "openai/gpt-oss-120b",
  MISTRAL: "mistral-large-latest",
  SAMBANOVA: "DeepSeek-V3.1",
  GITHUB: "gpt-4o",
  DEEPSEEK: "deepseek-chat",
  OPENAI: "gpt-4o-mini",
  ANTHROPIC: "claude-3-5-sonnet",
  OLLAMA: "llama3.2",
  HUGGINGFACE: "mistralai/Mistral-7B-Instruct-v0.3",
};

const SuperAdminAIPlayground = () => {
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const resultRef = useRef(null);

  const [provider, setProvider] = useState("GOOGLE");
  const [model, setModel] = useState(DEFAULT_MODELS.GOOGLE);
  const [prompt, setPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    setModel(DEFAULT_MODELS[provider] || "");
  }, [provider]);

  const loadingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  const getAuthHeaders = (extra = {}) => tokenManager.createAuthHeaders(extra);

  const handleSend = async () => {
    if (!prompt.trim() || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(buildApiUrl("super-admin/ai/playground/chat"), {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          provider,
          model: model.trim() || undefined,
          prompt: prompt.trim(),
          systemPrompt: systemPrompt.trim() || undefined,
          temperature,
          maxTokens: Number(maxTokens),
        }),
      });

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.message || errData.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "Playground request failed");
      } else {
        setResult(data.data);
        scrollTimeoutRef.current = setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: "rtl" }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
        <BotIcon /> AI Playground
      </Typography>

      <Paper
        elevation={isDark ? 2 : 1}
        sx={{
          p: 3,
          mb: 3,
          bgcolor: isDark ? "grey.900" : "background.paper",
          border: isDark ? "1px solid" : "none",
          borderColor: isDark ? "grey.800" : undefined,
        }}
      >
        <Stack spacing={2.5}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                {PROVIDERS.map((p) => (
                  <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={DEFAULT_MODELS[provider] || "Model name"}
              />
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Max Tokens"
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                inputProps={{ min: 1, max: 128000 }}
              />
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                Temperature
              </Typography>
              <Slider
                value={temperature}
                onChange={(_, val) => setTemperature(val)}
                min={0}
                max={2}
                step={0.1}
                valueLabelDisplay="auto"
              />
            </Grid>
          </Grid>

          <TextField
            fullWidth
            size="small"
            label="System Prompt (optional)"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            multiline
            minRows={1}
            maxRows={3}
          />

          <TextField
            fullWidth
            label="Prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            multiline
            minRows={3}
            maxRows={8}
            placeholder="اكتب prompt هنا... (Ctrl+Enter للإرسال)"
          />

          <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSend}
              disabled={loading || !prompt.trim()}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
              sx={{ minWidth: 140 }}
            >
              {loading ? "جارٍ الإرسال..." : "إرسال"}
            </Button>
          </Box>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {result && (
        <Paper
          ref={resultRef}
          elevation={isDark ? 2 : 1}
          sx={{
            p: 3,
            bgcolor: isDark ? "grey.900" : "background.paper",
            border: isDark ? "1px solid" : "none",
            borderColor: isDark ? "grey.800" : undefined,
          }}
        >
          <Stack spacing={2}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                الرد
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip icon={<TimerIcon />} label={`${result.latencyMs}ms`} size="small" variant="outlined" />
                <Chip icon={<TokenIcon />} label={`${result.totalTokens ?? 0} tokens`} size="small" variant="outlined" />
                <Chip label={`Input: ${result.inputTokens ?? 0}`} size="small" variant="outlined" color="info" />
                <Chip label={`Output: ${result.outputTokens ?? 0}`} size="small" variant="outlined" color="success" />
                <Tooltip title="نسخ الرد">
                  <IconButton size="small" onClick={() => navigator.clipboard.writeText(result.reply).catch(() => {})}>
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>

            <Divider />

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: isDark ? "grey.850" : "grey.50",
                borderColor: isDark ? "grey.800" : "grey.200",
                maxHeight: 500,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                direction: "ltr",
                textAlign: "left",
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                fontSize: "0.875rem",
                lineHeight: 1.6,
              }}
            >
              {result.reply || <Typography color="text.secondary" fontStyle="italic">(رد فارغ)</Typography>}
            </Paper>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              <Chip label={`Provider: ${result.provider}`} size="small" color="primary" variant="outlined" />
              <Chip label={`Model: ${result.model}`} size="small" color="secondary" variant="outlined" />
              {result.keyName && <Chip label={`Key: ${result.keyName}`} size="small" variant="outlined" />}
              <Chip label={`Temp: ${result.temperature}`} size="small" variant="outlined" />
            </Box>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default SuperAdminAIPlayground;
