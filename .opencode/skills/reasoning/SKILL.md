---
name: reasoning
description: Use for structured reasoning about complex problems, debugging, architectural decisions, or when the user needs step-by-step analysis. Triggered by "reason through this", "analyze this problem", "debug this logically", "why is this happening". Use when deep analytical thinking is required.
---

# Reasoning

## Reasoning Methods
Select the appropriate method based on the problem:

### Deductive Reasoning (Top-Down)
- Start with a general principle or known truth
- Apply it to a specific case to reach a conclusion
- Best for: Applying rules, validating against standards, checking invariants

### Inductive Reasoning (Bottom-Up)
- Observe specific examples or patterns
- Derive a general rule or principle from them
- Best for: Discovering patterns, learning from codebase exploration

### Abductive Reasoning (Best Explanation)
- Observe an outcome or symptom
- Infer the most likely cause
- Best for: Debugging, troubleshooting, root cause analysis

### Analogical Reasoning
- Map a known solution from one domain to a similar problem in another
- Best for: Applying patterns from one part of the codebase to another

## Reasoning Process
1. **Define the problem** clearly and precisely
2. **Gather evidence**: Read relevant files, check logs, run tests
3. **Form hypotheses**: Generate multiple possible explanations
4. **Test hypotheses**: Eliminate by checking evidence
5. **Conclude**: State the most likely answer with confidence level
6. **Verify**: If possible, validate the conclusion with a test

## Output Format
- **Problem Statement**: One sentence
- **Evidence Collected**: What was observed
- **Hypotheses**: Ranked by likelihood with supporting/contradicting evidence
- **Conclusion**: The most likely explanation
- **Confidence**: High/Medium/Low with rationale
- **Next Steps**: Verification or action items
