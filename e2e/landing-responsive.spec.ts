import { expect, test } from "@playwright/test";

test("landing sections remain readable, focusable, and overflow-safe", async ({
  page,
}) => {
  await page.goto("/");

  const pageOverflow = async () =>
    page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

  const hero = page.getByTestId("hero-showcase");
  await expect(hero).toContainText("SIX TOURNAMENTS · TWENTY YEARS");
  await expect(hero).toContainText("2026 → 2006");

  const stepsSection = page.locator("#how-it-works");
  await stepsSection.scrollIntoViewIfNeeded();
  await expect(
    stepsSection.getByText(
      "Choose the era, appoint your manager, draft your starting XI and three substitutes, then challenge a World Cup champion.",
    ),
  ).toHaveCount(0);
  const stepsHeading = stepsSection.getByRole("heading", {
    name: "Fourteen players. One match.",
  });
  await expect(stepsHeading).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) === 1440) {
    const headingLines = await stepsHeading.evaluate((heading) => {
      const range = document.createRange();
      range.selectNodeContents(heading);
      return range.getClientRects().length;
    });
    expect(headingLines).toBe(1);
  }
  const stepCards = stepsSection.getByRole("article");
  await expect(stepCards).toHaveCount(4);
  await expect(
    stepsSection.getByRole("heading", { name: "SET THE STAGE" }),
  ).toBeVisible();
  await expect(
    stepsSection.getByRole("heading", { name: "CHOOSE THE MIND" }),
  ).toBeVisible();
  await expect(
    stepsSection.getByRole("heading", { name: "BUILD YOUR XI" }),
  ).toBeVisible();
  await expect(
    stepsSection.getByRole("heading", { name: "CHALLENGE HISTORY" }),
  ).toBeVisible();
  await stepCards.first().focus();
  await expect(stepCards.first()).toBeFocused();
  await expect(stepCards.first()).toHaveCSS("overflow", "hidden");
  await page.keyboard.press("Tab");
  await expect(stepCards.nth(1)).toBeFocused();
  await expect
    .poll(() =>
      stepCards
        .nth(1)
        .evaluate((card) => getComputedStyle(card, "::before").opacity),
    )
    .toBe("1");

  const pointerCard = stepCards.nth(1);
  const pointerBounds = await pointerCard.boundingBox();
  expect(pointerBounds).not.toBeNull();
  await page.mouse.move(
    pointerBounds!.x + pointerBounds!.width * 0.25,
    pointerBounds!.y + pointerBounds!.height * 0.4,
  );
  await expect(pointerCard).toHaveAttribute("data-glow-active", "true");
  const firstGlowPosition = await pointerCard.evaluate((card) => ({
    x: (card as HTMLElement).style.getPropertyValue("--step-glow-x"),
    y: (card as HTMLElement).style.getPropertyValue("--step-glow-y"),
  }));
  await page.mouse.move(
    pointerBounds!.x + pointerBounds!.width * 0.75,
    pointerBounds!.y + pointerBounds!.height * 0.65,
  );
  const secondGlowPosition = await pointerCard.evaluate((card) => ({
    x: (card as HTMLElement).style.getPropertyValue("--step-glow-x"),
    y: (card as HTMLElement).style.getPropertyValue("--step-glow-y"),
  }));
  expect(secondGlowPosition).not.toEqual(firstGlowPosition);
  await page.mouse.move(
    pointerBounds!.x + pointerBounds!.width + 20,
    pointerBounds!.y,
  );
  await expect(pointerCard).toHaveAttribute("data-glow-active", "false");
  await pointerCard.dispatchEvent("pointermove", {
    pointerType: "touch",
    clientX: pointerBounds!.x + 30,
    clientY: pointerBounds!.y + 30,
  });
  await expect(pointerCard).toHaveAttribute("data-glow-active", "false");

  const championsSection = page.locator("#champions");
  await championsSection.scrollIntoViewIfNeeded();
  const championCards = championsSection.getByRole("article");
  await expect(championCards).toHaveCount(14);
  await expect(championCards.first()).toContainText("ARG 🇦🇷");
  await expect(championCards.first()).toContainText("Argentina");
  await expect(championCards.first()).toContainText("2022");
  await expect(championCards.first()).toContainText(
    "Recovered from an opening defeat to become world champions.",
  );
  await expect(championCards.last()).toContainText(
    "Won every match and permanently claimed the Jules Rimet Trophy.",
  );
  await championCards.first().focus();
  await expect(championCards.first()).toBeFocused();

  const finalCta = page.getByRole("region", {
    name: "BUILD THE TEAM THAT COULD BEAT THEM ALL.",
  });
  await finalCta.scrollIntoViewIfNeeded();
  await expect(
    finalCta.getByText(
      "Draft fourteen tournament versions, shape them into one balanced squad, and take on the champions who defined World Cup history.",
    ),
  ).toBeVisible();
  const primary = finalCta.getByRole("link", { name: "BUILD MY XI" });
  const secondary = finalCta.getByRole("link", {
    name: "VIEW THE CHAMPIONS",
  });
  await expect(primary).toHaveAttribute("href", "/play");
  await expect(secondary).toHaveAttribute("href", "/#champions");
  await primary.focus();
  await expect(primary).toBeFocused();

  const markers = finalCta.getByRole("button");
  await expect(markers).toHaveCount(14);
  await expect(markers.first()).toHaveAccessibleName(
    "Argentina 2022, Collective recovery",
  );
  await markers.first().focus();
  await expect(markers.first()).toBeFocused();
  await expect(markers.first().locator("i")).toBeVisible();

  const overflow = await pageOverflow();
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.viewport + 1);
});

test("reduced motion swaps directly from 2026 to 2006", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const hero = page.getByTestId("hero-showcase");
  const scene = page.getByTestId("hero-scroll-scene");
  await expect(hero).toHaveAttribute("data-active-year", "2026");
  const reducedMotionCard = page.locator("#how-it-works article").first();
  await reducedMotionCard.scrollIntoViewIfNeeded();
  const reducedMotionBounds = await reducedMotionCard.boundingBox();
  expect(reducedMotionBounds).not.toBeNull();
  await page.mouse.move(
    reducedMotionBounds!.x + reducedMotionBounds!.width / 2,
    reducedMotionBounds!.y + reducedMotionBounds!.height / 2,
  );
  await expect(reducedMotionCard).toHaveAttribute(
    "data-glow-active",
    "false",
  );
  await expect
    .poll(() =>
      reducedMotionCard.evaluate(
        (card) => getComputedStyle(card, "::before").opacity,
      ),
    )
    .toBe("1");

  const metrics = await scene.evaluate((element) => ({
    top: (element as HTMLElement).offsetTop,
    range: (element as HTMLElement).offsetHeight - window.innerHeight,
  }));
  expect(metrics.range).toBeGreaterThan(0);
  await page.evaluate(
    ({ top, range }) =>
      window.scrollTo({
        top: top + range * 0.75,
        left: 0,
        behavior: "instant",
      }),
    metrics,
  );
  await expect(hero).toHaveAttribute("data-active-year", "2006");
  await expect(
    hero.locator('[data-card-id="lionel-messi-2006"]'),
  ).toBeVisible();
  await expect(
    hero.locator('[data-card-id="cristiano-ronaldo-2006"]'),
  ).toBeVisible();
});
