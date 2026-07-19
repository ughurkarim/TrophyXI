import { expect, test } from "@playwright/test";

test("Free Selection keeps the full manager archive searchable and locks on Continue", async ({
  page,
}) => {
  await page.goto("/play");
  await page.getByRole("button", { name: /free selection/i }).click();
  await expect(page).toHaveURL(/\/play$/);
  await page
    .getByRole("button", { name: "CONFIRM FREE SELECTION" })
    .click();
  await page.getByRole("button", { name: /choose neutral/i }).click();

  const search = page.getByPlaceholder(
    "Search name, nation, team, year, or style",
  );
  await expect(search).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) >= 1200) {
    expect(
      await page.evaluate(
        () =>
          (document.scrollingElement?.scrollHeight ?? 0) <=
          window.innerHeight,
      ),
    ).toBe(true);
  }
  const managerChoices = page.getByRole("button", {
    name: /^choose .*era fit/i,
  });
  const fullManagerCount = await managerChoices.count();
  expect(fullManagerCount).toBeGreaterThan(3);
  await search.fill("Lionel Scaloni");
  await expect(managerChoices).toHaveCount(1);
  const scaloniChoice = page.getByRole("button", {
    name: /choose lionel scaloni/i,
  });
  await scaloniChoice.click();
  await expect(scaloniChoice).toHaveAttribute("aria-pressed", "true");
  await search.clear();

  const alternateManager = managerChoices
    .filter({ hasNot: page.getByText("Lionel Scaloni") })
    .first();
  await alternateManager.click();
  await expect(alternateManager).toHaveAttribute("aria-pressed", "true");
  await scaloniChoice.click();
  await page.getByRole("button", { name: "CONFIRM MANAGER" }).click();
  await expect(
    page.getByRole("heading", { name: "Pick your system." }),
  ).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) >= 1200) {
    expect(
      await page.evaluate(
        () =>
          (document.scrollingElement?.scrollHeight ?? 0) <=
          window.innerHeight,
      ),
    ).toBe(true);
  }
  await expect(
    page.getByRole("button", {
      name: /^choose .*formation, manager fit/i,
    }),
  ).toHaveCount(12);

  await page.goBack();
  await expect(
    page.getByRole("heading", { name: /pick your manager/i }),
  ).toBeVisible();
  const lockedChoice = page.getByRole("button", {
    name: /choose lionel scaloni/i,
  });
  await expect(lockedChoice).toHaveAttribute("aria-pressed", "true");
  const lockedAlternate = page
    .getByRole("button", { name: /^choose .*era fit/i })
    .filter({ hasNot: page.getByText("Lionel Scaloni") })
    .first();
  await expect(lockedAlternate).toBeDisabled();
  await expect(lockedChoice).toHaveAttribute("aria-pressed", "true");

  await page.goForward();
  await page
    .getByRole("button", { name: /^choose .*formation, manager fit/i })
    .first()
    .click();
  await page.getByRole("button", { name: "CONTINUE TO SQUAD" }).click();
  await expect(page).toHaveURL(/\/play\/free-selection$/);
  if ((page.viewportSize()?.width ?? 0) >= 1200) {
    const workspace = await page.evaluate(() => {
      const main = document.querySelector("main");
      const pitch = document.querySelector(".pitch");
      const archive = document.querySelector(
        'section[aria-labelledby="archive-title"]',
      );
      return {
        documentHeight: document.scrollingElement?.scrollHeight ?? 0,
        viewportHeight: window.innerHeight,
        mainBottom: main?.getBoundingClientRect().bottom ?? Infinity,
        pitchHeight: pitch?.getBoundingClientRect().height ?? Infinity,
        archiveOverflow: archive
          ? getComputedStyle(archive).overflowY
          : "missing",
      };
    });
    expect(workspace.documentHeight).toBeLessThanOrEqual(
      workspace.viewportHeight + 1,
    );
    expect(workspace.mainBottom).toBeLessThanOrEqual(
      workspace.viewportHeight + 1,
    );
    expect(workspace.pitchHeight).toBeLessThanOrEqual(480);
    expect(["auto", "scroll"]).toContain(workspace.archiveOverflow);
  }
});

test("World Cup Run enters the standard draft after formation selection", async ({
  page,
}) => {
  await page.goto("/play");
  await page.getByRole("button", { name: /world cup run/i }).click();
  await expect(page).toHaveURL(/\/play$/);
  await page
    .getByRole("button", { name: "CONFIRM WORLD CUP RUN" })
    .click();
  await page.getByRole("button", { name: /choose neutral/i }).click();
  await expect(
    page.getByRole("heading", { name: /choose your manager/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^choose /i }).first().click();
  await page.getByRole("button", { name: /continue with/i }).click();
  await page.locator(".formation-card").first().click();
  await page.getByRole("button", { name: "ENTER DRAFT →" }).click();
  await expect(page).toHaveURL(/\/play\/draft$/);
});
