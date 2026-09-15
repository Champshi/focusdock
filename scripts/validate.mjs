import { readFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const required = ["index.html", "styles.css", "app.js", "sw.js", "favicon.svg", "manifest.webmanifest", ".nojekyll"];

for (const file of required) await access(resolve(dist, file));

const [html, app, worker, manifestText] = await Promise.all([
  readFile(resolve(dist, "index.html"), "utf8"),
  readFile(resolve(dist, "app.js"), "utf8"),
  readFile(resolve(dist, "sw.js"), "utf8"),
  readFile(resolve(dist, "manifest.webmanifest"), "utf8")
]);

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) throw new Error(`Duplicate HTML IDs: ${[...new Set(duplicates)].join(", ")}`);

const selectorIds = [...app.matchAll(/querySelector\("#([A-Za-z0-9_-]+)"\)/g)].map((match) => match[1]);
const missingSelectors = [...new Set(selectorIds.filter((id) => !ids.includes(id)))];
if (missingSelectors.length) throw new Error(`JavaScript selectors missing from HTML: ${missingSelectors.join(", ")}`);

const localRefs = [...html.matchAll(/(?:href|src)="\.\/([^"]+)"/g)].map((match) => match[1]);
for (const reference of localRefs) await access(resolve(dist, reference));

const manifest = JSON.parse(manifestText);
if (manifest.start_url !== "./" || manifest.display !== "standalone") throw new Error("Unexpected web manifest settings");

for (const asset of ["./", "./index.html", "./styles.css", "./app.js", "./favicon.svg", "./manifest.webmanifest"]) {
  if (!worker.includes(`"${asset}"`)) throw new Error(`Service worker does not cache ${asset}`);
}

for (const expected of ["taskDialog", "encouragementDialog", "moduleBarChart", "moduleDonut", "rewardGrid", "dailyNote"]) {
  if (!ids.includes(expected)) throw new Error(`Required interface element is missing: ${expected}`);
}

console.log(`FocusDock validation passed: ${required.length} assets, ${ids.length} unique IDs, ${new Set(selectorIds).size} wired selectors.`);
