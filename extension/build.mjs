// Builds the Chrome extension into extension/dist, ready for chrome://extensions > Load unpacked.
// Run with `npm run ext:build`. Uses Vite (already a dev dependency) to bundle each entry into one
// classic script: content scripts cannot be ES modules, and MV3 forbids remote code.

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));
const dist = `${here}dist`;

const ENTRIES = [
  { name: "content", file: "src/content.ts" },
  { name: "popup", file: "src/popup.ts" },
];

const ICONS = [16, 32, 48, 128];

await rm(dist, { recursive: true, force: true });
await mkdir(`${dist}/icons`, { recursive: true });

for (const entry of ENTRIES) {
  await build({
    configFile: false,
    root: here,
    logLevel: "warn",
    // Nothing from the Next.js app's public/ folder belongs in the extension.
    publicDir: false,
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    build: {
      outDir: dist,
      emptyOutDir: false,
      copyPublicDir: false,
      // Readable output, so anyone loading it unpacked can see exactly what it does.
      minify: false,
      sourcemap: false,
      target: "chrome116",
      lib: {
        entry: `${here}${entry.file}`,
        formats: ["iife"],
        name: `justThisBit_${entry.name}`,
        fileName: () => `${entry.name}.js`,
      },
    },
  });
}

const manifest = JSON.parse(await readFile(`${here}manifest.json`, "utf8"));
await writeFile(`${dist}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
await cp(`${here}popup.html`, `${dist}/popup.html`);
for (const size of ICONS) {
  await cp(`${here}icons/icon-${size}.png`, `${dist}/icons/icon-${size}.png`);
}

console.log(`Extension built: ${dist}`);
