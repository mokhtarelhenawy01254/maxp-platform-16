import React from "react";
import { SkillDefinition } from "./hooks/useAgentSandbox";
import { AgentConfig } from "./types/sandbox.types";
import { Sparkles } from "lucide-react";

interface SkillSidebarProps {
  selectedAgent: AgentConfig | null;
  onSkillSelect: (skillId: string) => void;
  skills: SkillDefinition[];
}

export default function SkillSidebar({ selectedAgent, onSkillSelect, skills }: SkillSidebarProps) {
  if (!selectedAgent) {
    return (
      <div className="w-60 p-2 text-muted-foreground">
        <p className="text-sm">No agent selected</p>
      </div>
    );
  }

  const agentSkills = selectedAgent.allowedSkills || [];
  const availableSkills = skills.filter((s) => agentSkills.includes(s.id));

  if (availableSkills.length === 0) {
    return (
      <div className="w-60 p-2 text-muted-foreground">
        <p className="text-sm">No skills assigned to this agent</p>
      </div>
    );
  }

  return (
    <div className="w-60 shrink-0">
      <div className="px-3 py-1.5 border-b">
        <p className="text-sm font-semibold">Agent Skills ({availableSkills.length})</p>
      </div>
      <div className="py-1">
        {availableSkills.map((skill) => (
          <div
            key={skill.id}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onSkillSelect(skill.id)}
          >
            <Sparkles className="size-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{skill.name}</p>
              <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}