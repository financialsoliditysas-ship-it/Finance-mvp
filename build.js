const fs = require("fs");
const path = require("path");

const source = path.join(__dirname, "finance-mvp");
const target = path.join(__dirname, "dist");

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });

for (const file of fs.readdirSync(source)) {
  fs.copyFileSync(path.join(source, file), path.join(target, file));
}

console.log("Static MVP build written to dist");
