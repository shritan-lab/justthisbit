import { expect, test } from "@playwright/test";

// SPEC 6.1: installable web app with a share target, icons and a service worker that caches nothing.

/** Width and height from a PNG's IHDR chunk. */
function pngSize(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

type Manifest = {
  id: string;
  name: string;
  short_name: string;
  start_url: string;
  display: string;
  background_color: string;
  theme_color: string;
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
  share_target: unknown;
};

test("the manifest is linked from the page and matches SPEC 6.1", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBe("/manifest.webmanifest");

  const res = await request.get(href!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/manifest+json");
  const manifest = (await res.json()) as Manifest;

  expect(manifest).toMatchObject({
    name: "Just This Bit",
    short_name: "Just This Bit",
    start_url: "/",
    display: "standalone",
    background_color: "#080808",
    theme_color: "#080808",
  });
  expect(manifest.share_target).toEqual({
    action: "/share",
    method: "GET",
    params: { title: "title", text: "text", url: "url" },
  });
  expect(manifest.icons.map((i) => `${i.sizes} ${i.purpose}`)).toEqual(["192x192 any", "512x512 any", "512x512 maskable"]);
});

test("every manifest icon loads as a PNG of the stated size", async ({ request }) => {
  const manifest = (await (await request.get("/manifest.webmanifest")).json()) as Manifest;
  for (const icon of manifest.icons) {
    const res = await request.get(icon.src);
    expect(res.status(), icon.src).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
    const { width, height } = pngSize(await res.body());
    expect(`${width}x${height}`, icon.src).toBe(icon.sizes);
  }
});

test("apple touch icon, favicon and SVG icon are linked and load", async ({ page, request }) => {
  await page.goto("/");
  const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
  expect(apple).toBe("/apple-touch-icon.png");
  const appleRes = await request.get(apple!);
  expect(appleRes.status()).toBe(200);
  expect(pngSize(await appleRes.body())).toEqual({ width: 180, height: 180 });

  const icons = await page.locator('link[rel="icon"]').evaluateAll((links) =>
    links.map((l) => ({ href: l.getAttribute("href")!, type: l.getAttribute("type") })),
  );
  expect(icons.some((i) => i.href.startsWith("/favicon.ico"))).toBe(true);
  expect(icons.some((i) => i.type === "image/svg+xml")).toBe(true);
  for (const { href } of icons) {
    const res = await request.get(href);
    expect(res.status(), href).toBe(200);
  }
});

test("the service worker registers, controls the site and has no fetch handler", async ({ page, request }) => {
  await page.goto("/");
  const registration = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return { scope: reg.scope, script: reg.active?.scriptURL ?? null };
  });
  expect(new URL(registration.scope).pathname).toBe("/");
  expect(new URL(registration.script!).pathname).toBe("/sw.js");

  const res = await request.get("/sw.js");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("javascript");
  expect(res.headers()["cache-control"]).toContain("no-store");
  const source = await res.text();
  expect(source).not.toMatch(/addEventListener\(\s*["']fetch["']/);
  expect(source).not.toMatch(/caches\./);
});
