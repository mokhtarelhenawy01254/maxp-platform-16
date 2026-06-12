import React from "react";
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography } from "@mui/material";
import { AutoAwesome } from "@mui/icons-material";
import { SkillDefinition } from "./hooks/useAgentSandbox";
import { AgentConfig } from "./types/sandbox.types";

interface SkillSidebarProps {
  selectedAgent: AgentConfig | null;
  onSkillSelect: (skillId: string) => void;
  skills: SkillDefinition[];
}

export default function SkillSidebar({
  selectedAgent,
  onSkillSelect,
  skills,
}: SkillSidebarProps) {
  if (!selectedAgent) {
    return (
      <Box sx={{ width: 240, p: 2, color: "text.secondary" }}>
        <Typography variant="body2">No agent selected</Typography>
      </Box>
    );
  }

  const agentSkills = selectedAgent.allowedSkills || [];
  const availableSkills = skills.filter((s) => agentSkills.includes(s.id));

  if (availableSkills.length === 0) {
    return (
      <Box sx={{ width: 240, p: 2, color: "text.secondary" }}>
        <Typography variant="body2">No skills assigned to this agent</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: 240, flexShrink: 0 }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="subtitle2" fontWeight={600} color="text.primary">
          Agent Skills ({availableSkills.length})
        </Typography>
      </Box>
      <List sx={{ py: 1 }} disablePadding>
        {availableSkills.map((skill) => (
          <ListItem key={skill.id} disablePadding sx={{ px: 2, py: 1, borderRadius: 0 }}>
            <ListItemButton
              onClick={() => onSkillSelect(skill.id)}
              sx={{
                borderRadius: 0,
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: "primary.main" }}>
                <AutoAwesome fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={skill.name}
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {skill.description}
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}