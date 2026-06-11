---
name: error-analysis
description: Use for analyzing errors, crashes, test failures, and unexpected behavior. Triggered by "debug this error", "why did this fail", "analyze this crash", "fix this error". Use when encountering any error or failure that needs root cause analysis.
---

# Error Analysis

## Analysis Process

### 1. Capture the Error
- Record the exact error message, stack trace, and line numbers
- Note the environment (OS, Node version, etc.)
- Identify what action triggered the error

### 2. Classify the Error
- **Syntax Error**: Typo, missing bracket, incorrect import
- **Runtime Error**: Null reference, type mismatch, undefined variable
- **Logic Error**: Correct syntax but wrong behavior
- **Configuration Error**: Missing env vars, wrong settings, broken config
- **Dependency Error**: Missing package, version mismatch, broken install
- **Environment Error**: OS-specific, permission issues, path problems

### 3. Root Cause Analysis (5 Whys)
Start from the error and ask "why" repeatedly until reaching the root cause:
1. Why did the error occur? → [immediate cause]
2. Why did that condition exist? → [underlying condition]
3. Why wasn't it caught earlier? → [testing/validation gap]
4. Why was that gap present? → [process/tooling gap]
5. Why wasn't the process fixed? → [root cause]

### 4. Solution Design
- **Immediate fix**: Stop the error from occurring now
- **Preventive fix**: Ensure this class of error cannot happen again
- **Detection**: Add tests, lint rules, or checks to catch similar errors early

### 5. Verification
- Reproduce the original error (confirm it exists)
- Apply the fix
- Verify the error no longer occurs
- Check that the fix doesn't break other functionality
- Add a regression test if applicable

## Documentation
For significant errors, document in `.opencode/knowledge/troubleshooting/known-issues.md`:
- Error signature
- Root cause
- Solution
- Prevention added
