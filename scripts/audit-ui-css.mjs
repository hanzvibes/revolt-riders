import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const roots = ["app", "components"];
const cssTargets = [
  "app/system-ui.css",
  "app/globals.css",
  "app/native-admin.css",
  "app/polish.css",
  "app/form-density.css",
];

const allowedWeights = new Set(["400", "500", "600", "700", "800"]);
const canonicalTokenTargets = new Set([
  "app/system-ui.css",
  "app/polish.css",
  "app/form-density.css",
  "app/native-admin.css",
]);
const legacyTokenPattern = /var\(--(?:red|line|ink|muted|bg|surface)\)/g;
const fatal = [];
const warnings = [];

function walk(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(rel);
    return [rel];
  });
}

function lineOf(content, index) {
  return content.slice(0, index).split("\n").length;
}

for (const file of cssTargets) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) continue;
  const content = fs.readFileSync(abs, "utf8");

  for (const match of content.matchAll(/font-weight\s*:\s*(\d{3})/g)) {
    const value = match[1];
    if (!allowedWeights.has(value)) {
      fatal.push(`${file}:${lineOf(content, match.index)} non-standard font-weight ${value}`);
    }
  }

  for (const match of content.matchAll(/([^{}]*select[^{}]*)\{([^{}]*)\}/gi)) {
    const body = match[2];
    if (/font-size\s*:\s*(?:16px|1rem)(?:\s*!important)?/i.test(body)) {
      fatal.push(
        `${file}:${lineOf(content, match.index)} select uses 16px/1rem typography; use 0.8125rem unless there is a documented exception`,
      );
    }
  }

  if (canonicalTokenTargets.has(file)) {
    for (const match of content.matchAll(legacyTokenPattern)) {
      fatal.push(
        `${file}:${lineOf(content, match.index)} legacy design-token alias ${match[0]}; use the canonical --rr-* token`,
      );
    }
  }

  let rawControlHeightCount = 0;
  for (const match of content.matchAll(/([^{}]*(?:button|input|select|textarea|action)[^{}]*)\{([^{}]*)\}/gi)) {
    if (/min-height\s*:\s*(?:36|40|44)px/i.test(match[2])) {
      rawControlHeightCount += 1;
    }
  }
  if (rawControlHeightCount) {
    warnings.push(
      `${file}: ${rawControlHeightCount} interactive control rules still use raw 36/40/44px heights; prefer --rr-control-sm/md/lg tokens`,
    );
  }
}

const uiFiles = roots
  .flatMap(walk)
  .filter((file) => /\.(tsx|jsx)$/.test(file));

for (const file of uiFiles) {
  const content = fs.readFileSync(path.join(ROOT, file), "utf8");

  for (const match of content.matchAll(/fontWeight\s*:\s*(?:"(\d{3})"|'(\d{3})'|(\d{3}))/g)) {
    const value = match[1] || match[2] || match[3];
    if (!allowedWeights.has(value)) {
      fatal.push(`${file}:${lineOf(content, match.index)} non-standard inline fontWeight ${value}`);
    }
  }

  for (const match of content.matchAll(/<select[\s\S]{0,600}?style=\{\{[\s\S]{0,400}?fontSize\s*:\s*["'](?:16px|1rem)["']/g)) {
    fatal.push(
      `${file}:${lineOf(content, match.index)} inline select typography is oversized`,
    );
  }
}

console.log("Revolt Riders UI audit");
console.log(`Checked ${cssTargets.length} CSS layers and ${uiFiles.length} UI files.\n`);

if (warnings.length) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
  console.log("");
}

if (fatal.length) {
  console.error("UI audit failed:");
  for (const issue of fatal) console.error(`- ${issue}`);
  process.exit(1);
}

console.log("UI audit passed: typography/control guardrails are clean.");
