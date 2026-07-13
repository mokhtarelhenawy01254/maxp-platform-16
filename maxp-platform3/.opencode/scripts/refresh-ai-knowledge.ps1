& "C:\Users\mokhtar\AppData\Local\OpenCode\opencode-cli.exe" run --command "Check GitHub AI/ML weekly trending repos and recent releases for OpenAI SDK, LangGraph, Hermes, Paperclip, MCP SDK. Update .opencode/memory/ai-knowledge-base.md with notable new tools/libraries. Update source-map.md dates. List any new AI repos worth watching." --workdir "H:\maxp-platform"

# GitHub Trending API (weekly AI repos)
$trending = Invoke-RestMethod -Uri "https://api.github.com/search/repositories?q=topic:ai+topic:agent+created:>2026-06-01&sort=stars&order=desc&per_page=10"
$trending.items | ForEach-Object { Write-Output "$($_.full_name): $($_.html_url) — $($_.stars) stars, $($_.description)" }

# === Internal MaxP SDK & Agent Tracking ===
# شوف أحدث التغييرات على SDK layer
Write-Output "--- MaxP Internal Changes ---"
$sdkFiles = @(
    "apps/ai-service/src/tools/sdk_gateway.py",
    "apps/ai-service/src/context/sdk_provider.py",
    "apps/ai-service/src/pipeline/sdk_workflow.py",
    "apps/ai-service/src/agents/base.py",
    "apps/ai-service/src/tools/manager_tools.py",
    "apps/ai-service/src/api/admin/agents.py",
    "apps/ai-service/src/agents/loader.py"
)
Push-Location H:\maxp-platform
foreach ($file in $sdkFiles) {
    $log = git log --oneline -3 -- $file
    if ($log) {
        Write-Output "$file`n$log`n"
    }
}
# شوف أي templates جديدة
$newTemplates = git diff --name-only HEAD~10 -- "apps/backend/agents/*/agent.json"
if ($newTemplates) {
    Write-Output "New/changed agent templates:`n$newTemplates"
}
Pop-Location

# === External GitHub Sources ===
$repos = @(
    "openai/openai-python",
    "openai/openai-agents-python",
    "langchain-ai/langgraph",
    "NousResearch/hermes-agent",
    "paperclipai/paperclip",
    "modelcontextprotocol/servers",
    "modelcontextprotocol/specification"
)
foreach ($repo in $repos) {
    try {
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest"
        Write-Output "$repo → $($release.tag_name) ($($release.published_at))"
    } catch {
        Write-Output "$repo → no release data"
    }
}
