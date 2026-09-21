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
  "app/landing.css",
  "app/checkin-qr.css",
];

const allowedWeights = new Set(["400", "500", "600", "700", "800"]);
const canonicalTokenTargets = new Set([
  "app/system-ui.css",
  "app/polish.css",
  "app/form-density.css",
  "app/native-admin.css",
]);

// Existing legacy debt is budgeted so CI prevents regression while cleanup can
// move these values downward over time.
const legacyBudgets = {
  "app/system-ui.css": { tinyType: 140, hardcodedHex: 468, important: 354 },
  "app/globals.css": { tinyType: 132, hardcodedHex: 410, important: 17 },
  "app/native-admin.css": { tinyType: 57, hardcodedHex: 416, important: 77 },
  "app/polish.css": { tinyType: 17, hardcodedHex: 86, important: 83 },
  "app/form-density.css": { tinyType: 0, hardcodedHex: 0, important: 1 },
  "app/landing.css": { tinyType: 0, hardcodedHex: 87, important: 7 },
  "app/checkin-qr.css": { tinyType: 5, hardcodedHex: 26, important: 0 },
};

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

function countTinyRemDeclarations(content) {
  let count = 0;
  for (const match of content.matchAll(/font-size\s*:\s*([0-9.]+)rem/gi)) {
    if (Number(match[1]) < 0.625) count += 1;
  }
  return count;
}

function countHardcodedHex(content) {
  return [...content.matchAll(/#(?:[0-9a-fA-F]{3,8})\b/g)].length;
}

function countImportant(content) {
  return [...content.matchAll(/!important/g)].length;
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
        `${file}:${lineOf(content, match.index)} select uses 16px/1rem typography; use the shared mobile exception rather than a local override`,
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

  const budget = legacyBudgets[file];
  if (budget) {
    const tinyType = countTinyRemDeclarations(content);
    const hardcodedHex = countHardcodedHex(content);
    const important = countImportant(content);

    if (tinyType > budget.tinyType) {
      fatal.push(
        `${file}: tiny typography debt increased from budget ${budget.tinyType} to ${tinyType}`,
      );
    } else if (tinyType > 0) {
      warnings.push(
        `${file}: ${tinyType} legacy font-size declarations remain below 0.625rem (budget ${budget.tinyType})`,
      );
    }

    if (hardcodedHex > budget.hardcodedHex) {
      fatal.push(
        `${file}: hard-coded color debt increased from budget ${budget.hardcodedHex} to ${hardcodedHex}`,
      );
    } else if (hardcodedHex > 0) {
      warnings.push(
        `${file}: ${hardcodedHex} hard-coded hex colors remain (budget ${budget.hardcodedHex})`,
      );
    }

    if (important > budget.important) {
      fatal.push(
        `${file}: !important debt increased from budget ${budget.important} to ${important}`,
      );
    } else if (important > 0) {
      warnings.push(
        `${file}: ${important} !important declarations remain (budget ${budget.important})`,
      );
    }
  }

  let rawControlHeightCount = 0;
  let sub44TouchCount = 0;
  for (const match of content.matchAll(
    /([^{}]*(?:button|input|select|textarea|action|btn|tab|link|close|refresh)[^{}]*)\{([^{}]*)\}/gi,
  )) {
    const body = match[2];
    if (/min-height\s*:\s*(?:36|40|44)px/i.test(body)) {
      rawControlHeightCount += 1;
    }

    for (const height of body.matchAll(/(?:min-height|height)\s*:\s*([0-9.]+)px/gi)) {
      const value = Number(height[1]);
      if (value >= 24 && value < 44) {
        sub44TouchCount += 1;
        break;
      }
    }
  }

  if (rawControlHeightCount) {
    warnings.push(
      `${file}: ${rawControlHeightCount} interactive control rules still use raw 36/40/44px heights; prefer --rr-control-sm/md/lg tokens`,
    );
  }
  if (sub44TouchCount) {
    warnings.push(
      `${file}: ${sub44TouchCount} interactive rules declare a 24-43px height; verify touch overrides keep coarse-pointer targets at least 44px`,
    );
  }
}

const uiFiles = roots
  .flatMap(walk)
  .filter((file) => /\.(tsx|jsx)$/.test(file));

let inlineTinyTypeCount = 0;
let nativeDialogCount = 0;

for (const file of uiFiles) {
  const content = fs.readFileSync(path.join(ROOT, file), "utf8");

  for (const match of content.matchAll(/fontWeight\s*:\s*(?:"(\d{3})"|'(\d{3})'|(\d{3}))/g)) {
    const value = match[1] || match[2] || match[3];
    if (!allowedWeights.has(value)) {
      fatal.push(`${file}:${lineOf(content, match.index)} non-standard inline fontWeight ${value}`);
    }
  }

  for (const match of content.matchAll(
    /<select[\s\S]{0,600}?style=\{\{[\s\S]{0,400}?fontSize\s*:\s*["'](?:16px|1rem)["']/g,
  )) {
    fatal.push(
      `${file}:${lineOf(content, match.index)} inline select typography is oversized`,
    );
  }

  for (const match of content.matchAll(/fontSize\s*:\s*["']([0-9.]+)rem["']/g)) {
    if (Number(match[1]) < 0.625) inlineTinyTypeCount += 1;
  }

  nativeDialogCount += [...content.matchAll(/window\.(?:confirm|prompt|alert)\(/g)].length;
}

if (inlineTinyTypeCount) {
  warnings.push(
    `TSX: ${inlineTinyTypeCount} inline fontSize declarations remain below 0.625rem; move active cases toward shared typography tokens`,
  );
}

if (nativeDialogCount) {
  fatal.push(
    `TSX: ${nativeDialogCount} native browser dialogs remain; use the shared accessible action-dialog provider`,
  );
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

console.log(
  "UI guardrails passed: no typography, color, specificity, or control debt regression detected.",
);
