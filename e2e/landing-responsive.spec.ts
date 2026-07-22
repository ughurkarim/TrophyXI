import { expect, test } from "@playwright/test";

test("landing sections remain readable, focusable, and overflow-safe", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByText(
      "Draft tournament-specific legends, build a balanced XI, and test it against every World Cup champion since 1970.",
    ),
  ).toBeAttached();
  await expect(page.locator(".site-header .header-cta")).toHaveText(
    "START DRAFT",
  );
  await expect(page.locator(".hero__proof")).toContainText(
    "719 TOURNAMENT CARDS",
  );
  await expect(page.locator(".hero__proof")).toContainText(
    "15 WORLD CUP CHAMPIONS",
  );
  await expect(page.locator(".hero__proof")).toContainText(
    "DETERMINISTIC MATCH ENGINE",
  );

  const heroButtons = page.locator(".hero__actions a");
  await expect(heroButtons).toHaveCount(2);
  await expect(heroButtons.nth(0).locator(".lucide-arrow-right")).toHaveCount(1);
  await expect(heroButtons.nth(1).locator(".lucide-arrow-right")).toHaveCount(1);
  const primaryBeforeHover = await heroButtons.first().boundingBox();
  await heroButtons.first().hover();
  const primaryAfterHover = await heroButtons.first().boundingBox();
  expect(primaryAfterHover).toEqual(primaryBeforeHover);

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
  const championCards = championsSection.locator(
    '[data-testid="champion-mobile-gallery"] article',
  );
  await expect(championCards).toHaveCount(15);
  await expect(championCards.first()).toContainText("🇪🇸ESP");
  await expect(championCards.first()).toContainText("Spain");
  await expect(championCards.first()).toContainText("2026");
  await expect(championCards.first()).toContainText("WORLD CHAMPION");
  await expect(championCards.first()).toContainText("Lamine Yamal");
  await expect(championCards.last()).toContainText(
    "Pelé completed his third triumph as Brazil won every match and permanently claimed the Jules Rimet Trophy.",
  );
  await expect(championCards.first()).not.toHaveAttribute("tabindex");
  await expect(championsSection.getByText("Playable", { exact: true })).toHaveCount(0);
  await expect(championCards.first().locator("img")).toHaveAttribute(
    "src",
    /\/assets\/winners\/2026\.jpeg\?v=.+$/,
  );

  if ((page.viewportSize()?.width ?? 0) > 900) {
    const championScene = page.getByTestId("champion-scroll-scene");
    await expect(championScene).toHaveAttribute("data-active-year", "2026");
    const yearControls = championsSection.getByRole("navigation", {
      name: "Champion years",
    }).getByRole("button");
    await expect(yearControls).toHaveCount(15);
    await yearControls.nth(1).focus();
    await page.keyboard.press("Enter");
    await expect(championScene).toHaveAttribute("data-active-year", "2022");
    await expect(
      championsSection.getByRole("article", {
        name: "Argentina 2022 world champion showcase",
      }),
    ).toContainText("Lionel Messi");
    await expect(
      championsSection.getByRole("img", {
        name: "Lionel Messi celebrates Argentina’s 2022 World Cup victory",
      }),
    ).toHaveAttribute("src", /\/assets\/winners\/2022\.webp\?v=.+$/);
  } else {
    await expect(championCards.nth(1).getByRole("img")).toHaveAttribute(
      "src",
      /\/assets\/winners\/2022\.webp\?v=.+$/,
    );
  }

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
  await expect(markers).toHaveCount(15);
  await expect(markers.first()).toHaveAccessibleName(
    "Spain 2026, Relentless control",
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
