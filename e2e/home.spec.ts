import { expect, test } from "@playwright/test";

test("home page shows the site name and tagline", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Just This Bit");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Just This Bit");
  await expect(page.getByText("Share just the part that matters.")).toBeVisible();
});

test("responses carry the security headers from SPEC 7", async ({ request }) => {
  const res = await request.get("/");
  expect(res.status()).toBe(200);
  const headers = res.headers();
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
});

test("no horizontal scroll on the home page", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
