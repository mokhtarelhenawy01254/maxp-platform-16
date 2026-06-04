import React from "react";
import {
  Box,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

interface ProcurementMobileField {
  label: React.ReactNode;
  value: React.ReactNode;
  fullWidth?: boolean;
  emphasis?: boolean;
}

interface ProcurementMobileCardProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  status?: React.ReactNode;
  fields?: ProcurementMobileField[];
  actions?: React.ReactNode;
}

interface ProcurementMobileStateProps {
  children: React.ReactNode;
}

export function ProcurementMobileCard({
  eyebrow,
  title,
  subtitle,
  status,
  fields = [],
  actions,
}: ProcurementMobileCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: "divider",
        boxShadow: "0 14px 34px rgba(15, 23, 42, 0.08)",
        overflow: "hidden",
      }}
    >
      <CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}>
        <Stack spacing={1.75}>
          <Box
            sx={{
              alignItems: "flex-start",
              display: "flex",
              gap: 1.5,
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              {eyebrow && (
                <Typography
                  color="text.secondary"
                  sx={{ fontWeight: 700, letterSpacing: "0.04em", mb: 0.5 }}
                  variant="caption"
                >
                  {eyebrow}
                </Typography>
              )}
              <Typography
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.25,
                  overflowWrap: "anywhere",
                }}
                variant="h6"
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  color="text.secondary"
                  sx={{ mt: 0.5, overflowWrap: "anywhere" }}
                  variant="body2"
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
            {status && <Box sx={{ flexShrink: 0 }}>{status}</Box>}
          </Box>

          {fields.length > 0 && (
            <Box
              sx={{
                display: "grid",
                gap: 1.25,
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              }}
            >
              {fields.map((field, index) => (
                <Box
                  key={`${String(field.label)}-${index}`}
                  sx={{
                    bgcolor: "action.hover",
                    borderRadius: 2,
                    gridColumn: field.fullWidth ? "1 / -1" : "auto",
                    minWidth: 0,
                    p: 1.25,
                  }}
                >
                  <Typography
                    color="text.secondary"
                    sx={{ display: "block", mb: 0.4 }}
                    variant="caption"
                  >
                    {field.label}
                  </Typography>
                  <Typography
                    component="div"
                    sx={{
                      fontWeight: field.emphasis ? 800 : 650,
                      lineHeight: 1.35,
                      overflowWrap: "anywhere",
                    }}
                    variant="body2"
                  >
                    {field.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {actions && (
            <>
              <Divider />
              <Box sx={{ display: "flex", gap: 0.5, justifyContent: "end" }}>
                {actions}
              </Box>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ProcurementMobileState({
  children,
}: ProcurementMobileStateProps) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent sx={{ py: 4, textAlign: "center" }}>
        <Typography color="text.secondary">{children}</Typography>
      </CardContent>
    </Card>
  );
}
