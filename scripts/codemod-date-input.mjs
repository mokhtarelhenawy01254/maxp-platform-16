#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const FRONTEND_SRC = path.join(ROOT, 'apps', 'frontend', 'src');
const DATE_INPUT_TARGET = path.join(FRONTEND_SRC, 'components', 'ui', 'DateInput.tsx');

const isApply = process.argv.includes('--apply');

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === 'dist' ||
        entry.name === 'build'
      ) {
        continue;
      }
      walkDir(fullPath, fileList);
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      // Exclude DateInput component itself to avoid modifying the hidden native picker
      if (path.resolve(fullPath) === path.resolve(DATE_INPUT_TARGET)) {
        continue;
      }
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const inputDateRegex = /<input\b([^>]*?\btype=["']date["'][^>]*?)(\/?>|>)/gi;

function getLineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

function transformTag(tagContent, fullTag) {
  // Extract attributes
  let valueAttr = '';
  const valMatch = tagContent.match(/\bvalue=(\{[^}]+\}|"[^"]*"|'[^']*')/);
  if (valMatch) {
    valueAttr = valMatch[1];
  }

  let onChangeAttr = '';
  const onChangeMatch = tagContent.match(/\bonChange=\{([\s\S]*?)\}(?=\s+[a-zA-Z]|\s*\/?>|\s*$)/);
  if (onChangeMatch) {
    const rawHandler = onChangeMatch[1].trim();
    // Check if it's (e) => setX(e.target.value) or e => setX(e.target.value)
    const arrowMatch = rawHandler.match(/^\(?\s*(\w+)\s*\)?\s*=>\s*(\w+)\(\s*\1\.target\.value\s*\)$/);
    if (arrowMatch) {
      onChangeAttr = `{${arrowMatch[2]}}`;
    } else {
      onChangeAttr = `{${rawHandler}}`;
    }
  }

  const otherAttrs = [];
  // className
  const classMatch = tagContent.match(/\bclassName=(\{[^}]+\}|"[^"]*"|'[^']*')/);
  if (classMatch) otherAttrs.push(`className=${classMatch[1]}`);

  // min
  const minMatch = tagContent.match(/\bmin=(\{[^}]+\}|"[^"]*"|'[^']*')/);
  if (minMatch) otherAttrs.push(`min=${minMatch[1]}`);

  // max
  const maxMatch = tagContent.match(/\bmax=(\{[^}]+\}|"[^"]*"|'[^']*')/);
  if (maxMatch) otherAttrs.push(`max=${maxMatch[1]}`);

  // placeholder
  const placeholderMatch = tagContent.match(/\bplaceholder=(\{[^}]+\}|"[^"]*"|'[^']*')/);
  if (placeholderMatch) otherAttrs.push(`placeholder=${placeholderMatch[1]}`);

  // id
  const idMatch = tagContent.match(/\bid=(\{[^}]+\}|"[^"]*"|'[^']*')/);
  if (idMatch) otherAttrs.push(`id=${idMatch[1]}`);

  // name
  const nameMatch = tagContent.match(/\bname=(\{[^}]+\}|"[^"]*"|'[^']*')/);
  if (nameMatch) otherAttrs.push(`name=${nameMatch[1]}`);

  // boolean attributes: disabled, required
  if (/\bdisabled\b/.test(tagContent)) {
    const disabledValMatch = tagContent.match(/\bdisabled=(\{[^}]+\}|"[^"]*")/);
    otherAttrs.push(disabledValMatch ? `disabled=${disabledValMatch[1]}` : 'disabled');
  }
  if (/\brequired\b/.test(tagContent)) {
    const requiredValMatch = tagContent.match(/\brequired=(\{[^}]+\}|"[^"]*")/);
    otherAttrs.push(requiredValMatch ? `required=${requiredValMatch[1]}` : 'required');
  }

  const parts = ['<DateInput'];
  if (valueAttr) parts.push(`value=${valueAttr}`);
  if (onChangeAttr) parts.push(`onChange=${onChangeAttr}`);
  if (otherAttrs.length > 0) parts.push(...otherAttrs);
  parts.push('/>');

  return parts.join(' ');
}

function computeRelativeImport(fromFilePath, targetPath) {
  let rel = path.relative(path.dirname(fromFilePath), targetPath).replace(/\\/g, '/');
  rel = rel.replace(/\.tsx?$/, '');
  if (!rel.startsWith('.')) {
    rel = './' + rel;
  }
  return rel;
}

function processFiles() {
  const files = walkDir(FRONTEND_SRC);
  let totalFilesWithDateInput = 0;
  let totalDateFields = 0;
  const findings = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = [...content.matchAll(inputDateRegex)];

    if (matches.length > 0) {
      totalFilesWithDateInput++;
      totalDateFields += matches.length;

      const relPath = path.relative(ROOT, filePath).replace(/\\/g, '/');
      const lines = matches.map((m) => getLineNumber(content, m.index));
      findings.push({
        filePath,
        relPath,
        count: matches.length,
        lines,
      });

      if (isApply) {
        let newContent = content.replace(inputDateRegex, (match, attrs) => {
          return transformTag(attrs, match);
        });

        // Add import if DateInput is not yet imported
        if (!/\bDateInput\b/.test(content)) {
          const importPath = computeRelativeImport(filePath, DATE_INPUT_TARGET);
          const importStmt = `import { DateInput } from '${importPath}';\n`;
          // Place after last import
          const lastImportIdx = newContent.lastIndexOf('import ');
          if (lastImportIdx !== -1) {
            const endOfLine = newContent.indexOf('\n', lastImportIdx);
            newContent =
              newContent.slice(0, endOfLine + 1) +
              importStmt +
              newContent.slice(endOfLine + 1);
          } else {
            newContent = importStmt + newContent;
          }
        }

        fs.writeFileSync(filePath, newContent, 'utf8');
      }
    }
  }

  console.log('====================================================');
  console.log(`[codemod-date-input] ${isApply ? 'وضع التطبيق الفعلي (--apply)' : 'وضع الفحص التقديري (Dry-run)'}`);
  console.log('====================================================');
  console.log(`المسار المفحوص: ${path.relative(ROOT, FRONTEND_SRC).replace(/\\/g, '/')}`);
  console.log(`إجمالي الملفات التي تحتوي على <input type="date">: ${totalFilesWithDateInput}`);
  console.log(`إجمالي حقول التاريخ المتبقية: ${totalDateFields}`);
  console.log('----------------------------------------------------');

  for (const item of findings) {
    console.log(`• ${item.relPath} (عدد الحقول: ${item.count}) [السطور: ${item.lines.join(', ')}]`);
  }
  console.log('====================================================');
  if (!isApply) {
    console.log('ملاحظة: هذا تقرير فحص تجريبي فقط (Dry-run). لم يتم تعديل أي ملف.');
  } else {
    console.log('تم تطبيق التعديلات بنجاح.');
  }
}

processFiles();
