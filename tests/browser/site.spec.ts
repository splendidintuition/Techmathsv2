import { test, expect, type Page } from "@playwright/test";

const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page) ?? [], "No uncaught browser exceptions").toEqual([]);
});

test.describe("cursor enhancement", () => {
  test("is hidden until real mouse input and never survives a scroll", async ({ page, isMobile }) => {
    test.skip(isMobile, "Touch devices must not get a custom cursor.");
    await page.goto("/");
    const cursor = page.locator(".tm-cursor");
    await expect(cursor).toHaveCount(1);
    await expect(cursor).toHaveCSS("opacity", "0");
    await expect(cursor).toHaveAttribute("aria-hidden", "true");

    await page.mouse.move(400, 300);
    await expect(cursor).toHaveCSS("opacity", "1");
    await page.getByRole("link", { name: "Request a quote", exact: true }).first().hover();
    await expect(cursor).toHaveClass(/is-hover/);

    await page.evaluate(() => window.scrollTo({ top: 180, behavior: "instant" }));
    await expect(cursor).toHaveCSS("opacity", "0");
    await expect(cursor).not.toHaveClass(/is-hover/);

    await page.mouse.move(420, 320);
    await expect(cursor).toHaveCSS("opacity", "1");
    await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointerout", { relatedTarget: null })));
    await expect(cursor).toHaveCSS("opacity", "0");
  });

  test("is absent for touch and reduced motion", async ({ page, isMobile }) => {
    if (!isMobile) await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.mouse.move(200, 200);
    await expect(page.locator(".tm-cursor")).toHaveCount(0);
  });
});

test("mobile navigation and keyboard search open and close", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    const menu = page.getByRole("navigation", { name: "Mobile", exact: true });
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "Coverage", exact: false }).click();
    await expect(page).toHaveURL(/\/coverage$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("wherever you build");
  } else {
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
});

test("admin console redirects unauthenticated visitors to sign-in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login\?next=(?:%2F|\/)admin$/i);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("coverage map, country details and quote deep link work", async ({ page }) => {
  await page.goto("/coverage");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("wherever you build");
  await page.getByRole("button", { name: "Americas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "United States", exact: true }).first()).toBeVisible();
  await page.goto("/coverage/portugal");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Data center engineering in Portugal.");
  await page.getByRole("link", { name: "Request engineers in Portugal", exact: true }).click();
  await expect(page).toHaveURL(/\/contact\?country=Portugal$/);
  await page.getByRole("button", { name: /Rack & Stack/i }).click();
  await expect(page.getByRole("button", { name: /Rack & Stack/i })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Country", { exact: false })).toHaveValue("Portugal");
});

test("quote form completes and shows the returned reference", async ({ page }) => {
  let payload: Record<string, unknown> | undefined;
  await page.route("**/api/leads", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, reference: "TM-TEST-0001", message: "Thanks — your request is with the delivery desk." }),
    });
  });
  await page.goto("/contact?service=rack-and-stack&country=Portugal");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Country", { exact: false })).toHaveValue("Portugal");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Racks", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Name", { exact: false }).fill("Browser Test");
  await page.getByLabel(/Work email/i).fill("browser-test@example.com");
  await page.getByRole("checkbox", { name: /I agree to Tech Maths processing/i }).check();
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await expect(page.getByText("TM-TEST-0001", { exact: false })).toBeVisible();
  expect(payload).toMatchObject({ services: ["rack-and-stack"], country: "Portugal", racks: 2, consentPrivacy: true });
});

test("storage failure is visible and never acknowledges a sent request", async ({ page }) => {
  await page.route("**/api/leads", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ ok: false, message: "The quote desk is temporarily unavailable. Your request has not been sent." }),
  }));
  await page.goto("/contact?service=rack-and-stack&country=Portugal");
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Name", { exact: false }).fill("Browser Test");
  await page.getByLabel(/Work email/i).fill("browser-test@example.com");
  await page.getByRole("checkbox", { name: /I agree to Tech Maths processing/i }).check();
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "quote desk" })).toContainText("Your request has not been sent");
  await expect(page.getByText("TM-", { exact: false })).toHaveCount(0);
});

test("repeated query parameters do not crash the quote form", async ({ page }) => {
  await page.goto("/contact?country=Portugal&country=Spain&service=rack-and-stack&service=structured-cabling");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tell us what needs building.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("Select at least one service.", { exact: true })).toBeVisible();
});

for (const path of ["/", "/contact", "/coverage", "/coverage/portugal"]) {
  test(`${path} has no horizontal overflow or missing images`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
    const brokenImages = await page.locator("img").evaluateAll((images) => images.filter((image) => !(image as HTMLImageElement).complete || (image as HTMLImageElement).naturalWidth === 0).length);
    expect(brokenImages).toBe(0);
  });
}
