const fs = require("fs");
const path = require("path");
const FILE = path.join(__dirname, "..", "apps", "frontend", "src", "pages", "super-admin", "SubscriptionCenter.tsx");
const c = fs.readFileSync(FILE, "utf-8");
const lines = c.split(/\r?\n/);
let count = 0;
for (let i = 0; i < lines.length; i++) {
  if (/toast\.\w+/.test(lines[i]) && /[\u0600-\u06FF]/.test(lines[i])) {
    count++;
    console.log("L" + i + ": " + lines[i].trim().slice(0, 100));
  }
}
console.log("\nRemaining: " + count);