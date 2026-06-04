import React, { useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Switch,
  Chip,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Build as ToolIcon,
  Timeline as LogIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import type {
  ToolDefinition,
  ActivityLogEntry,
} from "../types/sandbox.types";

interface InspectorPanelProps {
  tools: ToolDefinition[];
  activityLog: ActivityLogEntry[];
  onClearLog: () => void;
  collapsed?: boolean;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  tools,
  activityLog,
  onClearLog,
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
      </Box>
    </Box>
  );
};
