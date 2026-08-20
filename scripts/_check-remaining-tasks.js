const fs = require("fs");
const path = require("path");
const FILE = path.join(__dirname, "..", "apps", "frontend", "src", "pages", "tasks", "Tasks.tsx");
const c = fs.readFileSync(FILE, "utf-8");
const lines = c.split(/\r?\n/);
console.log("Remaining toast calls with Arabic:");
for (let i = 0; i < lines.length; i++) {
  if (/toast\.\w+/i.test(lines[i]) && /[\u0600-\u06FF]/.test(lines[i])) {
    console.log("  L" + i + ": " + lines[i].trim().slice(0, 120));
  }
}
