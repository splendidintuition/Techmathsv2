import { test, expect } from "@playwright/test";
import axe from "axe-core";

for (const path of ["/", "/contact", "/coverage", "/coverage/portugal"]) {
  for (const theme of ["dark", "light"]) {
    test(`${path} passes browser accessibility checks in ${theme} mode`, async ({ page, isMobile }) => {
      // Cover the design-system checkpoints: 360 px mobile and 1440 px desktop.
      if (isMobile) await page.setViewportSize({ width: 360, height: 800 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript((value) => {
        localStorage.setItem("tm-theme", value);
        localStorage.setItem("tm-motion", "off");
      }, theme);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.addScriptTag({ content: axe.source });
      const violations = await page.evaluate(async () => {
        const result = await (window as unknown as { axe: typeof axe }).axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
        });
        return result.violations.map((violation) => ({
          id: violation.id,
          nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
        }));
      });
      expect(violations).toEqual([]);
    });
  }
}
