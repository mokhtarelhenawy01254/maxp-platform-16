import React from "react";
import { Box, Typography, Chip, Tooltip } from "@mui/material";
import { CostBreakdown } from "../hooks/useCostTracker";

interface StatusBarProps {
  messageCount: number;
  toolCallCount: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  costBreakdown: CostBreakdown;
  formatCost: (cost: number) => string;
  formatTokens: (tokens: number) => string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  messageCount,
  toolCallCount,
  totalTokens,
  totalCost,
  avgLatency,
  costBreakdown,
  formatCost,
  formatTokens,
}) => {
  return (
    <Box
      sx={{
        px: 2,
        py: 0.75,
        borderTop: "1px solid",
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        gap: 2,
        bgcolor: "background.paper",
        flexWrap: "wrap",
      }}
    >
      <Tooltip title="Messages">
        <Chip
          label={`${messageCount} msgs`}
          size="small"
          sx={{ height: 22, fontSize: 11 }}
        />
      </Tooltip>

      <Tooltip title="Tool Calls">
        <Chip
          label={`${toolCallCount} tools`}
          size="small"
          color="info"
          variant="outlined"
          sx={{ height: 22, fontSize: 11 }}
        />
      </Tooltip>

      <Tooltip title="Total Tokens">
        <Chip
          label={`${formatTokens(totalTokens)} tokens`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ height: 22, fontSize: 11 }}
        />
      </Tooltip>

      <Tooltip title="Average Latency">
        <Chip
          label={`${avgLatency.toFixed(0)}ms avg`}
          size="small"
          color="warning"
          variant="outlined"
          sx={{ height: 22, fontSize: 11 }}
        />
      </Tooltip>

      <Box sx={{ flex: 1 }} />

      <Tooltip title="Total Cost">
        <Typography variant="body2" fontSize={12} fontWeight={700} color="primary.main">
          {formatCost(totalCost)}
        </Typography>
      </Tooltip>
    </Box>
  );
};
