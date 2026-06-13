import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Brain,
  Users,
  Wrench,
  Zap,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Bot,
} from "lucide-react";
import { sandboxApi, type AgentProfileResponse, type AgentSkillDetail } from "../ai-agent-sandbox/services/sandboxApi";

type Tab = "soul" | "agents" | "tools" | "skills";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "soul",   label: "Soul",   icon: <Brain className="size-4" /> },
  { key: "agents", label: "Agents", icon: <Users className="size-4" /> },
  { key: "tools",  label: "Tools",  icon: <Wrench className="size-4" /> },
  { key: "skills", label: "Skills", icon: <Zap className="size-4" /> },
];

function MarkdownBlock({ content }: { content: string }) {
  if (!content) return <p className="text-sm text-slate-400 italic">No content available.</p>;
  return (
    <pre className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono break-words">
      {content}
    </pre>
  );
}

function ToolBadge({ name }: { name: string }) {
  const isWrite =
    name.includes("create") || name.includes("update") ||
    name.includes("delete") || name.includes("send") || name.includes("write");
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
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
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Zap className="size-4 text-indigo-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
            {skill.displayName || skill.id}
          </span>
          <span className="text-xs text-slate-400 font-mono flex-shrink-0">{skill.id}</span>
        </div>
        {open
          ? <ChevronDown className="size-4 text-slate-400 flex-shrink-0" />
          : <ChevronRight className="size-4 text-slate-400 flex-shrink-0" />
        }
      </button>
      {open && (
        <div className="px-4 py-3 space-y-3 bg-white dark:bg-slate-900">
          {skill.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400">{skill.description}</p>
          )}
          {skill.instructions && (
            <p className="text-xs text-slate-500 dark:text-slate-500 italic border-l-2 border-slate-200 pl-3">
              {skill.instructions}
            </p>
          )}
          {skill.allowedTools.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Tools ({skill.allowedTools.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {skill.allowedTools.map((t) => <ToolBadge key={t} name={t} />)}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No tools configured</p>
          )}
        </div>
      )}
    </div>
  );
}

interface AgentItem {
  id: string;
  name: string;
  role: string;
  icon?: string;
}

export default function AgentProfilesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const agentIdFromUrl = searchParams.get("agent");

  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(agentIdFromUrl);

  const [tab, setTab] = useState<Tab>("soul");
  const [profile, setProfile] = useState<AgentProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    sandboxApi.getAgents()
      .then((res) => {
        setAgents(res.agents as AgentItem[]);
        if (!selectedId && res.agents.length > 0) {
          setSelectedId(res.agents[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setAgentsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const params = new URLSearchParams(searchParams);
    params.set("agent", selectedId);
    setSearchParams(params, { replace: true });

    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);
    setProfile(null);
    sandboxApi.getAgentProfile(selectedId)
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch((err) => { if (!cancelled) setProfileError(err?.message || "Failed to load profile"); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  const selectedAgent = agents.find((a) => a.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Bot className="size-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Agents</h2>
          {!agentsLoading && (
            <span className="ml-auto text-xs text-slate-400">{agents.length}</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {agentsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-5 text-indigo-500 animate-spin" />
            </div>
          ) : agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedId(agent.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                selectedId === agent.id
                  ? "bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"
              }`}
            >
              <span className="text-xl flex-shrink-0">{(agent as any).icon || "🤖"}</span>
              <div className="min-w-0">
                <p className={`text-xs font-semibold truncate ${
                  selectedId === agent.id
                    ? "text-indigo-700 dark:text-indigo-400"
                    : "text-slate-700 dark:text-slate-300"
                }`}>
                  {agent.name}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{agent.role}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
          {selectedAgent ? (
            <>
              <span className="text-2xl">{(selectedAgent as any).icon || "🤖"}</span>
              <div>
                <h1 className="text-base font-bold text-slate-800 dark:text-slate-200">{selectedAgent.name}</h1>
                <p className="text-xs text-slate-500">{selectedAgent.role}</p>
              </div>
              {profile?.agent.templateSlug && (
                <span className="ml-auto text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                  {profile.agent.templateSlug}
                </span>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">Select an agent from the left</p>
          )}
        </div>

        <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex gap-1">
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {profileLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 text-indigo-500 animate-spin" />
            </div>
          )}

          {profileError && !profileLoading && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl max-w-lg">
              <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{profileError}</p>
            </div>
          )}

          {!profileLoading && !profileError && profile && (
            <>
              {tab === "soul" && (
                <div className="max-w-3xl">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">SOUL.md</h3>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                    <MarkdownBlock content={profile.files["SOUL.md"]} />
                  </div>
                </div>
              )}

              {tab === "agents" && (
                <div className="max-w-3xl">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">AGENTS.md</h3>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                    <MarkdownBlock content={profile.files["AGENTS.md"]} />
                  </div>
                </div>
              )}

              {tab === "tools" && (
                <div className="max-w-3xl space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">TOOLS.md</h3>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                      <MarkdownBlock content={profile.files["TOOLS.md"]} />
                    </div>
                  </div>
                  {profile.allowedTools.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                        Allowed Tools ({profile.allowedTools.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.allowedTools.map((t) => <ToolBadge key={t} name={t} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "skills" && (
                <div className="max-w-3xl space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                    Skills ({profile.skills.length})
                  </h3>
                  {profile.skills.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No skills assigned to this agent.</p>
                  ) : (
                    profile.skills.map((skill) => <SkillCard key={skill.id} skill={skill} />)
                  )}
                </div>
              )}
            </>
          )}

          {!profileLoading && !profileError && !profile && selectedId && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-5 text-indigo-500 animate-spin" />
            </div>
          )}

          {!selectedId && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Bot className="size-10 text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm text-slate-400">Select an agent to view its profile</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
