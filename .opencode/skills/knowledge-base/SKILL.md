---
name: knowledge-base
description: Use for building, querying, and maintaining a structured knowledge repository for the project. Triggered by "add to knowledge base", "search knowledge base", "what do we know about X", "document this". Use to organize project information systematically.
---

# Knowledge Base

## Structure
Maintain a knowledge base at `.opencode/knowledge/` with these sections:

```
.opencode/knowledge/
├── architecture/        # System design, component relationships
│   ├── overview.md
│   ├── backend.md
│   └── frontend.md
├── api/                 # API documentation and endpoints
│   └── endpoints.md
├── database/            # Schema, migrations, relationships
│   └── schema.md
├── workflows/           # Common workflows and processes
│   └── deployment.md
├── troubleshooting/     # Common issues and solutions
│   └── known-issues.md
└── glossary.md          # Domain-specific terminology
```

## Entry Format
Each knowledge entry should follow:
```markdown
## Topic Name
- **Status**: draft | reviewed | confirmed
- **Last Updated**: YYYY-MM-DD
- **Source**: Where this information came from
- **Related**: Links to related entries

### Content
[Clear, concise information]

### References
[Files, commits, conversations that support this]
```

## Query Process
1. Check the knowledge base before researching extensively
2. Use grep/glob tools to search knowledge files
3. Cite knowledge base entries when providing answers
4. Keep entries updated as the codebase evolves
