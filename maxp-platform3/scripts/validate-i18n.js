const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(__dirname, "../apps/frontend/src/locales");

let exitCode = 0;

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

  const sectionFiles = fs
    .readdirSync(sectionsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.basename(f, ".json"));

  const translation = JSON.parse(fs.readFileSync(translationPath, "utf8"));
  const translationKeys = Object.keys(translation);

  const missingSections = sectionFiles.filter(
    (s) => !translationKeys.includes(s)
  );
  const extraSections = translationKeys.filter(
    (k) => !sectionFiles.includes(k)
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
    `[${lang}] ✓ ${sectionFiles.length} section files, ${translationKeys.length} top-level keys in translation.json`
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
