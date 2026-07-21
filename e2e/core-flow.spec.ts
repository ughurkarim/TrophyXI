import { expect, test } from "@playwright/test";

test("completes the player-first World Cup gauntlet with separate respins", async ({
  page,
}) => {
  test.setTimeout(90_000);

  const captureState = async (
    filename: string,
    options: {
      focusDraftChoices?: boolean;
      focusSelector?: string;
    } = {},
  ) => {
    await page.evaluate(({ focusDraftChoices, focusSelector }) => {
      const choices = document.querySelector<HTMLElement>(".draft-choices");
      const statusbar = document.querySelector<HTMLElement>(".draft-statusbar");
      const requestedFocus = focusSelector
        ? document.querySelector<HTMLElement>(focusSelector)
        : null;
      const focusChoices =
        focusDraftChoices && window.innerWidth <= 900 && choices;
      const focusTarget = requestedFocus ?? focusChoices;
      const stickyOffset =
        window.innerWidth <= 700 ? (statusbar?.offsetHeight ?? 0) + 8 : 0;
      const top = focusTarget
        ? focusTarget.getBoundingClientRect().top +
          window.scrollY -
          stickyOffset
        : 0;
      window.scrollTo({
        top: Math.max(0, top),
        left: 0,
        behavior: "instant",
      });
    }, options);
    const overflow = await page.evaluate(() => {
      const viewport = document.documentElement.clientWidth;
      return {
        viewport,
        scrollWidth: document.documentElement.scrollWidth,
        offenders: [...document.querySelectorAll<HTMLElement>("body *")]
          .filter((element) => {
            const bounds = element.getBoundingClientRect();
            return bounds.right > viewport + 1 || bounds.left < -1;
          })
          .slice(0, 8)
          .map((element) => ({
            className: element.className,
            left: element.getBoundingClientRect().left,
            right: element.getBoundingClientRect().right,
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
          })),
      };
    });
    expect(
      overflow.scrollWidth,
      JSON.stringify(overflow.offenders),
    ).toBeLessThanOrEqual(overflow.viewport + 1);
    await page.screenshot({
      path: test.info().outputPath(filename),
      animations: "disabled",
      fullPage: false,
    });
  };

  const playerChoices = () =>
    page.getByRole("button", {
      name: /select .* for placement, rated/i,
    });

  const selectFirstPlayer = async () => {
    await page.locator(".draft-card-grid").evaluate((element) => {
      element.scrollTo({ left: 0, behavior: "instant" });
    });
    const firstChoice = playerChoices().first();
    await expect(firstChoice).toBeVisible();
    await firstChoice.click();
  };

  const placeSelectedPlayer = async () => {
    const validPositions = page.locator(
      '.draft-pitch-panel .pitch-node[aria-disabled="false"]',
    );
    await expect(validPositions.first()).toBeVisible();
    await validPositions.first().click();
  };

  await page.goto("/");
  await captureState("01-landing.png");
  await expect(page.locator(".hero-card h3")).toHaveText([
    "Lionel Messi",
    "Cristiano Ronaldo",
  ]);
  await expect(page.locator(".champion-country strong").first()).toContainText(
    "ARG 🇦🇷",
  );
  await expect(page.locator(".champion-country h3").first()).toHaveText(
    "Argentina",
  );
  await expect(
    page.locator('.site-header a[href="/database"]').first(),
  ).toHaveAttribute("href", "/database");
  await expect(page.locator(".site-header")).toHaveCSS("position", "fixed");
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollbarWidth,
    ),
  ).toBe("none");

  const showcase = page.getByTestId("hero-showcase");
  await expect(showcase).toHaveAttribute("data-active-year", "2026");
  const scene = page.getByTestId("hero-scroll-scene");
  const scrollMetrics = await scene.evaluate((element) => {
    const sceneElement = element as HTMLElement;
    return {
      top: sceneElement.offsetTop,
      range: sceneElement.offsetHeight - window.innerHeight,
    };
  });
  for (const [index, year] of [
    2026, 2022, 2018, 2014, 2010, 2006,
  ].entries()) {
    await page.evaluate(
      ({ top, range, index }) => {
        const progress = index === 0 ? 0 : (index + 0.05) / 6;
        window.scrollTo({
          top: top + range * progress,
          left: 0,
          behavior: "instant",
        });
      },
      { ...scrollMetrics, index },
    );
    await expect(showcase).toHaveAttribute(
      "data-active-year",
      String(year),
    );
    await expect(
      showcase.locator(`[data-card-id="lionel-messi-${year}"]`),
    ).toBeVisible();
    await expect(
      showcase.locator(`[data-card-id="cristiano-ronaldo-${year}"]`),
    ).toBeVisible();
    await expect(showcase.locator(".hero-background-year")).toHaveText(
      String(year),
    );
    await expect(page.locator(".site-header")).toBeVisible();
  }
  await page.locator("#how-it-works").scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("heading", { name: "Fourteen players. One match." }),
  ).toBeVisible();

  await page.goto("/database");
  await expect(
    page.getByRole("heading", { name: "Player Database" }),
  ).toBeVisible();
  await captureState("00-database.png");
  const databaseScroll = await page.locator(".database-grid").evaluate(
    (grid) => ({
      overflowY: window.getComputedStyle(grid).overflowY,
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
    }),
  );
  expect(databaseScroll.overflowY).toBe("visible");
  expect(databaseScroll.documentHeight).toBeGreaterThan(
    databaseScroll.viewportHeight,
  );
  await page.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    }),
  );
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.evaluate(() =>
    window.scrollTo({ top: 0, behavior: "instant" }),
  );
  await expect(page.getByText("719", { exact: true }).first()).toBeVisible();
  const databaseSearch = page.getByPlaceholder("Search player or nation");
  await databaseSearch.fill("Bastian Schweinsteiger");
  const longNameCard = page.getByRole("button", {
    name: /view bastian schweinsteiger/i,
  }).first();
  await expect(longNameCard).toBeVisible();
  await expect(longNameCard.locator("h2")).toHaveAttribute(
    "title",
    "Bastian Schweinsteiger",
  );
  await databaseSearch.fill("");
  const tierFilter = page.getByLabel("Tier");
  for (const tier of [
    "legend",
    "icon",
    "elite",
    "standout",
    "reliable",
    "role-player",
    "limited",
  ]) {
    await tierFilter.selectOption(tier);
    await expect(page.locator(`.database-card--${tier}`).first()).toBeVisible();
  }
  await tierFilter.selectOption("");
  await databaseSearch.fill("Lionel Messi");
  await expect(
    page.getByRole("button", {
      name: /view lionel messi 2014, rated 96/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /view lionel messi 2022, rated 99/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /view lionel messi 2026, rated 98/i,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: /view lionel messi 2014, rated 96/i,
    })
    .click();
  const databasePlayerDialog = page.getByRole("dialog");
  await expect(databasePlayerDialog.getByText("PHOTO STATUS")).toHaveCount(0);
  await expect(databasePlayerDialog.getByText("PORTRAIT SOURCE")).toHaveCount(0);
  const databaseDialogContainment = await databasePlayerDialog.evaluate(
    (dialog) => {
      const bounds = dialog.getBoundingClientRect();
      const close = dialog
        .querySelector<HTMLElement>(".player-drawer__close")!
        .getBoundingClientRect();
      return {
        closeInside:
          close.left >= bounds.left &&
          close.right <= bounds.right &&
          close.top >= bounds.top &&
          close.bottom <= bounds.bottom,
        overflowY: window.getComputedStyle(dialog).overflowY,
        noHorizontalOverflow: dialog.scrollWidth <= dialog.clientWidth + 1,
      };
    },
  );
  expect(databaseDialogContainment.closeInside).toBe(true);
  expect(["auto", "scroll"]).toContain(databaseDialogContainment.overflowY);
  expect(databaseDialogContainment.noHorizontalOverflow).toBe(true);
  const databaseMessiFace = databasePlayerDialog.getByRole("img", {
    name: /lionel messi 2014 portrait/i,
  });
  await expect(databaseMessiFace).toBeVisible();
  await expect
    .poll(() =>
      databaseMessiFace.evaluate(
        (image) =>
          image instanceof HTMLImageElement &&
          image.complete &&
          image.naturalWidth > 0,
      ),
    )
    .toBe(true);
  const showDatabaseAccolades = databasePlayerDialog.getByRole("button", {
    name: /SHOW \d+ MORE/,
  });
  if (await showDatabaseAccolades.count()) {
    await showDatabaseAccolades.click();
  }
  await expect(databasePlayerDialog.getByText("TOP 100 PLAYER")).toBeVisible();
  await expect(
    databasePlayerDialog.getByText("Trophy XI Curated Top 100"),
  ).toHaveCount(0);
  await expect(
    databasePlayerDialog.getByText("2× WORLD CUP GOLDEN BALL"),
  ).toBeVisible();
  await expect(
    databasePlayerDialog.getByText("PLAYER TAG EFFECTS"),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "PLAY AS WORLD CUP ALL-STARS" }),
  ).toHaveCount(0);

  await page.getByRole("link", { name: /build your xi/i }).first().click();
  await expect(
    page.getByRole("heading", { name: /choose your challenge/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /classic draft/i }).click();
  await expect(page).toHaveURL(/\/play$/);
  await page
    .getByRole("button", { name: "CONFIRM CLASSIC DRAFT" })
    .click();
  await expect(
    page.getByRole("heading", { name: /choose your era/i }),
  ).toBeVisible();
  const eraLabels = await page.locator(".era-card h2").allTextContents();
  expect(eraLabels).toEqual([
    "2020s",
    "2010s",
    "2000s",
    "1990s",
    "1980s",
    "1970s",
    "Neutral / All Eras",
  ]);
  await page.getByRole("button", { name: /choose 1970s/i }).click();

  await expect(
    page.getByRole("heading", { name: /choose your manager/i }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Choose the manager whose tactics, leadership, and match decisions best fit the team you want to build.",
    ),
  ).toBeVisible();
  await expect(page.locator(".manager-card")).toHaveCount(3);
  await expect(page.getByText(/tournament versions/i)).toHaveCount(0);
  await expect(
    page.locator(".manager-card .circular-portrait"),
  ).toHaveCount(3);
  await expect(
    page.locator(".manager-card .circular-portrait[data-photo-status]"),
  ).toHaveCount(0);
  await expect(
    page.getByText("Each respin is saved and used separately."),
  ).toBeVisible();
  await expect(page.getByText("MATCH ERA · 1970s")).toBeVisible();
  await expect(page.getByText("FORMATION RESPIN ×1")).toBeVisible();
  await expect(page.getByText("PLAYER RESPINS ×2")).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) >= 1400) {
    const managerPageHeight = await page.evaluate(() => ({
      viewport: window.innerHeight,
      document: document.documentElement.scrollHeight,
      body: document.body.scrollHeight,
    }));
    expect(
      Math.max(managerPageHeight.document, managerPageHeight.body),
    ).toBeLessThanOrEqual(managerPageHeight.viewport + 1);
  }
  await captureState("01-manager-three.png");
  const originalManagerNames = await page
    .locator(".manager-card h2")
    .allTextContents();
  await page
    .getByRole("button", { name: "MANAGER RESPIN ×1" })
    .click();
  await expect(
    page.getByRole("dialog", {
      name: /replace all three manager choices/i,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: /use manager respin/i }).click();
  const replacementManagerNames = await page
    .locator(".manager-card h2")
    .allTextContents();
  expect(replacementManagerNames).toHaveLength(3);
  expect(new Set(replacementManagerNames).size).toBe(3);
  expect(
    replacementManagerNames.every(
      (name) => !originalManagerNames.includes(name),
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "MANAGER RESPIN USED" }),
  ).toBeDisabled();
  await expect(page.getByText("PLAYER RESPINS ×2")).toBeVisible();
  const managerGradeLabels = await page
    .locator(".manager-card__grades")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("aria-label") ?? ""),
    );
  expect(managerGradeLabels).toHaveLength(3);
  await expect(page.locator(".manager-card__grades > span")).toHaveCount(15);
  expect(
    managerGradeLabels.every(
      (label) =>
        /offense (?:S|[A-F][+-]?)/i.test(label) &&
        /defense (?:S|[A-F][+-]?)/i.test(label) &&
        /leadership (?:S|[A-F][+-]?)/i.test(label) &&
        /game management (?:S|[A-F][+-]?)/i.test(label) &&
        /era fit (?:S|[A-F][+-]?) \d+/i.test(label),
    ),
  ).toBe(true);
  const managerInspect = page
    .getByRole("button", { name: /view manager record/i })
    .first();
  await managerInspect.click();
  const managerDialog = page.getByRole("dialog");
  await expect(managerDialog.getByText("MANAGER RECORD")).toBeVisible();
  await expect(managerDialog.getByText("TACTICAL PROFILE")).toBeVisible();
  await expect(managerDialog.getByRole("link")).toHaveCount(0);
  await expect(managerDialog.getByText("TROPHY XI MANAGER TAGS")).toHaveCount(0);
  await expect(managerDialog.getByText("PHOTO STATUS")).toHaveCount(0);
  await expect(managerDialog.getByText(/original Trophy XI estimates/i)).toHaveCount(0);
  await expect(
    managerDialog.locator(".circular-portrait"),
  ).toBeVisible();
  await expect(
    managerDialog.locator(".circular-portrait[data-photo-status]"),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(managerInspect).toBeFocused();
  const managerName = (
    await page.locator(".manager-card h2").first().textContent()
  )!;
  await page.getByRole("button", { name: /^Choose /i }).first().click();
  await expect(page).toHaveURL(/\/play\/manager$/);
  await expect(
    page.getByRole("button", { name: "MANAGER LOCKED" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: new RegExp(`continue with ${managerName}`, "i"),
    }),
  ).toBeEnabled();
  const selectedCard = page.locator(".manager-card").first();
  await expect(selectedCard).toHaveClass(/manager-card--selected/);
  await expect(selectedCard).toHaveCSS("transform", "none");
  const selectedLabel = selectedCard.getByText("Selected", { exact: true });
  await expect(selectedLabel).toBeVisible();
  const [selectedCardBox, selectedLabelBox] = await Promise.all([
    selectedCard.boundingBox(),
    selectedLabel.boundingBox(),
  ]);
  expect(selectedCardBox).not.toBeNull();
  expect(selectedLabelBox).not.toBeNull();
  expect(selectedLabelBox!.x).toBeGreaterThanOrEqual(selectedCardBox!.x);
  expect(selectedLabelBox!.x + selectedLabelBox!.width).toBeLessThanOrEqual(
    selectedCardBox!.x + selectedCardBox!.width,
  );
  await page
    .getByRole("button", {
      name: new RegExp(`continue with ${managerName}`, "i"),
    })
    .click();

  await expect(
    page.getByRole("heading", { name: "Choose your system." }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Select the formation that best fits your manager, the match era, and the squad you want to build.",
    ),
  ).toBeVisible();
  await expect(page.locator(".formation-card")).toHaveCount(4);
  await expect(page.locator(".formation-card--selected")).toHaveCount(0);
  await expect(
    page.locator(".formation-card").getByText("Recommended"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "ENTER DRAFT →" }),
  ).toBeDisabled();
  const formationEraFits = await page
    .locator(".formation-card")
    .evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-era-fit")),
    );
  expect(new Set(formationEraFits).size).toBeGreaterThan(1);
  const formationContext = page.getByTestId("formation-context");
  await expect(formationContext.getByText("Manager")).toBeVisible();
  await expect(formationContext.getByText("Style")).toBeVisible();
  await expect(formationContext.getByText("Match Era")).toBeVisible();
  await expect(formationContext).not.toContainText("1970—1978");
  if ((page.viewportSize()?.width ?? 0) >= 1400) {
    const formationPageHeight = await page.evaluate(() => ({
      viewport: window.innerHeight,
      document: document.documentElement.scrollHeight,
      body: document.body.scrollHeight,
    }));
    expect(
      Math.max(formationPageHeight.document, formationPageHeight.body),
    ).toBeLessThanOrEqual(formationPageHeight.viewport + 1);
  }
  const originalFormations = await page
    .locator(".formation-card h3")
    .allTextContents();
  await page
    .getByRole("button", { name: "FORMATION RESPIN ×1" })
    .click();
  await expect(
    page.getByRole("dialog", {
      name: /replace all four formation choices/i,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /use formation respin/i })
    .click();
  const respunFormations = await page
    .locator(".formation-card h3")
    .allTextContents();
  expect(respunFormations).toHaveLength(4);
  expect(respunFormations).not.toEqual(originalFormations);
  expect(
    respunFormations.every((formation) => !originalFormations.includes(formation)),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "FORMATION RESPIN USED" }),
  ).toBeDisabled();
  const selectedFormationCard = page.locator(".formation-card").first();
  const selectedFormationName = await selectedFormationCard
    .locator("h3")
    .textContent();
  await selectedFormationCard.click();
  await expect(selectedFormationCard).toHaveClass(/formation-card--selected/);
  await expect(selectedFormationCard).toHaveCSS("transform", "none");
  const selectedFormationBadge = selectedFormationCard.getByText("Selected", {
    exact: true,
  });
  await expect(selectedFormationBadge).toBeVisible();
  const [formationCardBox, formationBadgeBox] = await Promise.all([
    selectedFormationCard.boundingBox(),
    selectedFormationBadge.boundingBox(),
  ]);
  expect(formationCardBox).not.toBeNull();
  expect(formationBadgeBox).not.toBeNull();
  expect(formationBadgeBox!.x).toBeGreaterThanOrEqual(formationCardBox!.x);
  expect(formationBadgeBox!.x + formationBadgeBox!.width).toBeLessThanOrEqual(
    formationCardBox!.x + formationCardBox!.width,
  );
  const selectedSystem = page.getByTestId("selected-system");
  await expect(selectedSystem).toContainText(selectedFormationName!);
  await expect(selectedSystem).toContainText("Manager Fit");
  await expect(selectedSystem).not.toContainText("Era Fit");
  await captureState("02-formation.png");
  const enterDraft = page.getByRole("button", { name: "ENTER DRAFT →" });
  await expect(enterDraft).toBeEnabled();
  expect(await enterDraft.evaluate((button) => button.scrollWidth)).toBeLessThanOrEqual(
    await enterDraft.evaluate((button) => button.clientWidth),
  );
  await enterDraft.click();
  await expect(page).toHaveURL(/\/play\/draft$/);
  await expect(page.getByText("PLAYER RESPINS ×2").first()).toBeVisible();
  await expect(page.getByText("SQUAD ARCHIVE")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "SQUAD 0 / 14" }),
  ).toBeVisible();
  const chemistryHud = page.locator(".chemistry-preview-hud");
  await expect(chemistryHud).toHaveAttribute(
    "aria-label",
    /current chemistry \d+/i,
  );
  const chemistryInfoButton = page.getByRole("button", {
    name: /chemistry information/i,
  });
  const chemistryScrollBefore = await page.evaluate(() => window.scrollY);
  const chemistryWidthBefore = await page.evaluate(
    () => document.documentElement.clientWidth,
  );
  await chemistryInfoButton.click();
  const chemistryDialog = page.getByRole("dialog", { name: "CHEMISTRY" });
  await expect(chemistryDialog).toContainText(
    "How naturally your squad works together.",
  );
  await expect(
    chemistryDialog.locator('[aria-label="Chemistry factors"] article'),
  ).toHaveCount(6);
  await expect(chemistryDialog).toContainText("0–39DISCONNECTED");
  await expect(chemistryDialog).toContainText("90–100ELITE");
  await expect(
    chemistryDialog.getByRole("button", {
      name: /close chemistry information/i,
    }),
  ).toBeFocused();
  expect(
    await page.evaluate(() => ({
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      width: document.documentElement.clientWidth,
    })),
  ).toEqual({
    overflow: "hidden",
    position: "fixed",
    width: chemistryWidthBefore,
  });
  expect(
    await chemistryDialog.locator("div").evaluateAll((elements) =>
      elements.some(
        (element) =>
          ["auto", "scroll"].includes(
            window.getComputedStyle(element).overflowY,
          ),
      ),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(chemistryDialog).toHaveCount(0);
  await expect(chemistryInfoButton).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(chemistryScrollBefore);
  expect(
    await page.evaluate(() => ({
      overflow: document.body.style.overflow,
      position: document.body.style.position,
    })),
  ).toEqual({ overflow: "", position: "" });

  await page.keyboard.press("Space");
  await expect(page.getByRole("dialog", { name: "CHEMISTRY" })).toBeVisible();
  await page.locator(".dialog-backdrop").click({ position: { x: 2, y: 2 } });
  await expect(page.getByRole("dialog", { name: "CHEMISTRY" })).toHaveCount(0);
  await expect(chemistryInfoButton).toBeFocused();

  await expect(playerChoices()).toHaveCount(5);
  await expect(
    page.locator(".draft-card-grid .circular-portrait"),
  ).toHaveCount(5);
  const initialCardBounds = await page
    .locator(".draft-card-grid .player-card")
    .evaluateAll((cards) =>
      cards.map((card) => {
        const bounds = card.getBoundingClientRect();
        return {
          left: bounds.left,
          right: bounds.right,
          top: bounds.top,
          bottom: bounds.bottom,
        };
      }),
    );
  expect(
    initialCardBounds.every((bounds, index) =>
      initialCardBounds.slice(index + 1).every(
        (other) =>
          bounds.right <= other.left + 1 ||
          other.right <= bounds.left + 1 ||
          bounds.bottom <= other.top + 1 ||
          other.bottom <= bounds.top + 1,
      ),
    ),
  ).toBe(true);
  const draftGridBounds = await page.locator(".draft-card-grid").boundingBox();
  expect(draftGridBounds).not.toBeNull();
  if ((page.viewportSize()?.width ?? 0) > 720) {
    expect(
      initialCardBounds.every(
        (bounds) =>
          bounds.left >= draftGridBounds!.x - 1 &&
          bounds.right <=
            draftGridBounds!.x + draftGridBounds!.width + 1,
      ),
    ).toBe(true);
  } else {
    const mobileRailContainment = await page
      .locator(".draft-card-grid")
      .evaluate((rail) => {
        const railBounds = rail.getBoundingClientRect();
        return {
          allCardsInRail: [...rail.children].every((card) => {
            const bounds = card.getBoundingClientRect();
            return (
              bounds.left -
                railBounds.left +
                rail.scrollLeft >=
                -1 &&
              bounds.right -
                railBounds.left +
                rail.scrollLeft <=
                rail.scrollWidth + 1
            );
          }),
          cardWidthFits: [...rail.children].every(
            (card) =>
              (card as HTMLElement).offsetWidth <= rail.clientWidth,
          ),
        };
      });
    expect(mobileRailContainment).toEqual({
      allCardsInRail: true,
      cardWidthFits: true,
    });
  }
  const circleGeometry = await page
    .locator(".draft-card-grid .circular-portrait")
    .evaluateAll((portraits) =>
      portraits.map((portrait) => {
        const bounds = portrait.getBoundingClientRect();
        return {
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
          radius: window.getComputedStyle(portrait).borderRadius,
        };
      }),
    );
  expect(
    circleGeometry.every(
      ({ width, height, radius }) => width === height && radius === "50%",
    ),
  ).toBe(true);
  const tieredOfferCards = await page
    .locator(".draft-card-grid .player-card")
    .evaluateAll((cards) =>
      cards.filter((card) =>
        [...card.classList].some((name) =>
          name.startsWith("player-card--tier-"),
        ),
      ).length,
  );
  expect(tieredOfferCards).toBe(5);
  const outfieldOfferCards = page
    .locator(".draft-card-grid .player-card")
    .filter({
      hasNot: page.locator(".player-rating span").filter({ hasText: /^GK$/ }),
    });
  expect(await outfieldOfferCards.count()).toBeGreaterThan(0);
  const selectedCandidateBoundsBefore =
    await outfieldOfferCards.first().boundingBox();
  const pitchNodeCentersBefore = await page
    .locator(".draft-pitch-panel .pitch-node")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const bounds = node.getBoundingClientRect();
        const pitchBounds = node.parentElement!.getBoundingClientRect();
        return {
          x: Math.round(
            ((bounds.left + bounds.width / 2 - pitchBounds.left) /
              pitchBounds.width) *
              1000,
          ),
          y: Math.round(
            ((bounds.top + bounds.height / 2 - pitchBounds.top) /
              pitchBounds.height) *
              1000,
          ),
        };
      }),
    );
  await outfieldOfferCards
    .first()
    .locator(".player-card__pick-target")
    .click();
  await expect(page.getByText("VIEW PLAYER TAGS")).toBeVisible();
  const selectedCardStyle = await page
    .locator(".draft-option--selected .player-card")
    .evaluate((card) => {
      const style = window.getComputedStyle(card);
      return {
        borderWidth: style.borderTopWidth,
        shadow: style.boxShadow,
        transform: style.transform,
      };
    });
  expect(selectedCardStyle.borderWidth).toBe("2px");
  expect(selectedCardStyle.shadow).not.toBe("none");
  expect(selectedCardStyle.transform).toBe("none");
  const selectedCandidateBoundsAfter = await page
    .locator(".draft-option--selected .player-card")
    .boundingBox();
  expect(selectedCandidateBoundsBefore).not.toBeNull();
  expect(selectedCandidateBoundsAfter).not.toBeNull();
  expect(Math.round(selectedCandidateBoundsAfter!.width)).toBe(
    Math.round(selectedCandidateBoundsBefore!.width),
  );
  expect(Math.round(selectedCandidateBoundsAfter!.height)).toBe(
    Math.round(selectedCandidateBoundsBefore!.height),
  );
  const pitchNodeCentersAfter = await page
    .locator(".draft-pitch-panel .pitch-node")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const bounds = node.getBoundingClientRect();
        const pitchBounds = node.parentElement!.getBoundingClientRect();
        return {
          x: Math.round(
            ((bounds.left + bounds.width / 2 - pitchBounds.left) /
              pitchBounds.width) *
              1000,
          ),
          y: Math.round(
            ((bounds.top + bounds.height / 2 - pitchBounds.top) /
              pitchBounds.height) *
              1000,
          ),
        };
      }),
    );
  expect(pitchNodeCentersAfter).toEqual(pitchNodeCentersBefore);
  const selectedBadgeGeometry = await page
    .locator(".draft-option--selected .player-card")
    .evaluate((card) => {
      const cardBounds = card.getBoundingClientRect();
      const badgeBounds = card
        .querySelector(".player-card__selected")!
        .getBoundingClientRect();
      return {
        contained:
          badgeBounds.left >= cardBounds.left &&
          badgeBounds.right <= cardBounds.right &&
          badgeBounds.top >= cardBounds.top &&
          badgeBounds.bottom <= cardBounds.bottom,
      };
    });
  expect(selectedBadgeGeometry.contained).toBe(true);
  const initiallySelectedName = await page
    .locator(".draft-option--selected h3")
    .textContent();
  await playerChoices().first().click();
  const switchedPlayerName = await page
    .locator(".draft-option--selected h3")
    .textContent();
  expect(switchedPlayerName).not.toBe(initiallySelectedName);
  await outfieldOfferCards
    .first()
    .locator(".player-card__pick-target")
    .click();
  await expect(page.locator(".draft-option--selected h3")).toHaveText(
    initiallySelectedName ?? "",
  );
  await expect(page.getByLabel("0 of 14 players drafted")).toBeVisible();
  await expect(chemistryHud).toContainText("Projected");
  await expect(chemistryHud).toContainText("Change");
  await expect(page.locator(".pitch-node--fit-green").first()).toBeVisible();
  await expect(page.locator(".pitch-node--fit-red").first()).toBeVisible();
  await expect(
    page.locator(".pitch-node--fit-incompatible").first(),
  ).toBeVisible();
  await expect(
    page.locator(".pitch-node__fit i").filter({ hasText: "−" }).first(),
  ).toBeVisible();
  await expect(page.getByText("−0%", { exact: true })).toHaveCount(0);
  const fitLabelContainment = await page
    .locator(".draft-pitch-panel .pitch-node__fit")
    .evaluateAll((labels) =>
      labels.map((label) => {
        const pitch = label.closest(".pitch")!.getBoundingClientRect();
        const bounds = label.getBoundingClientRect();
        return (
          bounds.left >= pitch.left - 1 &&
          bounds.right <= pitch.right + 1 &&
          bounds.top >= pitch.top - 1 &&
          bounds.bottom <= pitch.bottom + 1
        );
      }),
    );
  expect(fitLabelContainment.every(Boolean)).toBe(true);
  const goalkeeperGeometry = await page
    .locator('.draft-pitch-panel .pitch-node[data-slot-y="91"]')
    .evaluate((node) => {
      const pitch = node.closest(".pitch")!.getBoundingClientRect();
      const nodeBounds = node.getBoundingClientRect();
      const fitBounds = node
        .querySelector(".pitch-node__fit")!
        .getBoundingClientRect();
      return {
        nodeInside:
          nodeBounds.left >= pitch.left - 1 &&
          nodeBounds.right <= pitch.right + 1 &&
          nodeBounds.top >= pitch.top - 1 &&
          nodeBounds.bottom <= pitch.bottom + 1,
        fitInside:
          fitBounds.left >= pitch.left - 1 &&
          fitBounds.right <= pitch.right + 1 &&
          fitBounds.top >= pitch.top - 1 &&
          fitBounds.bottom <= pitch.bottom + 1,
        labelAbove: fitBounds.bottom <= nodeBounds.top,
      };
    });
  expect(goalkeeperGeometry).toEqual({
    nodeInside: true,
    fitInside: true,
    labelAbove: true,
  });
  const exactPreviewSlot = page.locator(
    '.draft-pitch-panel .pitch-node[aria-disabled="false"]',
  ).first();
  await exactPreviewSlot.focus();
  await expect(chemistryHud).toContainText("EXACT PLACEMENT");
  const projectedChemistry = await chemistryHud.locator("dd").nth(1).textContent();
  await captureState("02-player-selected.png", {
    focusDraftChoices: true,
  });
  await captureState("02-selected-dossier.png", {
    focusSelector: ".selected-player-summary",
  });
  const dossierHeight = await page
    .locator(".selected-player-summary")
    .evaluate((dossier) => ({
      dossier: dossier.getBoundingClientRect().height,
      pitch: document
        .querySelector(".draft-pitch-panel .pitch")!
        .getBoundingClientRect().height,
    }));
  expect(dossierHeight.dossier).toBeLessThanOrEqual(dossierHeight.pitch + 1);
  const selectedTagEffects = page
    .locator(".selected-player-summary")
    .getByText("VIEW PLAYER TAGS");
  await selectedTagEffects.scrollIntoViewIfNeeded();
  await expect(selectedTagEffects).toBeVisible();
  if (await page.evaluate(() => window.innerWidth <= 720)) {
    const snapRail = await page.locator(".draft-card-grid").evaluate((rail) => {
      const style = window.getComputedStyle(rail);
      return {
        scrollSnapType: style.scrollSnapType,
        overflowX: style.overflowX,
        scrollWidth: rail.scrollWidth,
        clientWidth: rail.clientWidth,
      };
    });
    expect(snapRail.scrollSnapType).toContain("x");
    expect(["auto", "scroll"]).toContain(snapRail.overflowX);
    expect(snapRail.scrollWidth).toBeGreaterThan(snapRail.clientWidth);
  }
  await exactPreviewSlot.click();
  await expect(page.getByLabel("1 of 14 players drafted")).toBeVisible();
  await expect(chemistryHud.locator("dd")).toHaveCount(1);
  await expect(chemistryHud.locator("dd").first()).toHaveText(
    projectedChemistry ?? "",
  );
  const squadControl = page.getByRole("button", { name: "SQUAD 1 / 14" });
  await squadControl.click();
  const squadDrawer = page.getByRole("dialog", { name: "Squad" });
  await expect(squadDrawer.getByText("STARTING XI")).toBeVisible();
  await expect(squadDrawer.getByText("BENCH 1–3")).toBeVisible();
  const firstSquadPlayer = squadDrawer
    .getByRole("button", { name: /inspect (?!manager)/i })
    .first();
  await firstSquadPlayer.click();
  const playerDialog = page.getByRole("dialog");
  await expect(playerDialog.getByText("TROPHY XI FIT")).toBeVisible();
  await expect(playerDialog.getByText("PLAYER TAG EFFECTS")).toBeVisible();
  await expect(playerDialog.getByText("TOURNAMENT VERSIONS")).toBeVisible();
  await expect(playerDialog.getByText("PHOTO STATUS")).toHaveCount(0);
  await expect(playerDialog.getByText("PORTRAIT SOURCE")).toHaveCount(0);
  await expect(playerDialog.locator(".player-status")).toBeVisible();
  await expect(playerDialog.locator(".circular-portrait").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(squadControl).toBeFocused();
  await expect(playerChoices()).toHaveCount(5);

  await page
    .getByRole("button", { name: "PLAYER RESPINS ×2" })
    .click();
  await page
    .getByRole("button", { name: /confirm player respin/i })
    .click();
  await expect(
    page.getByRole("button", { name: "PLAYER RESPINS ×1" }),
  ).toBeVisible();
  await expect(playerChoices()).toHaveCount(5);

  for (let index = 1; index < 11; index += 1) {
    await expect(playerChoices()).toHaveCount(5);
    await selectFirstPlayer();
    await expect(
      page.getByLabel(`${index} of 14 players drafted`),
    ).toBeVisible();
    await placeSelectedPlayer();
    await expect(
      page.getByLabel(`${index + 1} of 14 players drafted`),
    ).toBeVisible();

    if (index === 2) {
      await page.reload();
      await expect(page.getByLabel("3 of 14 players drafted")).toBeVisible();
      await expect(playerChoices()).toHaveCount(5);
    }
  }

  await page.getByRole("button", { name: /draft the bench/i }).click();
  await captureState("03-bench-draft.png", {
    focusDraftChoices: true,
  });
  for (let index = 0; index < 3; index += 1) {
    await expect(playerChoices()).toHaveCount(5);
    if (index === 1) {
      await page
        .getByRole("button", { name: "PLAYER RESPINS ×1" })
        .click();
      await page
        .getByRole("button", { name: /confirm player respin/i })
        .click();
      await expect(
        page.getByRole("button", { name: "PLAYER RESPINS USED" }),
      ).toBeDisabled();
    }
    await selectFirstPlayer();
    await page.getByRole("button", { name: `Bench ${index + 1}` }).click();
  }

  await expect(
    page.getByRole("heading", { name: /priority changes expected minutes/i }),
  ).toBeVisible();
  await captureState("04-bench-review.png", {
    focusDraftChoices: true,
  });
  const firstBenchName = await page
    .locator(".bench-player-copy b")
    .first()
    .textContent();
  await page
    .getByRole("button", {
      name: new RegExp(`move ${firstBenchName} down`, "i"),
    })
    .click();
  await page.getByRole("button", { name: /choose opponent/i }).click();

  await expect(
    page.getByRole("heading", { name: /choose your opponent/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /select world cup all-stars/i }),
  ).toBeVisible();
  await expect(page.getByText("MYTHIC").first()).toBeVisible();
  await expect(page.getByRole("switch")).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Tournament year" }),
  ).toHaveCount(0);
  const championCards = page.locator(
    ".historical-opponents .opponent-card--champion",
  );
  await expect(championCards).toHaveCount(14);
  const championYears = await page
    .locator(".historical-opponents .opponent-card__title b")
    .allTextContents();
  expect(championYears.map(Number)).toEqual(
    [2022, 2018, 2014, 2010, 2006, 2002, 1998, 1994, 1990, 1986, 1982, 1978, 1974, 1970],
  );
  await expect(page.getByText(/tournament in progress/i)).toHaveCount(0);
  const worldCupXi = page.getByRole("button", {
    name: /select world cup all-stars/i,
  });
  const opponentFooter = page.locator(".opponent-selection__continue");
  const tunnelButton = page.getByRole("button", {
    name: /enter the tunnel/i,
  });
  const opponentLayout = async () => ({
    championsHeading: await page
      .locator(".historical-opponents .opponent-section-heading")
      .boundingBox(),
    championGrid: await page
      .locator(".historical-opponents > .opponent-grid")
      .boundingBox(),
    allStarsCard: await worldCupXi.boundingBox(),
    footer: await opponentFooter.boundingBox(),
    scrollY: await page.evaluate(() => window.scrollY),
  });

  await worldCupXi.scrollIntoViewIfNeeded();
  await expect(
    page.getByText("Choose one opponent", { exact: true }),
  ).toBeVisible();
  const unselectedLayout = await opponentLayout();
  await worldCupXi.click();
  await expect(worldCupXi).toHaveAttribute("aria-pressed", "true");
  await expect(worldCupXi.getByText("Selected")).toBeVisible();
  await expect(
    page.getByText("World Cup All-Stars · Mythic", { exact: true }),
  ).toBeVisible();
  await expect(
    worldCupXi.getByText(/Mário Zagallo · 🇧🇷 Brazil 1970/i),
  ).toBeVisible();
  for (const hiddenCopy of [
    /Partial Historical Data/i,
    /Trophy XI Modeled Lineup/i,
    /Trophy XI Manager/i,
    /Manager Not sourced/i,
  ]) {
    await expect(page.getByText(hiddenCopy)).toHaveCount(0);
  }
  const selectedLayout = await opponentLayout();
  expect(selectedLayout).toEqual(unselectedLayout);
  expect(
    await tunnelButton.evaluate((button) => getComputedStyle(button).whiteSpace),
  ).toBe("nowrap");
  const selectedOverflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(selectedOverflow.scrollWidth).toBeLessThanOrEqual(
    selectedOverflow.viewport + 1,
  );

  await captureState("05-opponents.png");
  await tunnelButton.click();

  await expect(page).toHaveURL(/\/match$/);
  await expect(
    page.getByRole("heading", { name: "World Cup All-Stars", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/featured challenge · mythic/i)).toBeVisible();
  const simulate = page.getByRole("button", { name: /simulate match/i });
  await expect(simulate).toBeEnabled({ timeout: 3_000 });
  await simulate.click();
  await expect(page.locator(".reveal")).toHaveAttribute(
    "data-transitioning",
    "true",
  );
  await expect(page.getByText(/match engine live/i)).not.toBeVisible();
  await expect(page.getByText(/match engine live/i)).toBeVisible({
    timeout: 2_000,
  });
  const liveBroadcast = page.getByTestId("match-broadcast");
  const userTeamSheet = page.getByTestId("user-lineup");
  const opponentTeamSheet = page.getByTestId("opponent-lineup");
  await expect(userTeamSheet.getByRole("listitem")).toHaveCount(11);
  await expect(opponentTeamSheet.getByRole("listitem")).toHaveCount(11);
  await expect(userTeamSheet.getByText(managerName, { exact: true })).toBeVisible();
  await expect(
    opponentTeamSheet.getByText("Mário Zagallo", { exact: true }),
  ).toBeVisible();
  await expect(
    userTeamSheet.getByText(selectedFormationName!.replaceAll("–", "-"), {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    opponentTeamSheet.getByText("4-3-3", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Live match stats" }),
  ).toBeVisible();
  await expect(page.getByTestId("live-scoreboard")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Match timeline" }),
  ).toBeVisible();
  const liveClipping = await liveBroadcast.evaluate((broadcast) => ({
    horizontal: broadcast.scrollWidth > broadcast.clientWidth + 1,
    vertical: broadcast.scrollHeight > broadcast.clientHeight + 1,
  }));
  expect(liveClipping.horizontal).toBe(false);
  expect(liveClipping.vertical).toBe(false);
  if (page.viewportSize()?.width === 1440) {
    const desktopFit = await liveBroadcast.evaluate((broadcast) => {
      const bounds = broadcast.getBoundingClientRect();
      return {
        broadcastBottom: bounds.bottom,
        documentHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
      };
    });
    expect(desktopFit.broadcastBottom).toBeLessThanOrEqual(
      desktopFit.viewportHeight + 1,
    );
    expect(desktopFit.documentHeight).toBeLessThanOrEqual(
      desktopFit.viewportHeight + 1,
    );
  }
  await captureState("05-match-live.png", {
    focusSelector: '[data-testid="match-broadcast"]',
  });
  await page.getByRole("button", { name: "Fast forward" }).click();
  await expect(
    page.getByRole("heading", {
      name: new RegExp(`${managerName} adjusts the shape`, "i"),
    }),
  ).toBeVisible({ timeout: 8_000 });
  await page.getByRole("button", { name: /skip to result/i }).click();

  await expect(page).toHaveURL(/\/result$/);
  const resultPage = page.getByTestId("result-page");
  const resultHero = page.getByTestId("result-hero");
  const matchReport = page.getByTestId("match-report");
  await expect(
    page.getByRole("heading", { name: "History renders its verdict." }),
  ).toBeVisible();
  await expect(resultHero.getByText("FINAL RECORD")).toBeVisible();
  await expect(page.getByText(/player of the match/i)).toHaveCount(0);
  await expect(page.getByText(/the archive answers back/i)).toHaveCount(0);
  await expect(page.getByText(/\bnull\b/i)).toHaveCount(0);
  await expect(matchReport.getByText(/\bseed\b/i)).toHaveCount(0);
  await expect(matchReport.getByText("MATCH STATISTICS")).toBeVisible();
  await expect(page.getByText("MANAGER INSIGHT")).toBeVisible();
  const resultActionHeights = await page
    .getByTestId("result-actions")
    .getByRole("button")
    .evaluateAll((buttons) =>
      buttons.map((button) =>
        Math.round(button.getBoundingClientRect().height),
      ),
    );
  expect(new Set(resultActionHeights).size).toBe(1);

  const finalRatings = page.getByTestId("final-ratings");
  for (const rating of ["ATK", "MID", "DEF", "CHEM", "OVR"]) {
    await expect(finalRatings.getByText(rating, { exact: true })).toBeVisible();
  }

  await expect(
    page.getByRole("heading", { name: "Two XIs. One final record." }),
  ).toBeVisible();
  const resultUserSheet = page.getByTestId("trophy-xi-team-sheet");
  const resultOpponentSheet = page.getByTestId("opponent-team-sheet");
  await expect(resultUserSheet.getByText(managerName, { exact: true })).toBeVisible();
  await expect(
    resultOpponentSheet.getByText("Mário Zagallo", { exact: true }),
  ).toBeVisible();
  await expect(resultUserSheet.locator(".pitch")).toBeVisible();
  await expect(resultOpponentSheet.locator(".pitch")).toBeVisible();

  const contributionRows = page
    .getByTestId("squad-contributions")
    .getByRole("article");
  await expect(contributionRows).toHaveCount(14);
  await expect(
    contributionRows.filter({ hasText: /% fit/ }),
  ).toHaveCount(11);
  await expect(page.getByText(/−0% placement/)).toHaveCount(0);
  await expect(
    page.getByText(/era translation is reflected on both sides/i),
  ).toBeVisible();
  await expect(
    page.getByText(/bench \d priority|influence \d+/i),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      /original combined squad|trophy xi composite|matches not sourced|normal fatigue|deterministic substitutions/i,
    ),
  ).toHaveCount(0);
  await expect(page.getByText(/world cup all-stars/i).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "How the match turned" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Take the result with you" }),
  ).toBeVisible();
  await expect(page.getByTestId("share-card-preview")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy result summary" }),
  ).toBeVisible();

  const resultClipping = await resultPage.evaluate((resultLayout) => ({
    horizontal: resultLayout.scrollWidth > resultLayout.clientWidth + 1,
    clippedSections: [
      ...resultLayout.querySelectorAll<HTMLElement>(
        "[data-testid='result-hero'], [data-testid='match-report'], [data-testid='final-ratings'], [data-testid='team-sheets'], [data-testid='squad-contributions'], [data-testid='result-timeline'], [data-testid='share-result']",
      ),
    ]
      .filter((section) => section.scrollWidth > section.clientWidth + 1)
      .map((section) => section.dataset.testid),
  }));
  expect(resultClipping.horizontal).toBe(false);
  expect(resultClipping.clippedSections).toEqual([]);
  await captureState("06-result.png");
  await captureState("06-result-team-sheets.png", {
    focusSelector: '[data-testid="team-sheets"]',
  });
  await captureState("06-result-contributions.png", {
    focusSelector: '[data-testid="squad-contributions"]',
  });
  await captureState("06-result-share.png", {
    focusSelector: '[data-testid="share-result"]',
  });
  await page.getByRole("button", { name: "Redraft" }).click();
  await expect(page).toHaveURL(/\/play\/manager$/);
  await expect(
    page.getByRole("heading", { name: /choose your manager/i }),
  ).toBeVisible();
  await expect(page.locator('a[href="/credits"]')).toHaveCount(0);
});
