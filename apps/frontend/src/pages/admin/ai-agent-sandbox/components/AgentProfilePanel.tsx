import React, { useEffect, useState } from "react";
import { Brain, Users, Settings, Zap, User, ChevronDown, ChevronRight, Loader2, AlertTriangle, Wrench } from 'lucide-react';
import { sandboxApi, type AgentProfileResponse, type AgentSkillDetail } from "../services/sandboxApi";
import type { AgentConfig } from "../types/sandbox.types";

interface Props {
  selectedAgent: AgentConfig | null;
}

type Tab = "soul" | "persona" | "agents" | "tools" | "skills";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "soul",   label: "Soul",    icon: <Brain className="size-3.5" /> },
  { key: "persona",label: "Persona", icon: <User className="size-3.5" /> },
  { key: "agents", label: "Agents",  icon: <Users className="size-3.5" /> },
  { key: "tools",  label: "Tools",   icon: <Wrench className="size-3.5" /> },
  { key: "skills", label: "Skills",  icon: <Zap className="size-3.5" /> },
];

function MarkdownText({ content }: { content: string }) {
  if (!content) return <p className="text-xs text-slate-400 italic">No content</p>;
  return (
    <pre className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono break-words">
      {content}
    </pre>
  );
}

function ToolBadge({ name }: { name: string }) {
  const isWrite = name.includes("create") || name.includes("update") || name.includes("delete") || name.includes("send");
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
        isWrite
          ? "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-400"
          : "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400"
      }`}
    >
      {name}
    </span>
  );
}

function SkillCard({ skill }: { skill: AgentSkillDetail }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="size-3.5 text-indigo-500 flex-shrink-0" />
          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{skill.displayName || skill.id}</span>
        </div>
        {open ? <ChevronDown className="size-3.5 text-slate-400 flex-shrink-0" /> : <ChevronRight className="size-3.5 text-slate-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-3 py-2 space-y-2 bg-white dark:bg-slate-900">
          {skill.description && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{skill.description}</p>
          )}
          {skill.instructions && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">{skill.instructions}</p>
          )}
          {skill.allowedTools.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {skill.allowedTools.map((t) => <ToolBadge key={t} name={t} />)}
            </div>
          )}
          {skill.allowedTools.length === 0 && (
            <p className="text-[10px] text-slate-400 italic">No tools configured</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentProfilePanel({ selectedAgent }: Props) {
  const [tab, setTab] = useState<Tab>("soul");
  const [profile, setProfile] = useState<AgentProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAgent?.id) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    sandboxApi.getAgentProfile(selectedAgent.id)
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch((err) => { if (!cancelled) setError(err?.message || "Failed to load profile"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedAgent?.id]);

  if (!selectedAgent) {
    return (
      <div className="flex items-center justify-center bg-white dark:bg-slate-900">
        <p className="text-xs text-slate-400">No agent selected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
      {/* Agent header */}
      <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{selectedAgent.icon || "🤖"}</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{selectedAgent.name}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{selectedAgent.role}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors ${
              tab === key
                ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-4 text-indigo-500 animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="size-3.5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && profile && (
          <>
            {tab === "soul" && (
              <MarkdownText content={profile.files["SOUL.md"]} />
            )}

            {tab === "persona" && (
              <MarkdownText content={profile.files["PERSONA.md"]} />
            )}

            {tab === "agents" && (
              <MarkdownText content={profile.files["AGENTS.md"]} />
            )}

            {tab === "tools" && (
              <div className="space-y-3">
                <MarkdownText content={profile.files["TOOLS.md"]} />
                {profile.allowedTools.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Allowed Tools ({profile.allowedTools.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {profile.allowedTools.map((t) => <ToolBadge key={t} name={t} />)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "skills" && (
              <div className="space-y-2">
                {profile.skills.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No skills assigned</p>
                )}
                {profile.skills.map((skill) => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
              </div>
            )}
          </>
        )}

        {!loading && !error && !profile && (
          <p className="text-xs text-slate-400 italic">Loading profile...</p>
        )}
      </div>
    </div>
  );
}
