import { expect, test } from "@playwright/test";

for (const path of ["/credits", "/attribution"]) {
  test(`${path} remains removed`, async ({ page }) => {
    const response = await page.goto(path);

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("link", { name: /credits|attribution/i })).toHaveCount(
      0,
    );
  });
}
