import React from "react";
import { Box, Typography, Chip, Divider, Tooltip } from "@mui/material";
import { CostBreakdown } from "../hooks/useCostTracker";

interface CostTrackerProps {
  breakdown: CostBreakdown;
  formatCost: (cost: number) => string;
  formatTokens: (tokens: number) => string;
}

export const CostTracker: React.FC<CostTrackerProps> = ({
  breakdown,
  formatCost,
  formatTokens,
}) => {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="caption" color="text.secondary" fontSize={10} sx={{ mb: 1, display: "block" }}>
        Cost Breakdown
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" fontSize={9}>
            Input Tokens
          </Typography>
          <Typography variant="body2" fontSize={12} fontWeight={600}>
            {formatTokens(breakdown.inputTokens)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontSize={9}>
            Output Tokens
          </Typography>
          <Typography variant="body2" fontSize={12} fontWeight={600}>
            {formatTokens(breakdown.outputTokens)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontSize={9}>
            Input Cost
          </Typography>
          <Typography variant="body2" fontSize={12} fontWeight={600} color="info.main">
            {formatCost(breakdown.inputCost)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontSize={9}>
            Output Cost
          </Typography>
          <Typography variant="body2" fontSize={12} fontWeight={600} color="warning.main">
            {formatCost(breakdown.outputCost)}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 1 }} />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="caption" color="text.secondary" fontSize={9}>
          Tool Calls
        </Typography>
        <Chip label={breakdown.toolCallCount} size="small" sx={{ height: 18, fontSize: 10 }} />
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary" fontSize={9}>
          Total Cost
        </Typography>
        <Typography variant="body2" fontSize={14} fontWeight={700} color="primary.main">
          {formatCost(breakdown.totalCost)}
        </Typography>
      </Box>

      <Tooltip title="Estimated monthly cost based on 30 sessions">
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontSize={9}>
            Est. Monthly
          </Typography>
          <Typography variant="caption" color="text.secondary" fontSize={10}>
            {formatCost(breakdown.estimatedMonthly)}
          </Typography>
        </Box>
      </Tooltip>
    </Box>
  );
};
