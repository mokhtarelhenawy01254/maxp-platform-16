const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "apps", "frontend", "src");

function isArabic(text) { return /[\u0600-\u06FF]/.test(text); }

// Fix Arabic key names in section files + source files
const FIXES = [
  { sec: "settings/affiliates", ns: "affiliates" },
  { sec: "tasks/tasks", ns: "tasks" },
];

for (const { sec, ns } of FIXES) {
  const enSec = path.join(SRC, "locales", "en", "sections", sec + ".json");
  const arSec = path.join(SRC, "locales", "ar", "sections", sec + ".json");
  
  if (!fs.existsSync(enSec)) { console.log("SKIP " + sec); continue; }
  
  let enKeys = JSON.parse(fs.readFileSync(enSec, "utf-8"));
  let arKeys = JSON.parse(fs.readFileSync(arSec, "utf-8"));
  
  const keyMap = {};
  const newEn = {};
  const newAr = {};
  let renamed = 0;

  for (const key of Object.keys(enKeys)) {
    if (isArabic(key)) {
      const hash = crypto.createHash("md5").update(key + sec).digest("hex").slice(0, 4);
      const newKey = "msg_" + hash;
      keyMap[key] = newKey;
      newEn[newKey] = enKeys[key];
      newAr[newKey] = arKeys[key];
      renamed++;
    } else {
      newEn[key] = enKeys[key];
      newAr[key] = arKeys[key];
    }
  }

  if (renamed > 0) {
    fs.writeFileSync(enSec, JSON.stringify(newEn, null, 2), "utf-8");
    fs.writeFileSync(arSec, JSON.stringify(newAr, null, 2), "utf-8");
    
    // Fix source files that reference these keys
    const srcFiles = [];
    function findSrc(dir) {
      if (!fs.existsSync(dir)) return;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const fp = path.join(dir, e.name);
        if (e.isDirectory() && !["node_modules", "locales"].includes(e.name)) findSrc(fp);
        else if (/\.(tsx?|jsx?)$/.test(e.name)) {
          let c = fs.readFileSync(fp, "utf-8");
          let ch = false;
          for (const [oldKey, newKey] of Object.entries(keyMap)) {
            const oldRef = ns + "." + oldKey;
            const newRef = ns + "." + newKey;
            if (c.includes('"' + oldRef + '"') || c.includes("'" + oldRef + "'")) {
              c = c.split('"' + oldRef + '"').join('"' + newRef + '"');
              c = c.split("'" + oldRef + "'").join("'" + newRef + "'");
              ch = true;
            }
          }
          if (ch) {
            fs.writeFileSync(fp, c, "utf-8");
            srcFiles.push(path.relative(SRC, fp));
          }
        }
      }
    }
    findSrc(SRC);
    console.log(sec + ": " + renamed + " Arabic keys renamed, " + srcFiles.length + " source files updated");
    for (const f of srcFiles) console.log("  " + f);
  }
}

// Also create missing section files
const MISSING = [
  { sec: "admin/aiPlayground", keys: { promptPlaceholder: "Ask anything...", send: "Send", sending: "Sending...", stop: "Stop", reply: "Reply", copied: "Copied!", emptyReply: "No reply received", receivingReply: "Receiving reply..." } },
  { sec: "utils/errorHandler", keys: { network: "Network error", authentication: "Authentication error", rate_limit: "Rate limit exceeded", timeout: "Request timed out", validation: "Validation error", fetch_failed: "Failed to fetch data", timeout_error: "Request timeout", generic: "Something went wrong" } },
];

for (const { sec, keys } of MISSING) {
  const enSec = path.join(SRC, "locales", "en", "sections", sec + ".json");
  const arSec = path.join(SRC, "locales", "ar", "sections", sec + ".json");
  [path.dirname(enSec), path.dirname(arSec)].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
  if (!fs.existsSync(enSec)) {
    fs.writeFileSync(enSec, JSON.stringify(keys, null, 2), "utf-8");
    fs.writeFileSync(arSec, JSON.stringify(keys, null, 2), "utf-8");
    console.log("\nCreated: " + sec + " (" + Object.keys(keys).length + " keys)");
  }
}

console.log("\nDone!");
