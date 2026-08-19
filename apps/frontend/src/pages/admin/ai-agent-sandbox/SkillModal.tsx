import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { SkillDefinition } from "./hooks/useAgentSandbox";
import { Code, Settings, Sparkles, Star } from 'lucide-react';

interface SkillModalProps {
  open: boolean;
  skillId: string | null;
  onClose: () => void;
  skills: SkillDefinition[];
}

export default function SkillModal({ open, skillId, onClose, skills }: SkillModalProps) {
  const skill = skills.find((s) => s.id === skillId) || null;

  if (!skill) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 pb-1">
            <div className="p-2 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="size-6" />
            </div>
            <div>
              <DialogTitle className="mb-0">{skill.name}</DialogTitle>
              <DialogDescription>Skill Details</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-foreground">{skill.description}</p>

          <div>
            <h3 className="text-sm font-semibold mb-2">Allowed Tools</h3>
            {skill.allowedTools.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {skill.allowedTools.map((tool) => (
                  <Badge key={tool} variant="outline" className="bg-card">
                    <Code className="size-3" /> {tool}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No specific tools configured for this skill.</p>
            )}
          </div>

          <div className="p-3 bg-muted/50 rounded-lg border">
            <h3 className="text-sm font-semibold mb-1"><Settings className="size-4 inline mr-1 align-middle" /> Skill Configuration</h3>
            <p className="text-sm text-muted-foreground"><strong>ID:</strong> {skill.id}</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            <Sparkles className="size-4" /> Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}