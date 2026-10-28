// One-off icon export. Run with `npm run icons` after changing app/icon.svg, then commit the output.
//
// Renders app/icon.svg with Playwright's Chromium (already a dev dependency) into:
//   public/icon-192.png, public/icon-512.png      manifest icons ("any")
//   public/icon-maskable-512.png                  manifest icon ("maskable"), mark shrunk into the safe zone
//   public/apple-touch-icon.png                   180px, iOS home screen
//   app/favicon.ico                               16, 32 and 48px for old browsers and tabs

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("..", import.meta.url));
const BASE = "#080808";

// Maskable icons get cropped to as little as a circle 80% of the icon wide. At this scale the
// corners of the brackets sit inside that circle with room to spare.
const MASKABLE_SCALE = 0.78;

const svg = await readFile(`${root}app/icon.svg`, "utf8");
const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function render(size, scale = 1) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * scale);
  await page.setContent(
    `<html><body style="margin:0;background:${BASE};display:grid;place-items:center;width:${size}px;height:${size}px">` +
      `<img src="${dataUrl}" width="${inner}" height="${inner}" style="display:block"></body></html>`,
  );
  await page.locator("img").evaluate((img) => img.decode());
  return page.screenshot({ clip: { x: 0, y: 0, width: size, height: size } });
}

/** Raw RGBA pixels of the icon at `size`, drawn on a canvas. */
async function pixels(size) {
  const rgba = await page.evaluate(
    async ({ src, size }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, size, size);
      return Array.from(ctx.getImageData(0, 0, size, size).data);
    },
    { src: dataUrl, size },
  );
  return Buffer.from(rgba);
}

/** A 32-bit BMP image as stored inside an .ico: bottom-up BGRA rows, then an empty AND mask. */
function icoBitmap(size, rgba) {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8); // .ico bitmaps count the AND mask in the height.
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  const xor = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const from = (y * size + x) * 4;
      const to = ((size - 1 - y) * size + x) * 4;
      xor[to] = rgba[from + 2];
      xor[to + 1] = rgba[from + 1];
      xor[to + 2] = rgba[from];
      xor[to + 3] = rgba[from + 3];
    }
  }
  const and = Buffer.alloc(Math.ceil(size / 32) * 4 * size);
  return Buffer.concat([header, xor, and]);
}

/** An .ico file with one 32-bit bitmap per size. */
function toIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const outputs = [
  ["public/icon-192.png", await render(192)],
  ["public/icon-512.png", await render(512)],
  ["public/icon-maskable-512.png", await render(512, MASKABLE_SCALE)],
  ["public/apple-touch-icon.png", await render(180)],
];

const ico = toIco(
  await Promise.all([16, 32, 48].map(async (size) => ({ size, data: icoBitmap(size, await pixels(size)) }))),
);
outputs.push(["app/favicon.ico", ico]);

await browser.close();

for (const [path, data] of outputs) {
  await writeFile(`${root}${path}`, data);
  console.log(`wrote ${path} (${data.length} bytes)`);
}
