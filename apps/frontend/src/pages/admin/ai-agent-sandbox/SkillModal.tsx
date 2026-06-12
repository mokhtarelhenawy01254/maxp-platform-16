import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Chip } from "@mui/material";
import { AutoAwesome, Settings, Code } from "@mui/icons-material";
import { SkillDefinition } from "./hooks/useAgentSandbox";

interface SkillModalProps {
  open: boolean;
  skillId: string | null;
  onClose: () => void;
  skills: SkillDefinition[];
}

export default function SkillModal({
  open,
  skillId,
  onClose,
  skills,
}: SkillModalProps) {
  const skill = skills.find((s) => s.id === skillId) || null;

  if (!skill) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}>
        <Box sx={{ 
          p: 1, 
          borderRadius: 1, 
          bgcolor: "primary.light", 
          color: "primary.contrastText",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <AutoAwesome fontSize="large" />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ mb: 0 }}>{skill.name}</Typography>
          <Typography variant="caption" color="text.secondary">Skill Details</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers sx={{ pt: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" color="text.primary" paragraph>
            {skill.description}
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Allowed Tools
          </Typography>
          {skill.allowedTools.length > 0 ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {skill.allowedTools.map((tool) => (
                <Chip
                  key={tool}
                  label={tool}
                  icon={<Code fontSize="small" />}
                  size="small"
                  variant="outlined"
                  sx={{ bgcolor: "background.paper" }}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No specific tools configured for this skill.
            </Typography>
          )}
        </Box>

        <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            <Settings fontSize="small" sx={{ mr: 1, verticalAlign: "middle" }} />
            Skill Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>ID:</strong> {skill.id}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" startIcon={<AutoAwesome fontSize="small" />}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}