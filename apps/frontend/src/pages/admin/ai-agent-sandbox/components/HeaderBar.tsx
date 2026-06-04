import React from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  IconButton,
  Divider,
  Chip,
  Button,
} from "@mui/material";
import {
  SwapHoriz as CompareIcon,
  Download as ExportIcon,
  Science as SandboxIcon,
  Assessment as EvalIcon,
} from "@mui/icons-material";
import type { AgentConfig, ModelConfig } from "../types/sandbox.types";
import type { CentralKeyConfig } from "../types/sandbox.types";

interface HeaderBarProps {
  agent: AgentConfig;
  agents: AgentConfig[];
  model: string;
  keyId?: string | null;
  models: ModelConfig[];
  centralKeys?: CentralKeyConfig[];
  onAgentChange: (agentId: string) => void;
  onModelChange: (model: string, provider: string, keyId?: string | null) => void;
  onEvaluate: () => void;
  onCompare?: () => void;
  onExport?: () => void;
  isStreaming: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  agent,
  agents,
  model,
  keyId,
  models,
  centralKeys = [],
  onAgentChange,
  onModelChange,
  onEvaluate,
  onCompare,
  onExport,
  isStreaming,
}) => {
  const agentSelectLabelId = "ai-sandbox-agent-select-label";
  const modelSelectLabelId = "ai-sandbox-model-select-label";
  const optionValue = (m: ModelConfig) => `${m.provider}::${m.model}::${m.keyId || ""}`;
  const currentModel = models.find((m) => m.model === model && (!keyId || m.keyId === keyId))
    || models.find((m) => m.model === model);
  const selectedValue = currentModel ? optionValue(currentModel) : "";
  const visibleCentralKeys = centralKeys.length
    ? centralKeys
    : Object.values(models.reduce<Record<string, CentralKeyConfig>>((acc, m) => {
      if (m.keyId && m.keyName) {
        acc[m.keyId] = {
          id: m.keyId,
          name: m.keyName,
          provider: m.provider,
          keyType: "CENTRAL",
          scope: "central",
          isActive: m.keyIsActive !== false,
        };
      }
      return acc;
    }, {}));

  if (!agent || agents.length === 0) {
    return (
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 2,
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SandboxIcon color="primary" sx={{ fontSize: 20 }} />
          <Typography variant="subtitle2" fontWeight={700} fontSize={14}>
            AI Agent Sandbox
          </Typography>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Typography variant="caption" color="text.secondary">
          {agents.length === 0 ? "No agents available" : "Select an agent"}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        px: 2,
        py: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        gap: 2,
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <SandboxIcon color="primary" sx={{ fontSize: 20 }} />
        <Typography variant="subtitle2" fontWeight={700} fontSize={14}>
          AI Agent Sandbox
        </Typography>
        {isStreaming && (
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: "success.main",
              animation: "pulse 1.5s ease-in-out infinite",
              "@keyframes pulse": {
                "0%, 100%": { opacity: 1, transform: "scale(1)" },
                "50%": { opacity: 0.5, transform: "scale(0.8)" },
              },
            }}
          />
        )}
      </Box>

      <Divider orientation="vertical" flexItem />

      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id={agentSelectLabelId} fontSize={11}>Agent</InputLabel>
        <Select
          id="ai-sandbox-agent-select"
          labelId={agentSelectLabelId}
          value={agent.id}
          label="Agent"
          onChange={(e) => onAgentChange(e.target.value)}
          inputProps={{ name: "ai-sandbox-agent" }}
          sx={{ fontSize: 12 }}
        >
          {agents.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span>{a.icon}</span>
                <Box>
                  <Typography variant="body2" fontSize={12}>
                    {a.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontSize={10}>
                    {a.role}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id={modelSelectLabelId} fontSize={11}>Model</InputLabel>
        <Select
          id="ai-sandbox-model-select"
          labelId={modelSelectLabelId}
          value={selectedValue}
          label="Model"
          onChange={(e) => {
            const selected = models.find((m) => optionValue(m) === e.target.value);
            if (selected) onModelChange(selected.model, selected.provider, selected.keyId || null);
          }}
          inputProps={{ name: "ai-sandbox-model" }}
          sx={{ fontSize: 12 }}
        >
          {models.map((m) => (
            <MenuItem
              key={optionValue(m)}
              value={optionValue(m)}
              disabled={m.isSelectable === false || m.keyIsActive === false}
            >
              <Box>
                <Typography variant="body2" fontSize={12}>
                  {m.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontSize={10}>
                  {m.provider} | {m.maxTokens >= 1000000 ? `${m.maxTokens / 1000000}M` : `${m.maxTokens / 1000}K`} tokens
                </Typography>
                {m.keyName && (
                  <Typography variant="caption" color="text.secondary" fontSize={10} sx={{ display: "block" }}>
                    {m.keyName} · {m.keyId} · {m.keyIsActive === false ? "INACTIVE" : "CENTRAL"}
                  </Typography>
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {currentModel?.keyName && (
        <Box sx={{ minWidth: 180 }}>
          <Typography variant="caption" color="text.secondary" fontSize={10} sx={{ display: "block" }}>
            Central key
          </Typography>
          <Typography variant="body2" fontSize={12} fontWeight={600} noWrap>
            {currentModel.keyName}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontSize={10} noWrap>
            {currentModel.keyId}
          </Typography>
        </Box>
      )}

      {visibleCentralKeys.length > 0 && (
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel fontSize={10}>Keys</InputLabel>
          <Select
            value=""
            label="Keys"
            sx={{ fontSize: 11, height: 32 }}
            onChange={() => {}}
            displayEmpty
          >
            {visibleCentralKeys.map((key) => (
              <MenuItem key={key.id} value={key.id} disabled>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip
                    size="small"
                    label={key.isActive ? "Active" : "Inactive"}
                    color={key.isActive ? "success" : "warning"}
                    sx={{ height: 16, fontSize: 9 }}
                  />
                  <Typography variant="body2" fontSize={11}>
                    {key.name}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Box sx={{ flex: 1 }} />

      <Tooltip title="Evaluate last response">
        <Button
          size="small"
          variant="outlined"
          color="primary"
          onClick={onEvaluate}
          disabled={isStreaming}
          startIcon={<EvalIcon sx={{ fontSize: 16 }} />}
          sx={{ fontSize: 11, height: 32 }}
        >
          Evaluate
        </Button>
      </Tooltip>

      {onExport && (
        <Tooltip title="Export Session">
          <IconButton size="small" onClick={onExport} disabled={isStreaming}>
            <ExportIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {onCompare && (
        <Tooltip title="Compare Models">
          <IconButton size="small" onClick={onCompare} disabled={isStreaming}>
            <CompareIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};
