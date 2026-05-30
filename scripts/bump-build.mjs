/* Increments BUILD_NUMBER in src/version.ts. Runs as part of `npm run build`. */
import { readFileSync, writeFileSync } from "node:fs";

const path = new URL("../src/version.ts", import.meta.url);
const src = readFileSync(path, "utf8");

const match = src.match(/BUILD_NUMBER = (\d+)/);
if (!match) {
  console.error("bump-build: BUILD_NUMBER not found in src/version.ts");
  process.exit(1);
}

const next = parseInt(match[1], 10) + 1;
writeFileSync(path, src.replace(/BUILD_NUMBER = \d+/, `BUILD_NUMBER = ${next}`));
console.log(`bump-build: build number -> 0.${next}`);
