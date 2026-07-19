---
name: tool-optimizer
description: Use for optimizing tool usage patterns — parallelizing calls, reducing redundant work, and choosing the most efficient tool for each task. Triggered by "optimize your workflow", "be more efficient", "use tools better". Use proactively for performance-sensitive operations.
---

# Tool Optimizer

## Optimization Principles

### 1. Parallelize Independent Calls
- Batch independent read, grep, glob, and bash calls into single messages
- Tools that share no dependencies should run simultaneously
- Exception: Sequential tools (edit after read, write after check)

### 2. Choose the Right Tool
| Task | Preferred Tool | Avoid |
|------|---------------|-------|
| Find files by name | glob | Get-ChildItem |
| Search file contents | grep | Select-String |
| Read file contents | read | Get-Content |
| Edit file | edit | Set-Content |
| Write new file | write | Set-Content / Out-File |
| File operations | read/write/edit/glob/grep | PowerShell cmdlets |
| Shell operations | bash | PowerShell for git/npm/docker |
| Research large scope | task (subagent) | Sequential manual searching |

### 3. Minimize Redundant Work
- Cache file reads: don't re-read a file you already read this session
- Use targeted grep instead of reading entire large files
- Use edit (exact string replacement) instead of write (full file) for small changes
- Batch related edits into fewer edit calls when possible

### 4. Efficient Search Patterns
- Start with broad searches, narrow down
- Use glob first to find relevant files, then grep within them
- When searching for multiple patterns, batch grep calls
- Use task subagents for complex multi-location searches

### 5. Context Efficiency
- Read files at appropriate chunk sizes (not 30-line micro-reads)
- Use offset/limit for large files instead of re-reading
- When exploring deeply nested structures, use a task subagent

## Anti-Patterns to Avoid
- Reading a file you already read this session
- Using bash for file operations (use read/write/edit/glob/grep)
- Sequential tool calls when parallel is possible
- Reading a file line-by-line with multiple read calls
- Using Get-ChildItem when glob is available
- Using Select-String when grep is available
