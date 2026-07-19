---
name: memory-retrieval
description: Use for efficiently retrieving stored information from memory files, knowledge base, and session history. Triggered by "recall", "what do we know about", "look up", "find information about". Use before researching externally — check internal memory first.
---

# Memory Retrieval

## Retrieval Priority
When looking for information, search in this order:
1. **Active Session Context**: Current conversation, file reads in this session
2. **Long-Term Memory**: `.opencode/memory/` files
3. **Knowledge Base**: `.opencode/knowledge/` files
4. **Codebase**: Source files, configs, documentation in the repo
5. **External**: Web searches, documentation sites

## Search Techniques

### Exact Match
- Look for specific file names, function names, error messages
- Use grep for exact strings
- Check file modification times for recency

### Semantic Search
- Search for concepts related to the query
- Look in related files and modules
- Follow import chains and references

### Temporal Search
- Check session logs for recent activity
- Look at git history for recent changes
- Review recently modified files

## Retrieval Patterns

### "What do we know about X?"
1. Grep memory files for X
2. Check knowledge base entries
3. Search codebase for files containing X
4. Summarize findings with source attribution

### "What did we decide about Y?"
1. Check `.opencode/memory/decisions.md`
2. Search session history for discussions about Y
3. Look for TODO/FIXME comments in code

### "Where was Z implemented?"
1. Grep for function/class signatures
2. Follow import paths
3. Check directory structure for module organization

## Output Format
When presenting retrieved information:
- **Source**: Where the information was found (file:line)
- **Content**: What was found
- **Freshness**: When it was last updated or confirmed
- **Confidence**: How reliable this information is
