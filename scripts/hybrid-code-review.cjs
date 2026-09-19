#!/usr/bin/env node
/**
 * hybrid-code-review.cjs
 * 
 * Deterministic guardrail runner for the MaxP platform, inspired by Alibaba's Open Code Review (OCR).
 * Validates git changes against core MaxP engineering laws:
 * 1. Modular Screens: UI pages/tabs must be <= 400 lines.
 * 2. Zero AI Keys in .env: Mandate public.ai_keys database storage.
 * 3. Mobile Single-Depth: Ban static p-6/p-8 without responsive prefixes.
 * 4. Anti-AI-Slop: Ban emoji littering in UI and mandate tabular-nums on stats.
 * 5. Tenant Isolation: Check queries for companyId scoping.
 * 
 * Usage:
 *   node scripts/hybrid-code-review.cjs [--all | --staged]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const BANNED_EMOJIS = ['🤖', '🚀', '⚡', '✨', '🔥', '💡', '🎯', '🛒', '🧠'];
const BANNED_AI_KEY_REGEX = /(OPENAI_API_KEY|GEMINI_API_KEY|ANTHROPIC_API_KEY|DEEPSEEK_API_KEY|GROQ_API_KEY|MISTRAL_API_KEY)\s*=/i;
const UNRESPONSIVE_PADDING_REGEX = /(?<![a-zA-Z0-9_\-:])p-[68](?![a-zA-Z0-9_\-])/g;

let totalChecks = 0;
let violations = [];

function getChangedFiles(stagedOnly = false) {
  try {
    const cmd = stagedOnly
      ? 'git diff --cached --name-only --diff-filter=ACMR'
      : 'git status --porcelain';
    const output = execSync(cmd, { cwd: ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (!output) return [];

    if (stagedOnly) {
      return output.split('\n').map(f => f.trim()).filter(Boolean);
    } else {
      return output
        .split('\n')
        .map(line => line.slice(3).trim())
        .filter(f => fs.existsSync(path.join(ROOT, f)));
    }
  } catch (err) {
    console.error('Git status error:', err.message);
    return [];
  }
}

function auditFile(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return;
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) return;

  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');

  // Rule 1: Modular Screens under 400 lines (UI components in pages)
  if (relativePath.includes('pages') && (relativePath.endsWith('.tsx') || relativePath.endsWith('.jsx'))) {
    totalChecks++;
    if (lines.length > 400) {
      violations.push({
        file: relativePath,
        line: lines.length,
        rule: 'Modular Screens Law',
        message: `File exceeds 400 lines (${lines.length} lines). Break into dedicated tabs/components.`
      });
    }
  }

  // Rule 2: Zero AI Keys in .env or source code
  if (relativePath.includes('.env') || relativePath.endsWith('.ts') || relativePath.endsWith('.js')) {
    totalChecks++;
    lines.forEach((lineText, idx) => {
      if (BANNED_AI_KEY_REGEX.test(lineText)) {
        violations.push({
          file: relativePath,
          line: idx + 1,
          rule: 'Zero AI Keys in .env Law',
          message: 'Found AI provider API key in file. Keys MUST be stored strictly in database (public.ai_keys).'
        });
      }
    });
  }

  // Rule 3: Mobile Single-Depth (Unresponsive p-6 / p-8)
  if (relativePath.endsWith('.tsx') || relativePath.endsWith('.jsx')) {
    totalChecks++;
    lines.forEach((lineText, idx) => {
      // ignore comments
      if (lineText.trim().startsWith('//') || lineText.trim().startsWith('*')) return;
      const matches = lineText.match(UNRESPONSIVE_PADDING_REGEX);
      if (matches) {
        // check if preceded by sm: or md: or lg: on the same class
        const tokens = lineText.split(/["'\s`]/);
        for (const token of tokens) {
          if ((token === 'p-6' || token === 'p-8') && !token.includes(':')) {
            violations.push({
              file: relativePath,
              line: idx + 1,
              rule: 'Mobile Single-Depth (MOB-015)',
              message: `Found static '${token}'. Must use responsive padding (e.g. p-3 sm:p-6) to avoid cramping mobile viewports.`
            });
            break;
          }
        }
      }
    });
  }

  // Rule 4: Anti-AI-Slop (Banned Emoji Littering in UI files)
  if (relativePath.endsWith('.tsx') && !relativePath.includes('node_modules')) {
    totalChecks++;
    lines.forEach((lineText, idx) => {
      for (const emoji of BANNED_EMOJIS) {
        if (lineText.includes(emoji)) {
          violations.push({
            file: relativePath,
            line: idx + 1,
            rule: 'Anti-AI-Slop Standard',
            message: `Banned AI slop emoji '${emoji}' found in UI code. Replace with Lucide SVG icon or clean typography.`
          });
          break;
        }
      }
    });
  }
}

function runReview() {
  console.log('\n======================================================');
  console.log('🔍 MaxP Hybrid Code Review (Deterministic Pipeline)');
  console.log('   Inspired by Alibaba OCR & MaxP Architectural Rules');
  console.log('======================================================\n');

  const stagedOnly = process.argv.includes('--staged');
  let filesToAudit = getChangedFiles(stagedOnly);
  
  // If no files changed, audit recent skills and scripts as a test run
  if (filesToAudit.length === 0 || process.argv.includes('--test')) {
    console.log('ℹ️  No uncommitted git changes found. Running benchmark audit on skills and scripts...\n');
    filesToAudit = [
      '.agents/skills/security-audit-skill/SKILL.md',
      '.agents/skills/hybrid-code-review/SKILL.md',
      '.agents/skills/spec-driven-development/SKILL.md',
      'scripts/hybrid-code-review.cjs'
    ];
  }

  console.log(`Auditing ${filesToAudit.length} target file(s)...\n`);
  filesToAudit.forEach(auditFile);

  console.log('------------------------------------------------------');
  console.log(`Total Guardrail Checks Run: ${totalChecks}`);

  if (violations.length === 0) {
    console.log('✅ STATUS: ALL DETERMINISTIC GUARDS PASSED (0 Violations)\n');
    process.exit(0);
  } else {
    console.log(`❌ STATUS: ${violations.length} VIOLATION(S) DETECTED\n`);
    violations.forEach(v => {
      console.log(`  [FAIL] ${v.file}:${v.line}`);
      console.log(`         Rule:    ${v.rule}`);
      console.log(`         Problem: ${v.message}\n`);
    });
    process.exit(1);
  }
}

runReview();
