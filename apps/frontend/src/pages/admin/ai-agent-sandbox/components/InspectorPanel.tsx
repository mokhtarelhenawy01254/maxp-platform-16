import React, { useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
} from "@mui/material";
import {
  Build as ToolIcon,
  Timeline as LogIcon,
  Assessment as EvalIcon,
  Security as SafetyIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  CheckCircle as PassIcon,
  Error as FailIcon,
  Report as WarnIcon,
} from "@mui/icons-material";
import type {
  ToolDefinition,
  ActivityLogEntry,
  EvalScore,
  SafetyCheck,
} from "../types/sandbox.types";

interface InspectorPanelProps {
  tools: ToolDefinition[];
  activityLog: ActivityLogEntry[];
  evalScore: EvalScore | null;
  safetyChecks: SafetyCheck[];
  onClearLog: () => void;
  onRunSafetyCheck?: () => void;
  collapsed?: boolean;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  tools,
  activityLog,
  evalScore,
  safetyChecks,
  onClearLog,
  onRunSafetyCheck,
  collapsed = false,
}) => {
  const [tab, setTab] = useState(0);
  const [logFilter, setLogFilter] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const readTools = tools.filter((t) => t.sideEffect === "read");
  const writeTools = tools.filter((t) => t.sideEffect === "write");

  const filteredLog = activityLog.filter((entry) => {
    if (logFilter === "all") return true;
    if (logFilter === "errors") return entry.type === "error";
    return entry.type === logFilter;
  });

  return (
    <Box
      sx={{
        width: collapsed ? 0 : 300,
        minWidth: collapsed ? 0 : 300,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflow: "hidden",
        transition: "width 0.25s ease, min-width 0.25s ease",
      }}
    >
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          minHeight: 40,
          "& .MuiTab-root": { minHeight: 40, fontSize: 11, py: 0 },
        }}
      >
        <Tab icon={<ToolIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Tools" />
        <Tab icon={<LogIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Log" />
        <Tab icon={<EvalIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Eval" />
        <Tab icon={<SafetyIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Safety" />
      </Tabs>

      <Box sx={{ flex: 1, overflow: "auto" }}>
        {tab === 0 && (
          <Box sx={{ p: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                Agent Tools ({tools.length})
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <Chip
                  label={`${readTools.length} read`}
                  size="small"
                  color="info"
                  sx={{ height: 18, fontSize: 9 }}
                />
                <Chip
                  icon={<WarningIcon sx={{ fontSize: 10 }} />}
                  label={`${writeTools.length} write`}
                  size="small"
                  color="warning"
                  sx={{ height: 18, fontSize: 9 }}
                />
              </Box>
            </Box>
            {tools.map((tool) => (
              <Box
                key={tool.name}
                sx={{
                  p: 1,
                  mb: 0.5,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: tool.sideEffect === "write" ? "warning.main" : "divider",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  bgcolor: tool.sideEffect === "write" ? "rgba(237, 108, 2, 0.04)" : "transparent",
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography variant="body2" fontSize={12} fontWeight={600} noWrap>
                      {tool.name}
                    </Typography>
                    {tool.sideEffect === "write" && (
                      <Tooltip title="This tool modifies data - use with caution">
                        <WarningIcon sx={{ fontSize: 12, color: "warning.main" }} />
                      </Tooltip>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" fontSize={10} noWrap>
                    {tool.description}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Chip
                    label={tool.sideEffect}
                    size="small"
                    color={tool.sideEffect === "read" ? "info" : "warning"}
                    sx={{ height: 18, fontSize: 9 }}
                  />
                  <Switch checked={tool.enabled} size="small" disabled />
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ p: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Activity ({filteredLog.length})
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {["all", "input", "plan", "tool_call", "reply", "error"].map((type) => (
                  <Chip
                    key={type}
                    label={
                      type === "all"
                        ? "All"
                        : type === "plan"
                        ? "Pipeline"
                        : type === "tool_call"
                        ? "Tools"
                        : type.charAt(0).toUpperCase() + type.slice(1)
                    }
                    size="small"
                    variant={logFilter === type ? "filled" : "outlined"}
                    color={logFilter === type ? "primary" : "default"}
                    onClick={() => setLogFilter(type)}
                    sx={{ height: 20, fontSize: 9 }}
                  />
                ))}
              </Box>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
              <Tooltip title="Clear Log">
                <IconButton size="small" onClick={onClearLog}>
                  <ClearIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>

            {filteredLog.length === 0 && (
              <Typography variant="body2" color="text.secondary" fontSize={12} sx={{ textAlign: "center", py: 3 }}>
                No activity yet. Start a conversation.
              </Typography>
            )}

            {filteredLog.map((entry) => (
              <Accordion
                key={entry.id}
                expanded={expandedLogId === entry.id}
                onChange={(_, expanded) => setExpandedLogId(expanded ? entry.id : null)}
                sx={{
                  bgcolor: "transparent",
                  boxShadow: "none",
                  "&:before": { display: "none" },
                  "& .MuiAccordionSummary-root": { px: 0, minHeight: 32 },
                  "& .MuiAccordionDetails-root": { px: 0 },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flex: 1 }}>
                    <Typography variant="caption" sx={{ fontFamily: "monospace", fontSize: 9, color: "text.secondary", minWidth: 45 }}>
                      {new Date(entry.timestamp).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      })}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {entry.icon}
                    </Typography>
                    <Typography variant="body2" fontSize={11} fontWeight={600} noWrap>
                      {entry.title}
                    </Typography>
                    {entry.latencyMs !== undefined && (
                      <Chip
                        label={`${entry.latencyMs}ms`}
                        size="small"
                        sx={{ height: 14, fontSize: 8, ml: "auto" }}
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ pl: 4 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontSize={10}
                      sx={{ display: "block", wordBreak: "break-all" }}
                    >
                      {entry.details}
                    </Typography>
                    {entry.metadata && (
                      <Box sx={{ mt: 1, p: 1, bgcolor: "#1e1e1e", border: "1px solid #333", borderRadius: 1, overflowX: "auto" }}>
                        <Typography
                          component="pre"
                          variant="caption"
                          sx={{
                            fontFamily: "monospace",
                            fontSize: 9,
                            color: "#e3e3e3",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            m: 0,
                          }}
                        >
                          {JSON.stringify(entry.metadata, null, 2)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ p: 2 }}>
            {!evalScore ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <EvalIcon sx={{ fontSize: 40, color: "text.secondary", opacity: 0.4, mb: 1 }} />
                <Typography variant="body2" color="text.secondary" fontSize={12}>
                  No evaluation yet
                </Typography>
                <Typography variant="caption" color="text.secondary" fontSize={11}>
                  Click "Evaluate" to score the last response
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                  Evaluation Score
                </Typography>

                {[
                  { label: "Accuracy", value: evalScore.accuracy, color: "success" },
                  { label: "Helpfulness", value: evalScore.helpfulness, color: "info" },
                  { label: "Relevance", value: evalScore.relevance, color: "primary" },
                  { label: "Completeness", value: evalScore.completeness, color: "warning" },
                  { label: "Safety", value: evalScore.safety, color: "error" },
                ].map(({ label, value, color }) => (
                  <Box key={label} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
                      <Typography variant="caption" fontSize={11}>
                        {label}
                      </Typography>
                      <Typography variant="caption" fontWeight={700} fontSize={11}>
                        {value}%
                      </Typography>
                    </Box>
                    <Box sx={{ height: 6, borderRadius: 3, bgcolor: "grey.800", overflow: "hidden" }}>
                      <Box
                        sx={{
                          height: "100%",
                          width: `${value}%`,
                          borderRadius: 3,
                          bgcolor: `${color}.main`,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </Box>
                  </Box>
                ))}

                <Divider sx={{ my: 2 }} />

                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: "grey.900", border: "1px solid", borderColor: "divider" }}>
                  <Typography variant="caption" color="text.secondary" fontSize={10}>
                    Overall Score
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {evalScore.overall}
                    <Typography component="span" variant="body2" color="text.secondary">
                      /100
                    </Typography>
                  </Typography>
                </Box>

                {evalScore.comment && (
                  <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: "grey.900", border: "1px solid", borderColor: "divider" }}>
                    <Typography variant="caption" color="text.secondary" fontSize={10}>
                      Judge Comment
                    </Typography>
                    <Typography variant="body2" fontSize={12} sx={{ mt: 0.5 }}>
                      {evalScore.comment}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}

        {tab === 3 && (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Safety Checks
              </Typography>
              {onRunSafetyCheck && (
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={onRunSafetyCheck}
                  startIcon={<SecurityIcon sx={{ fontSize: 14 }} />}
                  sx={{ fontSize: 10, height: 28 }}
                >
                  Run Check
                </Button>
              )}
            </Box>

            {safetyChecks.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <SafetyIcon sx={{ fontSize: 40, color: "text.secondary", opacity: 0.4, mb: 1 }} />
                <Typography variant="body2" color="text.secondary" fontSize={12}>
                  No safety checks yet
                </Typography>
                <Typography variant="caption" color="text.secondary" fontSize={11}>
                  Run a check to validate responses
                </Typography>
              </Box>
            ) : (
              safetyChecks.map((check) => (
                <Box
                  key={check.id}
                  sx={{
                    p: 1.5,
                    mb: 1,
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor:
                      check.status === "pass"
                        ? "success.main"
                        : check.status === "warn"
                        ? "warning.main"
                        : "error.main",
                    bgcolor:
                      check.status === "pass"
                        ? "rgba(46, 125, 50, 0.08)"
                        : check.status === "warn"
                        ? "rgba(237, 108, 2, 0.08)"
                        : "rgba(211, 47, 47, 0.08)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {check.status === "pass" ? (
                      <PassIcon sx={{ fontSize: 16, color: "success.main" }} />
                    ) : check.status === "warn" ? (
                      <WarnIcon sx={{ fontSize: 16, color: "warning.main" }} />
                    ) : (
                      <FailIcon sx={{ fontSize: 16, color: "error.main" }} />
                    )}
                    <Typography variant="body2" fontSize={12} fontWeight={600}>
                      {check.name}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" fontSize={11} sx={{ mt: 0.5, display: "block" }}>
                    {check.message}
                  </Typography>
                </Box>
              ))
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};
