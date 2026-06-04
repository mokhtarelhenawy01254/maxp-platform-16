import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box, Typography, TextField, IconButton, Avatar, Chip, Tooltip,
  CircularProgress, Alert, Paper, Divider, Button, Stack,
  ListItem, ListItemAvatar, ListItemText, ListItemButton, Drawer,
  useMediaQuery, useTheme,
} from "@mui/material";
import {
  Send as SendIcon, SmartToy as BotIcon, Person as PersonIcon,
  ArrowBack as BackIcon, Build as BuildIcon,
} from "@mui/icons-material";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";
import i18n from "../../i18n";

interface CompanyAgent {
  id: string;
  name: string;
  role: string;
  status: string;
  tools: string[];
  model?: string;
  soul?: string;
  description?: string;
  icon?: string;
  parent_id?: string;
  department_id?: string;
  template_slug?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

const AGENTS_API = "proxy/ai-service/agents";
const CEO_CHAT_API = "ai/chat/message";

export default function SubAgentsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [agents, setAgents] = useState<CompanyAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAgent, setSelectedAgent] = useState<CompanyAgent | null>(null);
  const [chatMode, setChatMode] = useState<"agent" | "ceo">("agent");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(AGENTS_API), {
        headers: tokenManager.createAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) setAgents(data.agents || []);
      else throw new Error(data.error || i18n.t("subAgents.loadFailed"));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSelectAgent = (agent: CompanyAgent) => {
    setSelectedAgent(agent);
    setChatMode("agent");
    setMessages([]);
    if (isMobile) setDrawerOpen(false);
  };

  const handleCeoChat = () => {
    setSelectedAgent(null);
    setChatMode("ceo");
    setMessages([]);
    if (isMobile) setDrawerOpen(false);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");

    const userMsg: ChatMessage = { role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      if (chatMode === "ceo") {
        const res = await fetch(buildApiUrl(CEO_CHAT_API), {
          method: "POST",
          headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();
        if (data.success) {
          const aiMsg: ChatMessage = { role: "assistant", content: String(data.reply || "").trim(), timestamp: new Date().toISOString() };
          setMessages((prev) => [...prev, aiMsg]);
        } else throw new Error(data.error || i18n.t("subAgents.failed"));
      } else if (selectedAgent) {
        const res = await fetch(buildApiUrl(`${AGENTS_API}/chat`), {
          method: "POST",
          headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ message: text, agentId: selectedAgent.id }),
        });
        const data = await res.json();
        if (data.success) {
          const aiMsg: ChatMessage = { role: "assistant", content: String(data.reply || "").trim(), timestamp: new Date().toISOString() };
          setMessages((prev) => [...prev, aiMsg]);
        } else throw new Error(data.error || i18n.t("subAgents.failed"));
      }
    } catch (err: any) {
      const errMsg: ChatMessage = { role: "assistant", content: `${i18n.t("subAgents.errorPrefix")}: ${err.message}`, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  };

  const agentList = (
    <Box sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        {i18n.t("subAgents.title")}
      </Typography>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ flex: 1, overflow: "auto" }}>
          <ListItemButton selected={chatMode === "ceo" && !selectedAgent} onClick={handleCeoChat} sx={{ borderRadius: 2, mb: 1 }}>
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: "primary.main" }}><BotIcon /></Avatar>
            </ListItemAvatar>
            <ListItemText primary={i18n.t("subAgents.ceoAgent")} secondary={i18n.t("subAgents.ceoAgentDesc")} />
          </ListItemButton>
          <Divider sx={{ my: 1 }} />
          {agents.filter((a) => a.role !== "CEO").map((agent) => (
            <ListItemButton
              key={agent.id}
              selected={selectedAgent?.id === agent.id}
              onClick={() => handleSelectAgent(agent)}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: agent.status === "ACTIVE" ? "success.main" : "grey.400" }}>
                  {agent.name?.charAt(0) || "A"}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={agent.name}
                secondary={
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }} component="span">
                    <Chip label={agent.role} size="small" color="primary" variant="outlined" />
                    <Chip label={agent.status} size="small" color={agent.status === "ACTIVE" ? "success" : "default"} />
                  </Stack>
                }
              />
            </ListItemButton>
          ))}
        </Box>
      )}
    </Box>
  );

  const chatPanel = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {isMobile && (
        <Box sx={{ p: 1, borderBottom: 1, borderColor: "divider" }}>
          <IconButton onClick={() => setDrawerOpen(true)}><BackIcon /></IconButton>
          <Typography variant="subtitle1" sx={{ display: "inline", mr: 1 }}>
            {chatMode === "ceo" ? i18n.t("subAgents.ceoAgent") : selectedAgent?.name || i18n.t("subAgents.chat")}
          </Typography>
        </Box>
      )}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        {messages.length === 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5 }}>
            <BotIcon sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h6">{i18n.t("subAgents.startChat")}</Typography>
            <Typography variant="body2" color="text.secondary">
              {chatMode === "ceo"
                ? i18n.t("subAgents.talkToCeo")
                : i18n.t("subAgents.askAgent", { name: selectedAgent?.name || i18n.t("subAgents.agent") })}
            </Typography>
          </Box>
        ) : (
          messages.map((msg, i) => (
            <Box key={i} sx={{ display: "flex", justifyContent: msg.role === "user" ? "flex-start" : "flex-end", mb: 2 }}>
              <Paper elevation={1} sx={{ p: 2, maxWidth: "80%", bgcolor: msg.role === "user" ? "primary.light" : "grey.100" }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  {msg.role === "user" ? <PersonIcon fontSize="small" /> : <BotIcon fontSize="small" />}
                  <Typography variant="caption" color="text.secondary">{formatTime(msg.timestamp)}</Typography>
                </Stack>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{msg.content}</Typography>
              </Paper>
            </Box>
          ))
        )}
        <div ref={chatEndRef} />
      </Box>
      <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth size="small" placeholder={i18n.t("subAgents.placeholder")}
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            disabled={sending}
            multiline maxRows={3}
          />
          <IconButton color="primary" onClick={sendMessage} disabled={sending || !input.trim()}>
            {sending ? <CircularProgress size={24} /> : <SendIcon />}
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );

  const agentDetailPanel = selectedAgent && !isMobile ? (
    <Box sx={{ p: 2, height: "100%", overflow: "auto" }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>{i18n.t("subAgents.agentDetails")}</Typography>
      <Stack spacing={2}>
        <Box>
          <Typography variant="caption" color="text.secondary">{i18n.t("subAgents.name")}</Typography>
          <Typography variant="body2">{selectedAgent.name}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">{i18n.t("subAgents.role")}</Typography>
          <Chip label={selectedAgent.role} size="small" color="primary" />
        </Box>
        {selectedAgent.model && (
          <Box>
            <Typography variant="caption" color="text.secondary">{i18n.t("subAgents.model")}</Typography>
            <Typography variant="body2">{selectedAgent.model}</Typography>
          </Box>
        )}
        {selectedAgent.soul && (
          <Box>
            <Typography variant="caption" color="text.secondary">{i18n.t("subAgents.instructions")}</Typography>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", fontSize: "0.75rem", color: "text.secondary" }}>
              {selectedAgent.soul.length > 200 ? `${selectedAgent.soul.slice(0, 200)}...` : selectedAgent.soul}
            </Typography>
          </Box>
        )}
        <Divider />
        <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <BuildIcon fontSize="inherit" /> {i18n.t("subAgents.tools")} ({selectedAgent.tools?.length || 0})
        </Typography>
        {selectedAgent.tools?.length > 0 ? (
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }} useFlexGap>
            {selectedAgent.tools.map((tool, i) => (
              <Chip key={i} label={tool} size="small" variant="outlined" />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">{i18n.t("subAgents.noTools")}</Typography>
        )}
      </Stack>
    </Box>
  ) : null;

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" action={<Button size="small" onClick={fetchAgents}>{i18n.t("subAgents.retry")}</Button>}>{error}</Alert>
      </Box>
    );
  }

  if (isMobile) {
    return (
      <Box sx={{ height: "calc(100vh - 64px)", display: "flex" }}>
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Box sx={{ width: 300 }}>{agentList}</Box>
        </Drawer>
        {chatPanel}
      </Box>
    );
  }

  return (
    <Box sx={{ height: "calc(100vh - 64px)", display: "flex" }}>
      <Paper sx={{ width: 300, borderRadius: 0, borderRight: 1, borderColor: "divider", overflow: "auto" }}>
        {agentList}
      </Paper>
      <Box sx={{ flex: 1 }}>{chatPanel}</Box>
      {agentDetailPanel && (
        <Paper sx={{ width: 280, borderRadius: 0, borderLeft: 1, borderColor: "divider" }}>
          {agentDetailPanel}
        </Paper>
      )}
    </Box>
  );
}
