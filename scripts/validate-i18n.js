const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(__dirname, "../apps/frontend/src/locales");

let exitCode = 0;

function collectJsonSectionNames(dir) {
  // Returns section names as merge-translations.js derives them:
  // the deepest path component without .json extension, so files like
  // "admin/aiHub.json" map to section "aiHub" (the same top-level key that
  // "aiHub.json" produces) and "subscription.json" maps to "subscription".
  const names = new Set();
  if (!fs.existsSync(dir)) return names;
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".json")) {
        const rel = path.relative(dir, full).replace(/\\/g, "/");
        const parts = rel.replace(/\.json$/, "").split("/");
        names.add(parts[parts.length - 1]);
      }
    }
  };
  walk(dir);
  return names;
}

function checkLang(lang) {
  const sectionsDir = path.join(LOCALES_DIR, lang, "sections");
  const translationPath = path.join(LOCALES_DIR, lang, "translation.json");

  if (!fs.existsSync(sectionsDir)) {
    console.log(`[${lang}] No sections/ directory`);
    return;
  }
  if (!fs.existsSync(translationPath)) {
    console.log(`[${lang}] No translation.json`);
    return;
  }

  const sectionNames = collectJsonSectionNames(sectionsDir);

  const translation = JSON.parse(fs.readFileSync(translationPath, "utf8"));
  const translationKeys = Object.keys(translation);

  const missingSections = [...sectionNames].filter(
    (s) => !translationKeys.includes(s)
  );
  const extraSections = translationKeys.filter(
    (k) => !sectionNames.has(k)
  );

  if (missingSections.length > 0) {
    console.log(
      `[${lang}] Sections without translation.json key: ${missingSections.join(
        ", "
      )}`
    );
  }

  if (extraSections.length > 0) {
    console.log(
      `[${lang}] Keys in translation.json without section file: ${extraSections.join(
        ", "
      )}`
    );
    exitCode = 1;
  }

  console.log(
    `[${lang}] ✓ ${sectionNames.size} section files (recursed), ${translationKeys.length} top-level keys in translation.json`
  );
}

checkLang("en");
checkLang("ar");

if (exitCode !== 0) {
  console.log(
    "\n❌ i18n validation failed: translation.json has keys not backed by a section file."
  );
}

process.exit(exitCode);
