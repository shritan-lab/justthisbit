import { expect, test } from "@playwright/test";
import { titleTag } from "./support/fixtures";

const ID = "dQw4w9WgXcQ";

const BROKEN = [
  ["bad id", "/c/not-an-id/90-132"],
  ["id too short", "/c/dQw4w9WgXc/90-132"],
  ["end before start", `/c/${ID}/132-90`],
  ["zero length", `/c/${ID}/90-90`],
  ["over 3600 seconds", `/c/${ID}/0-3601`],
  ["range is not numbers", `/c/${ID}/abc`],
  ["negative start", `/c/${ID}/-5-10`],
  ["missing range", `/c/${ID}`],
  ["bare /c", "/c"],
  ["extra segment", `/c/${ID}/90-132/extra`],
  ["note over 140 characters", `/c/${ID}/90-132?n=${"a".repeat(141)}`],
] as const;

for (const [name, path] of BROKEN) {
  test(`broken link (${name}) answers 404 with the friendly page`, async ({ request }) => {
    const res = await request.get(path);
    expect(res.status()).toBe(404);
    const html = await res.text();
    // Rendered on the server, so it shows even before JavaScript runs.
    expect(html).toMatch(/<h1[^>]*>This clip link looks broken<\/h1>/);
    expect(titleTag(html)).toBe("This clip link looks broken");
    expect(html).toMatch(/<meta name="robots" content="noindex"\/>/);
  });
}

test("broken link page shows a way to make a clip", async ({ page }) => {
  const res = await page.goto(`/c/${ID}/132-90`);
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This clip link looks broken");
  await expect(page.getByRole("link", { name: "Make a clip" })).toHaveAttribute("href", "/");
  await expect(page).toHaveTitle("This clip link looks broken");
});

test("valid boundaries are not broken", async ({ request }) => {
  for (const path of [`/c/${ID}/0-1`, `/c/${ID}/0-3600`, `/c/${ID}/90-132?n=${"a".repeat(140)}`]) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
});
