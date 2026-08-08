import { expect, test, type Page } from "@playwright/test";

const phoneWidths = [320, 375, 390, 393, 414, 430] as const;
const phoneHeights: Record<(typeof phoneWidths)[number], number> = {
  320: 568,
  375: 667,
  390: 844,
  393: 852,
  414: 896,
  430: 932,
};
const fullFlowPhones = phoneWidths;

const expectNoPageOverflow = async (page: Page) => {
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.viewport + 1);
};

const expectOpponentScreenToFit = async (page: Page, width: number) => {
  const screen = page.getByTestId("opponent-selection");
  const cards = screen.locator('[data-testid^="champion-card-"]');
  await expect(cards).toHaveCount(15);
  await expect(screen.locator("#opponent-heading")).toBeHidden();
  await expect(screen.getByText("WORLD CUP GAUNTLET", { exact: true })).toBeVisible();
  await expect(screen.getByText("15 CHAMPIONS", { exact: true })).toBeVisible();
  await expect(screen.getByText("FEATURED CHALLENGE", { exact: true })).toBeVisible();
  await expect(
    screen.getByRole("heading", { name: "World Cup All-Stars", exact: true }),
  ).toBeVisible();
  await expect(screen.getByText("CHAMPIONS", { exact: true })).toBeVisible();
  await expect(
    screen.getByRole("heading", {
      name: "Fifteen champions. One knockout match.",
      exact: true,
    }),
  ).toBeVisible();

  const topGeometry = await screen.evaluate((element) => {
    const intro = element.querySelector(".opponent-selection__heading");
    const featured = element.querySelector(".opponent-featured");
    const featuredCard = featured?.querySelector(".opponent-card--featured");
    const introBox = intro?.getBoundingClientRect();
    const featuredBox = featured?.getBoundingClientRect();
    const featuredCardBox = featuredCard?.getBoundingClientRect();
    return {
      gap:
        introBox && featuredBox
          ? featuredBox.top - introBox.bottom
          : Number.MAX_SAFE_INTEGER,
      featuredCardHeight: featuredCardBox?.height ?? Number.MAX_SAFE_INTEGER,
    };
  });
  expect(topGeometry.gap).toBeLessThanOrEqual(12);
  expect(topGeometry.featuredCardHeight).toBeLessThanOrEqual(300);

  const managerMetrics = screen.locator(
    'dl[aria-label$="manager profile"] > div:visible',
  );
  await expect(managerMetrics).toHaveCount(5);
  for (const label of [
    "OFF",
    "DEF",
    "Leadership",
    "Game Management",
    "Era Fit",
  ]) {
    await expect(managerMetrics.getByText(label, { exact: true })).toBeVisible();
  }
  const managerMetricGeometry = await managerMetrics.evaluateAll((metrics) =>
    metrics.map((metric) => {
      const box = metric.getBoundingClientRect();
      return {
        top: box.top,
        left: box.left,
        right: box.right,
        width: box.width,
        textFits:
          metric.scrollWidth <= metric.clientWidth + 1 &&
          metric.scrollHeight <= metric.clientHeight + 1,
      };
    }),
  );
  expect(managerMetricGeometry.every((metric) => metric.textFits)).toBe(true);
  expect(
    Math.max(...managerMetricGeometry.slice(0, 3).map((metric) => metric.width)) -
      Math.min(...managerMetricGeometry.slice(0, 3).map((metric) => metric.width)),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.max(...managerMetricGeometry.slice(3).map((metric) => metric.width)) -
      Math.min(...managerMetricGeometry.slice(3).map((metric) => metric.width)),
  ).toBeLessThanOrEqual(1);
  expect(managerMetricGeometry[3].top).toBeGreaterThan(
    managerMetricGeometry[0].top,
  );

  const featured = screen.getByRole("button", {
    name: /select world cup all-stars/i,
  });
  for (const label of ["Attack", "Midfield", "Defense", "Overall"]) {
    await expect(
      featured.getByText(new RegExp(`^${label}`, "i")),
    ).toBeVisible();
  }
  await expect(featured.getByText(/preferred formations/i)).toBeVisible();
  await expect(featured.getByText(/tactical style/i)).toBeVisible();

  const cardViewXiButtons = screen.locator(
    'button[aria-label^="View "][aria-label$=" lineup"]',
  );
  await expect(cardViewXiButtons).toHaveCount(15);
  await expect(cardViewXiButtons.first()).toBeHidden();

  for (const year of [
    2026, 2022, 2018, 2014, 2010, 2006, 2002, 1998, 1994, 1990, 1986, 1982,
    1978, 1974, 1970,
  ]) {
    const card = page.getByTestId(`champion-card-${year}`);
    const art = page.getByTestId(`champion-art-${year}`);
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await expect(art.locator("img")).toHaveJSProperty("complete", true);

    const geometry = await card.evaluate((element) => {
      const imageRegion = element.querySelector(
        '[data-testid^="champion-art-"]',
      );
      const image = imageRegion?.querySelector("img");
      const copy = imageRegion?.nextElementSibling;
      const cardBox = element.getBoundingClientRect();
      const artBox = imageRegion?.getBoundingClientRect();
      const copyBox = copy?.getBoundingClientRect();
      const style = imageRegion ? getComputedStyle(imageRegion) : null;
      const imageStyle = image ? getComputedStyle(image) : null;
      return {
        cardLeft: cardBox.left,
        cardRight: cardBox.right,
        cardHeight: cardBox.height,
        artLeft: artBox?.left ?? -1,
        artRight: artBox?.right ?? -1,
        artWidth: artBox?.width ?? 0,
        copyLeft: copyBox?.left ?? -1,
        copyRight: copyBox?.right ?? -1,
        overflow: style?.overflow,
        objectFit: imageStyle?.objectFit,
        maskImage: imageStyle?.maskImage,
        imageComplete: image instanceof HTMLImageElement ? image.complete : false,
        imageNaturalWidth:
          image instanceof HTMLImageElement ? image.naturalWidth : 0,
      };
    });
    expect(geometry.cardLeft).toBeGreaterThanOrEqual(0);
    expect(geometry.cardRight).toBeLessThanOrEqual(width + 1);
    expect(geometry.cardHeight).toBeLessThanOrEqual(233);
    expect(geometry.artLeft).toBeGreaterThanOrEqual(geometry.cardLeft - 1);
    expect(geometry.artRight).toBeLessThan(geometry.cardRight);
    expect(geometry.artWidth / (geometry.cardRight - geometry.cardLeft)).toBeGreaterThanOrEqual(
      0.38,
    );
    expect(geometry.artWidth / (geometry.cardRight - geometry.cardLeft)).toBeLessThanOrEqual(
      0.42,
    );
    expect(geometry.copyLeft).toBeGreaterThanOrEqual(geometry.artRight - 1);
    expect(geometry.copyRight).toBeLessThanOrEqual(geometry.cardRight + 1);
    expect(geometry.overflow).toBe("hidden");
    expect(geometry.objectFit).toBe("contain");
    expect(geometry.maskImage).not.toBe("none");
    expect(geometry.imageComplete).toBe(true);
    expect(geometry.imageNaturalWidth).toBeGreaterThan(0);
  }

  const argentina = page.getByRole("button", {
    name: /select argentina 2022/i,
  });
  await argentina.scrollIntoViewIfNeeded();
  await argentina.click();
  await expect(argentina).toHaveAttribute("aria-pressed", "true");
  expect(
    await argentina.evaluate((card) => getComputedStyle(card).boxShadow),
  ).not.toBe("none");

  const footer = page.getByTestId("opponent-action-bar");
  const viewXi = page.getByTestId("footer-view-xi");
  const tunnel = page.getByTestId("enter-tunnel");
  await expect(footer).toBeInViewport();
  await expect(viewXi).toBeInViewport();
  await expect(tunnel).toBeInViewport();

  const actionGeometry = await page.evaluate(() => {
    const bounds = (testId: string) => {
      const element = document.querySelector(`[data-testid="${testId}"]`);
      const box = element?.getBoundingClientRect();
      const style = element ? getComputedStyle(element) : null;
      return box && element
        ? {
            left: box.left,
            right: box.right,
            top: box.top,
            bottom: box.bottom,
            height: box.height,
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            whiteSpace: style?.whiteSpace,
          }
        : null;
    };
    return {
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      footer: bounds("opponent-action-bar"),
      viewXi: bounds("footer-view-xi"),
      tunnel: bounds("enter-tunnel"),
      selectedName: bounds("selected-opponent-name"),
    };
  });

  expect(actionGeometry.scrollWidth).toBeLessThanOrEqual(
    actionGeometry.viewportWidth + 1,
  );
  for (const box of [
    actionGeometry.footer,
    actionGeometry.viewXi,
    actionGeometry.tunnel,
  ]) {
    expect(box).not.toBeNull();
    expect(box!.left).toBeGreaterThanOrEqual(0);
    expect(box!.right).toBeLessThanOrEqual(width + 1);
    expect(box!.bottom).toBeLessThanOrEqual(actionGeometry.viewportHeight + 1);
  }
  expect(actionGeometry.viewXi!.height).toBeGreaterThanOrEqual(44);
  expect(actionGeometry.tunnel!.height).toBeGreaterThanOrEqual(44);
  expect(actionGeometry.viewXi!.right).toBeLessThanOrEqual(
    actionGeometry.tunnel!.left,
  );
  for (const action of [actionGeometry.viewXi, actionGeometry.tunnel]) {
    expect(action!.scrollWidth).toBeLessThanOrEqual(action!.clientWidth + 1);
    expect(action!.whiteSpace).toBe("nowrap");
  }
  expect(actionGeometry.selectedName).not.toBeNull();
  expect(actionGeometry.selectedName!.scrollWidth).toBeLessThanOrEqual(
    actionGeometry.selectedName!.clientWidth + 1,
  );

  const finalCard = page.getByTestId("champion-card-1970");
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await expect
    .poll(
      async () => (await finalCard.boundingBox())?.y ?? Number.MAX_SAFE_INTEGER,
    )
    .toBeLessThan(actionGeometry.viewportHeight);
  const [finalCardBox, footerBox] = await Promise.all([
    finalCard.boundingBox(),
    footer.boundingBox(),
  ]);
  expect(finalCardBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  expect(finalCardBox!.y + finalCardBox!.height).toBeLessThanOrEqual(
    footerBox!.y - 6,
  );
  await expectNoPageOverflow(page);
};

const expectOpponentRevealToScrollAndFit = async (
  page: Page,
  width: number,
  height: number,
) => {
  const userTeam = page.getByTestId("user-final-team");
  const versus = page.getByTestId("final-versus-mark");
  const opponentTeam = page.getByTestId("opponent-final-team");
  const finalLabel = page.getByText("THE WORLD CUP FINAL", { exact: true });
  const comparison = page.getByRole("region", {
    name: "Team ratings comparison",
  });
  const dossier = page.getByRole("region", { name: /match dossier/i });
  const enterFinal = page.getByRole("button", { name: /enter final/i });

  for (const element of [userTeam, versus, opponentTeam, finalLabel, comparison]) {
    await expect(element).toBeVisible();
  }
  for (const label of [
    "Attack",
    "Midfield",
    "Defense",
    "Chemistry",
    "Overall",
  ]) {
    await expect(comparison.getByText(label, { exact: true })).toBeVisible();
  }

  const geometry = await page.evaluate(() => {
    const bounds = (element: Element | null) => {
      const box = element?.getBoundingClientRect();
      return box
        ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom }
        : null;
    };
    const byTestId = (id: string) =>
      document.querySelector(`[data-testid="${id}"]`);
    const finalLabel = Array.from(document.querySelectorAll("span")).find(
      (element) => element.textContent === "THE WORLD CUP FINAL",
    );
    const comparison = document.querySelector(
      '[aria-label="Team ratings comparison"]',
    );
    const metricRows = Array.from(comparison?.children[1]?.children ?? []);
    const dossier = document.querySelector('[aria-label$="match dossier"]');
    const enterFinal = Array.from(document.querySelectorAll("button")).find(
      (button) => /ENTER FINAL/i.test(button.textContent ?? ""),
    );

    return {
      htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      user: bounds(byTestId("user-final-team")),
      versus: bounds(byTestId("final-versus-mark")),
      opponent: bounds(byTestId("opponent-final-team")),
      finalLabel: bounds(finalLabel ?? null),
      comparison: bounds(comparison),
      metricChildren: metricRows.flatMap((row) =>
        Array.from(row.children).map((child) => bounds(child)),
      ),
      dossier: bounds(dossier),
      enterFinal: bounds(enterFinal ?? null),
    };
  });

  expect(geometry.htmlOverflowY).not.toBe("hidden");
  expect(geometry.bodyOverflowY).not.toBe("hidden");
  for (const box of [
    geometry.user,
    geometry.versus,
    geometry.opponent,
    geometry.finalLabel,
    geometry.comparison,
    geometry.dossier,
    ...geometry.metricChildren,
  ]) {
    expect(box).not.toBeNull();
    expect(box!.left).toBeGreaterThanOrEqual(-1);
    expect(box!.right).toBeLessThanOrEqual(width + 1);
  }
  expect(geometry.viewportWidth).toBe(width);
  expect(geometry.viewportHeight).toBe(height);

  for (const action of [
    page.getByRole("button", { name: /view your xi/i }),
    page.getByRole("button", { name: /view opponent xi/i }),
    enterFinal,
  ]) {
    await action.scrollIntoViewIfNeeded();
    await expect(action).toBeInViewport();
    await expect(action).toBeEnabled();
  }
  await expect(dossier.getByText("FORMATION", { exact: true })).toBeVisible();
  await expect(dossier.getByText("OPPONENT OVR", { exact: true })).toBeVisible();
  await expect(
    dossier.getByText("TACTICAL IDENTITY", { exact: true }),
  ).toBeHidden();
  if (geometry.enterFinal && geometry.enterFinal.bottom > height + 1) {
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  }
  await expectNoPageOverflow(page);
};

const beginMode = async (
  page: Page,
  mode: "Classic Draft" | "World Cup Run",
  eraChoice: RegExp = /choose neutral/i,
) => {
  await page.goto("/");
  await page.getByRole("link", { name: /play trophy xi/i }).click();
  await expect(page.getByTestId("mobile-landing")).toBeHidden();
  await page.getByRole("button", { name: new RegExp(mode, "i") }).click();

  const cta = mode === "Classic Draft" ? /enter the draft/i : /begin the run/i;
  await page.getByRole("button", { name: cta }).click();
  await page.getByRole("button", { name: eraChoice }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
};

const chooseShortlistManagerAndFormation = async (page: Page) => {
  const managers = page.getByTestId("mobile-manager-picker");
  const manager = managers.getByRole("button", { name: /^choose /i }).first();
  await manager.click();
  await expect(manager).toHaveAttribute("aria-pressed", "true");
  await managers.getByRole("button", { name: "Continue", exact: true }).click();
  const picker = page.getByTestId("mobile-formation-picker");
  await expect(picker).toBeVisible();
  await picker
    .getByRole("button", { name: /^choose .* formation/i })
    .first()
    .click();
  await picker.getByRole("button", { name: "Draft", exact: true }).click();
};

const draftSquad = async (page: Page) => {
  const choices = () =>
    page.getByRole("button", { name: /select .* for placement, rated/i });

  const selectFirst = async () => {
    const first = choices().first();
    await expect(first).toBeVisible();
    // Player cards animate into each new five-card offer. Dispatch the same tap
    // without requiring Playwright's two-frame stability heuristic, which can
    // otherwise wait forever on the narrow horizontal rail.
    await first.click({ force: true });
  };

  const placeSelected = async () => {
    const position = page
      .locator('.draft-pitch-panel .pitch-node[aria-disabled="false"]')
      .first();
    await expect(position).toBeVisible();
    await position.click();
  };

  await expect(choices()).toHaveCount(5);
  const firstRecord = page
    .getByRole("button", { name: /view tournament record/i })
    .first();
  await firstRecord.scrollIntoViewIfNeeded();
  await expect(firstRecord).toBeVisible();
  await firstRecord.click();
  const playerDetails = page.getByRole("dialog");
  await expect(playerDetails).toBeVisible();
  await expect(playerDetails.getByText("CAREER ACCOLADES")).toBeVisible();
  await playerDetails
    .getByRole("button", { name: /close player record/i })
    .click();

  for (let index = 0; index < 11; index += 1) {
    await selectFirst();
    await placeSelected();
    await expect(
      page
        .getByLabel(new RegExp(`${index + 1} of 14 players drafted`, "i"))
        .first(),
    ).toBeVisible();
  }

  await page.getByRole("button", { name: /draft the bench/i }).click();
  for (let index = 0; index < 3; index += 1) {
    await expect(
      page.getByText(`BENCH ${index + 1}`, { exact: true }).last(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: `Choose your ${["first", "second", "third"][index]} substitute.`,
      }),
    ).toBeVisible();
    await expect(
      page.locator('.bench-summary > div[data-filled="false"]:visible'),
    ).toHaveCount(0);
    await selectFirst();
    await page.getByRole("button", { name: `Bench ${index + 1}` }).click();
    await expect(
      page.locator('.bench-summary > div[data-filled="true"]'),
    ).toHaveCount(index + 1);
    await expect(
      page.locator('.bench-summary > div[data-filled="false"]:visible'),
    ).toHaveCount(0);
  }

  await expect(
    page.getByRole("heading", { name: /priority changes expected minutes/i }),
  ).toBeVisible();
};

test("phone landing is immediate, mobile-only, and overflow-safe at every target width", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390");

  for (const width of phoneWidths) {
    const height = phoneHeights[width];
    await page.setViewportSize({ width, height });
    await page.goto("/");

    const mobile = page.getByTestId("mobile-landing");
    await expect(mobile).toBeVisible();
    await expect(page.getByTestId("desktop-landing")).toBeHidden();
    await expect(
      mobile.getByText("Lionel Messi", { exact: true }),
    ).toBeVisible();
    await expect(
      mobile.getByText("Lamine Yamal", { exact: true }),
    ).toBeVisible();
    await expect(mobile.getByText("Pelé", { exact: true })).toBeVisible();
    await expect(
      mobile.getByText("Kylian Mbappé", { exact: true }),
    ).toHaveCount(0);
    await expect(mobile.getByText(/world cup xi simulator/i)).toHaveCount(0);
    await expect(page.getByTestId("hero-scroll-scene")).toBeHidden();
    await expect(page.getByTestId("champion-scroll-scene")).toBeHidden();
    const primaryCta = mobile.getByRole("link", { name: /play trophy xi/i });
    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toHaveCount(1);
    await expect(
      mobile.getByRole("link", { name: /start building/i }),
    ).toHaveCount(0);
    if (width >= 414) {
      const ctaBox = await primaryCta.boundingBox();
      expect(ctaBox).not.toBeNull();
      expect(ctaBox!.y + ctaBox!.height).toBeLessThanOrEqual(height);
    }

    const cardBoxes = await mobile.locator("article").evaluateAll((cards) =>
      cards.map((card) => {
        const box = card.getBoundingClientRect();
        return { left: box.left, right: box.right };
      }),
    );
    expect(cardBoxes).toHaveLength(3);
    expect(cardBoxes[0].left).toBeGreaterThanOrEqual(0);
    expect(cardBoxes[2].right).toBeLessThanOrEqual(width);
    expect(cardBoxes[0].right).toBeLessThanOrEqual(cardBoxes[1].left + 1);
    expect(cardBoxes[1].right).toBeLessThanOrEqual(cardBoxes[2].left + 1);
    await expectNoPageOverflow(page);
  }

  await page.getByRole("link", { name: "Players", exact: true }).click();
  await expect(page).toHaveURL(/\/database$/);
  await expect(
    page.getByRole("heading", { name: "Player Database" }),
  ).toBeVisible();
});

test("mobile player database stays compact and browsable across iPhone sizes", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390");
  test.setTimeout(120_000);

  for (const width of phoneWidths) {
    const height = phoneHeights[width];
    await page.setViewportSize({ width, height });
    await page.goto("/database");

    const hero = page.getByTestId("database-hero");
    const summary = page.getByTestId("archive-summary");
    const controls = page.getByTestId("database-controls");
    const cards = page.getByTestId("database-card");

    await expect(hero).toBeVisible();
    await expect(summary).toBeVisible();
    const search = page.getByRole("textbox", {
      name: "Search player or nation",
    });
    await expect(search).toBeVisible();
    await expect(search).toHaveCSS("font-size", "16px");
    await expect(cards).toHaveCount(50);

    const geometry = await page.evaluate(() => {
      const heroElement = document.querySelector<HTMLElement>(
        '[data-testid="database-hero"]',
      );
      const summaryElement = document.querySelector<HTMLElement>(
        '[data-testid="archive-summary"]',
      );
      const controlsElement = document.querySelector<HTMLElement>(
        '[data-testid="database-controls"]',
      );
      const gridElement = document.querySelector<HTMLElement>(
        '[data-testid="database-grid"]',
      );
      const cardElements = Array.from(
        document.querySelectorAll<HTMLElement>('[data-testid="database-card"]'),
      );
      const firstCard = cardElements[0]?.getBoundingClientRect();
      const secondCard = cardElements[1]?.getBoundingClientRect();
      return {
        heroHeight: heroElement?.getBoundingClientRect().height ?? 999,
        summaryHeight: summaryElement?.getBoundingClientRect().height ?? 999,
        controlsPosition: controlsElement
          ? getComputedStyle(controlsElement).position
          : "",
        columns: gridElement
          ? getComputedStyle(gridElement).gridTemplateColumns
              .split(" ")
              .filter(Boolean).length
          : 0,
        firstCard: firstCard
          ? {
              left: firstCard.left,
              right: firstCard.right,
              width: firstCard.width,
              height: firstCard.height,
            }
          : null,
        secondCard: secondCard
          ? {
              left: secondCard.left,
              right: secondCard.right,
              width: secondCard.width,
            }
          : null,
      };
    });

    expect(geometry.heroHeight).toBeLessThanOrEqual(202);
    expect(geometry.summaryHeight).toBeLessThanOrEqual(56);
    expect(geometry.controlsPosition).toBe("sticky");
    expect(geometry.columns).toBe(2);
    expect(geometry.firstCard).not.toBeNull();
    expect(geometry.secondCard).not.toBeNull();
    expect(geometry.firstCard!.left).toBeGreaterThanOrEqual(0);
    expect(geometry.secondCard!.right).toBeLessThanOrEqual(width + 1);
    expect(geometry.firstCard!.right).toBeLessThanOrEqual(
      geometry.secondCard!.left,
    );
    expect(geometry.firstCard!.width).toBeGreaterThanOrEqual(138);
    expect(geometry.firstCard!.width).toBeLessThanOrEqual(196);
    expect(geometry.firstCard!.height).toBeLessThanOrEqual(216);

    const firstName = cards.first().locator("h2");
    await expect(firstName).toBeVisible();
    expect(
      await firstName.evaluate(
        (element) => element.scrollHeight <= element.clientHeight + 1,
      ),
    ).toBe(true);
    await expect(cards.first().getByText("OVR", { exact: true })).toBeVisible();
    await expect(cards.first().locator(".circular-portrait")).toBeVisible();

    await page.getByRole("button", { name: "Filters", exact: true }).click();
    const filterSheet = page.getByRole("dialog", { name: "Filter players" });
    await expect(filterSheet).toBeVisible();
    await expect(
      filterSheet.getByRole("button", { name: "Apply filters" }),
    ).toBeInViewport();
    await expect(
      filterSheet.getByRole("button", { name: "Clear all" }),
    ).toBeInViewport();
    const sheetBox = await filterSheet.boundingBox();
    expect(sheetBox).not.toBeNull();
    expect(sheetBox!.x).toBeGreaterThanOrEqual(0);
    expect(sheetBox!.x + sheetBox!.width).toBeLessThanOrEqual(width + 1);
    expect(sheetBox!.y + sheetBox!.height).toBeLessThanOrEqual(height + 1);
    await filterSheet
      .getByRole("button", { name: "Close filter panel" })
      .click();

    await cards.nth(49).scrollIntoViewIfNeeded();
    await expect(cards.nth(49)).toBeVisible();
    await expect(cards.nth(49).locator(".circular-portrait")).toBeVisible();
    await expect(controls).toBeInViewport();
    await expectNoPageOverflow(page);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/database");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  const filterSheet = page.getByRole("dialog", { name: "Filter players" });
  await filterSheet.getByRole("combobox", { name: "Nation" }).click();
  await filterSheet
    .getByRole("option", { name: "ARG · Argentina" })
    .click();
  await filterSheet.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("button", { name: "Remove Argentina filter" }),
  ).toBeVisible();

  const search = page.getByRole("textbox", {
    name: "Search player or nation",
  });
  await search.fill("Lionel Messi");
  await expect(page.getByTestId("database-card")).toHaveCount(6);
  await page.getByTestId("database-card").first().click();
  await expect(page.getByRole("dialog", { name: /lionel messi/i })).toBeVisible();
  await page.getByRole("button", { name: "Close player record" }).click();

  await page.getByRole("combobox", { name: "Sort by" }).click();
  await page.getByRole("option", { name: "Name", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Sort by" })).toContainText(
    "Sort: Name",
  );
  await page.getByRole("button", { name: "Clear player search" }).click();
  await page
    .getByRole("button", { name: "Remove Argentina filter" })
    .click();
  await expect(page.getByTestId("database-card")).toHaveCount(50);
  await page.getByRole("button", { name: "Load more cards" }).click();
  await expect(page.getByTestId("database-card")).toHaveCount(100);
  await expectNoPageOverflow(page);
});

test("Safari storage failure cannot trap the mobile opening transition", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390");

  await page.addInitScript(() => {
    const unavailable = () => {
      throw new DOMException("Storage is unavailable", "SecurityError");
    };
    Object.defineProperties(Storage.prototype, {
      getItem: { configurable: true, value: unavailable },
      setItem: { configurable: true, value: unavailable },
      removeItem: { configurable: true, value: unavailable },
    });
  });

  await page.goto("/");
  await expect(page.getByTestId("mobile-landing")).toBeVisible();
  await page.getByRole("link", { name: /play trophy xi/i }).click();

  await expect(page).toHaveURL(/\/play$/);
  await expect(
    page.getByRole("heading", { name: /how will you build your xi/i }),
  ).toBeVisible({ timeout: 2_500 });
  await expect(
    page.getByText("OPENING MATCH MODES", { exact: true }),
  ).toBeHidden();

  const classicDraft = page.getByRole("button", { name: /classic draft/i });
  const worldCupRun = page.getByRole("button", { name: /world cup run/i });
  await classicDraft.click();
  await expect(classicDraft).toHaveAttribute("aria-pressed", "true");
  await worldCupRun.click();
  await expect(worldCupRun).toHaveAttribute("aria-pressed", "true");

  const navigation = page.getByRole("navigation", { name: "Game navigation" });
  await navigation.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("phone game navigation reaches Players and Home without squeezing the desktop header", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390");

  await page.goto("/play");
  const navigation = page.getByRole("navigation", { name: "Game navigation" });
  await expect(navigation).toBeVisible();
  await navigation.getByRole("link", { name: "Players", exact: true }).click();
  await expect(page).toHaveURL(/\/database$/);
  await page.goBack();
  await expect(navigation).toBeVisible();
  await navigation.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("mobile-landing")).toBeVisible();
});

test("mode selection fills phone viewports and keeps its action reachable", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390");

  for (const width of phoneWidths) {
    const height = phoneHeights[width];
    await page.setViewportSize({ width, height });
    await page.goto("/play");

    const screen = page.getByTestId("mobile-mode-screen");
    const modeGroup = screen.getByRole("group", { name: "Choose a game mode" });
    const modes = modeGroup.getByRole("button");
    await expect(screen).toBeVisible();
    await expect(modes).toHaveCount(2);
    await expect(
      modeGroup.getByRole("button", { name: /free selection/i }),
    ).toHaveCount(0);
    await expect(modeGroup.getByText("01", { exact: true })).toHaveCount(0);
    await expect(modeGroup.getByText("03", { exact: true })).toHaveCount(0);
    await expect(
      modeGroup.getByText(
        "Five-card offers. Build greatness from limited choices.",
        {
          exact: true,
        },
      ),
    ).toBeVisible();
    await expect(
      modeGroup.getByText(
        "Build your XI. Survive the group and conquer the knockout rounds.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(modeGroup.locator("img")).toHaveCount(2);
    expect(
      await modeGroup.locator("img").evaluateAll((images) =>
        images.every((image) => {
          const playerImage = image as HTMLImageElement;
          const box = image.getBoundingClientRect();
          const card = image.closest("button")?.getBoundingClientRect();
          return playerImage.complete && playerImage.naturalWidth > 0 && card
            ? box.right <= card.right + 1 && box.bottom <= card.bottom + 1
            : false;
        }),
      ),
    ).toBe(true);
    expect(
      await modeGroup
        .getByTestId("mobile-mode-copy")
        .evaluateAll((copies) =>
          copies.every((copy) =>
            Array.from(copy.querySelectorAll("strong, span")).every(
              (line) =>
                line.scrollWidth <= line.clientWidth + 1 &&
                line.scrollHeight <= line.clientHeight + 1,
            ),
          ),
        ),
    ).toBe(true);
    await expectNoPageOverflow(page);

    const cardBoxes = await modes.evaluateAll((cards) =>
      cards.map((card) => {
        const box = card.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
        };
      }),
    );
    for (const box of cardBoxes) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(width);
    }
    expect(cardBoxes[0].bottom).toBeLessThanOrEqual(cardBoxes[1].top);

    const classic = modeGroup.getByRole("button", { name: /classic draft/i });
    const worldCup = modeGroup.getByRole("button", { name: /world cup run/i });
    const fanFavorite = worldCup.getByText("FAN FAVORITE", { exact: true });
    await expect(fanFavorite).toBeVisible();
    expect(
      await fanFavorite.evaluate(
        (badge) => badge.scrollWidth <= badge.clientWidth + 1,
      ),
    ).toBe(true);
    expect(
      await classic
        .locator("img")
        .evaluate((image) => getComputedStyle(image).filter),
    ).toContain("grayscale(0.76)");
    expect(
      await worldCup
        .locator("img")
        .evaluate((image) => getComputedStyle(image).filter),
    ).toContain("grayscale(0.76)");
    await classic.click();
    await expect(classic).toHaveAttribute("aria-pressed", "true");
    await expect(classic).toHaveCSS(
      "border-top-color",
      "rgba(255, 224, 113, 0.96)",
    );
    await expect(classic.locator("img")).toHaveCSS("opacity", "0.98");
    expect(
      await classic
        .locator("img")
        .evaluate((image) => getComputedStyle(image).filter),
    ).toContain("saturate(1.2)");
    expect(
      await classic.evaluate((card) => getComputedStyle(card).boxShadow),
    ).not.toBe("none");

    const action = page.getByTestId("mobile-mode-action");
    const actionButton = action.getByRole("button", {
      name: /enter the draft/i,
    });
    await action.scrollIntoViewIfNeeded();
    await expect(actionButton).toBeVisible();
    await expect(actionButton).toBeEnabled();

    if (width >= 390) {
      const actionBox = await action.boundingBox();
      expect(actionBox).not.toBeNull();
      const actionBottom = actionBox!.y + actionBox!.height;
      expect(actionBottom).toBeGreaterThanOrEqual(height - 110);
      expect(actionBottom).toBeLessThanOrEqual(height);
    }
  }
});

test("era selection uses card glow and clears every card above its fixed action", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390");

  for (const width of phoneWidths) {
    const height = phoneHeights[width];
    await page.setViewportSize({ width, height });
    await page.goto("/play");
    const modeScreen = page.getByTestId("mobile-mode-screen");
    await modeScreen.getByRole("button", { name: /classic draft/i }).click();
    await modeScreen.getByRole("button", { name: /enter the draft/i }).click();
    await expect(page).toHaveURL(/\/play\/era$/);

    const eraScreen = page.getByTestId("mobile-era-screen");
    const eraGroup = eraScreen.getByRole("group", { name: "Choose your era" });
    const eraCards = eraGroup.getByRole("button");
    const command = page.getByTestId("mobile-era-command");
    await expect(eraCards).toHaveCount(7);
    await expect(command).toHaveCSS("position", "fixed");

    const selected = eraGroup.getByRole("button", { name: /choose 2010s/i });
    await selected.click();
    await expect(selected).toHaveAttribute("aria-pressed", "true");
    await expect(selected).toHaveCSS("filter", "brightness(1.04)");
    await expect(selected.locator("svg")).toHaveCount(0);
    await expect(
      eraGroup.getByRole("button", { name: /choose 2020s/i }).locator("svg"),
    ).toHaveCount(1);

    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    await page.waitForTimeout(100);
    const finalEra = eraGroup.getByRole("button", {
      name: /choose neutral \/ all eras/i,
    });
    const clearance = await page.evaluate(() => {
      const finalCard = document
        .querySelector('[aria-label^="Choose Neutral / All Eras"]')
        ?.getBoundingClientRect();
      const action = document
        .querySelector('[data-testid="mobile-era-command"]')
        ?.getBoundingClientRect();
      return finalCard && action
        ? {
            cardBottom: finalCard.bottom,
            cardRight: finalCard.right,
            actionTop: action.top,
            actionBottom: action.bottom,
          }
        : null;
    });
    expect(clearance).not.toBeNull();
    expect(clearance!.cardBottom).toBeLessThanOrEqual(
      clearance!.actionTop - 12,
    );
    expect(clearance!.cardRight).toBeLessThanOrEqual(width);
    expect(clearance!.actionBottom).toBeLessThanOrEqual(height);
    expect(height - clearance!.actionBottom).toBeGreaterThanOrEqual(70);

    await finalEra.click();
    await expect(finalEra).toHaveAttribute("aria-pressed", "true");
    await expect(finalEra.locator("svg")).toHaveCount(0);
    await expect(
      command.getByText("Neutral / All Eras", { exact: true }),
    ).toBeVisible();
    await expect(
      command.getByRole("button", { name: "Continue", exact: true }),
    ).toBeEnabled();
    await expectNoPageOverflow(page);
  }
});

test("manager shortlist stacks three horizontal comparison cards above its bottom action", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390");

  for (const width of phoneWidths) {
    const height = phoneHeights[width];
    await page.setViewportSize({ width, height });
    await beginMode(page, "Classic Draft", /choose 2010s/i);

    const picker = page.getByTestId("mobile-manager-picker");
    const list = page.getByTestId("mobile-manager-list");
    const cards = page.getByTestId("mobile-manager-card");
    const action = page.getByTestId("mobile-manager-action");
    await expect(picker).toBeVisible();
    await expect(cards).toHaveCount(3);
    await expect(
      picker.getByText("Compare the three. Tap to select.", { exact: true }),
    ).toBeVisible();
    await expect(picker.getByText(/swipe for all three/i)).toHaveCount(0);
    await expect(action).toHaveCSS("position", "fixed");

    const cardBoxes = await cards.evaluateAll((managerCards) =>
      managerCards.map((card) => {
        const box = card.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          height: box.height,
        };
      }),
    );
    for (const box of cardBoxes) {
      expect(box.height).toBeGreaterThanOrEqual(130);
      expect(box.height).toBeLessThanOrEqual(160);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(width);
    }
    expect(cardBoxes[1].top).toBeGreaterThan(cardBoxes[0].bottom);
    expect(cardBoxes[2].top).toBeGreaterThan(cardBoxes[1].bottom);
    expect(Math.abs(cardBoxes[0].left - cardBoxes[1].left)).toBeLessThanOrEqual(
      1,
    );

    const firstCard = cards.first();
    const portraits = cards.locator(".circular-portrait");
    const copies = cards.getByTestId("mobile-manager-copy");
    const descriptions = cards.getByTestId("mobile-manager-description");
    await expect(portraits).toHaveCount(3);
    await expect(copies).toHaveCount(3);
    await expect(descriptions).toHaveCount(3);
    const portrait = portraits.first();
    expect(
      await portrait.evaluate((image) => getComputedStyle(image).filter),
    ).toContain("grayscale(0.8)");
    const portraitBox = await portrait.boundingBox();
    expect(portraitBox).not.toBeNull();
    expect(portraitBox!.width).toBeGreaterThanOrEqual(70);
    expect(portraitBox!.width).toBeLessThanOrEqual(90);
    expect(portraitBox!.height).toBe(portraitBox!.width);
    expect(portraitBox!.x).toBeLessThan(
      cardBoxes[0].left + cardBoxes[0].height,
    );

    const grades = firstCard.getByTestId("mobile-manager-grades");
    const eraFits = cards.getByTestId("mobile-manager-era-fit");
    const formations = cards.getByTestId("mobile-manager-formations");
    await expect(eraFits).toHaveCount(3);
    await expect(formations).toHaveCount(3);
    for (const eraFit of await eraFits.all()) {
      await expect(eraFit.getByText("ERA FIT", { exact: true })).toBeVisible();
      await expect(eraFit.locator("b")).toHaveText(/^\d{2,3}$/);
    }
    for (const preference of await formations.all()) {
      await expect(preference).toContainText(/^PREF · \d/);
    }
    await expect(grades.getByText("OFF", { exact: true })).toBeVisible();
    await expect(grades.getByText("DEF", { exact: true })).toBeVisible();
    await expect(grades.getByText("LEAD", { exact: true })).toBeVisible();
    await expect(grades.getByText("GAME", { exact: true })).toBeVisible();
    const gradesBox = await grades.boundingBox();
    expect(gradesBox).not.toBeNull();
    expect(gradesBox!.x).toBeGreaterThan(portraitBox!.x + portraitBox!.width);
    const copyBox = await copies.first().boundingBox();
    expect(copyBox).not.toBeNull();
    expect(copyBox!.x + copyBox!.width).toBeLessThanOrEqual(gradesBox!.x + 1);
    const labelSize = await grades
      .getByText("OFF", { exact: true })
      .evaluate((label) => parseFloat(getComputedStyle(label).fontSize));
    expect(labelSize).toBeGreaterThanOrEqual(7);
    const gradePositions = await grades
      .getByTestId("mobile-manager-grade")
      .evaluateAll((items) =>
        items.map((item) => {
          const box = item.getBoundingClientRect();
          return { x: box.x, y: box.y };
        }),
      );
    expect(gradePositions[0].y).toBe(gradePositions[1].y);
    expect(gradePositions[2].y).toBe(gradePositions[3].y);
    expect(gradePositions[0].x).toBe(gradePositions[2].x);

    const profile = firstCard.getByTestId("mobile-manager-profile");
    const profileBox = await profile.boundingBox();
    expect(profileBox).not.toBeNull();
    expect(profileBox!.height).toBeGreaterThanOrEqual(44);
    await expect(profile).toBeVisible();
    if (width === 390) {
      await profile.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Close manager record" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }

    const choose = firstCard.getByRole("button", { name: /^choose /i });
    await choose.click();
    await expect(choose).toHaveAttribute("aria-pressed", "true");
    const selectedName = (await choose.getAttribute("aria-label"))!
      .replace(/^Choose /, "")
      .split(",")[0];
    await expect(action.getByText(selectedName, { exact: true })).toBeVisible();
    await expect(
      action.getByRole("button", { name: "Continue", exact: true }),
    ).toBeEnabled();
    await expect(firstCard).toHaveAttribute("data-selected", "true");
    expect(
      await firstCard.evaluate((card) => getComputedStyle(card).boxShadow),
    ).not.toBe("none");
    expect(
      await portrait.evaluate((image) => getComputedStyle(image).filter),
    ).toContain("saturate(1.18)");
    await expect(portrait).toHaveCSS("opacity", "1");

    if (width >= 390) {
      const actionBox = await action.boundingBox();
      expect(actionBox).not.toBeNull();
      expect(cardBoxes[2].bottom).toBeLessThanOrEqual(actionBox!.y - 8);
      expect(actionBox!.y + actionBox!.height).toBeGreaterThanOrEqual(
        height - 110,
      );
    } else {
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      const finalCardBox = await cards.last().boundingBox();
      const actionBox = await action.boundingBox();
      expect(finalCardBox).not.toBeNull();
      expect(actionBox).not.toBeNull();
      expect(finalCardBox!.y + finalCardBox!.height).toBeLessThanOrEqual(
        actionBox!.y - 8,
      );
    }

    expect(
      await list.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
    await expectNoPageOverflow(page);
  }
});

test("formation shortlist stacks four compact comparison cards above its bottom action", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390");

  for (const width of phoneWidths) {
    const height = phoneHeights[width];
    await page.setViewportSize({ width, height });
    await beginMode(page, "Classic Draft", /choose 2010s/i);

    const managerPicker = page.getByTestId("mobile-manager-picker");
    await managerPicker
      .getByRole("button", { name: /^choose /i })
      .first()
      .click();
    await managerPicker
      .getByRole("button", { name: "Continue", exact: true })
      .click();

    const picker = page.getByTestId("mobile-formation-picker");
    const list = page.getByTestId("mobile-formation-list");
    const cards = page.getByTestId("mobile-formation-card");
    const pitches = page.getByTestId("mobile-formation-pitch");
    const metrics = page.getByTestId("mobile-formation-metrics");
    const action = page.getByTestId("mobile-formation-action");
    await expect(picker).toBeVisible();
    await expect(cards).toHaveCount(4);
    await expect(pitches).toHaveCount(4);
    await expect(metrics).toHaveCount(4);
    await expect(
      picker.getByText("Choose from four offered shapes.", { exact: true }),
    ).toBeVisible();
    await expect(picker.getByText(/swipe to compare/i)).toHaveCount(0);
    await expect(action).toHaveCSS("position", "fixed");

    const cardBoxes = await cards.evaluateAll((formationCards) =>
      formationCards.map((card) => {
        const box = card.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          height: box.height,
        };
      }),
    );
    for (const box of cardBoxes) {
      expect(box.height).toBeGreaterThanOrEqual(115);
      expect(box.height).toBeLessThanOrEqual(132);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(width);
    }
    for (let index = 1; index < cardBoxes.length; index += 1) {
      expect(cardBoxes[index].top).toBeGreaterThan(cardBoxes[index - 1].bottom);
    }

    const pitchBoxes = await pitches.evaluateAll((items) =>
      items.map((pitch) => {
        const box = pitch.getBoundingClientRect();
        return { width: box.width, height: box.height };
      }),
    );
    for (const box of pitchBoxes) {
      expect(box.width).toBeGreaterThanOrEqual(69);
      expect(box.width).toBeLessThanOrEqual(85);
      expect(box.height).toBeGreaterThanOrEqual(95);
      expect(box.height).toBeLessThanOrEqual(120);
    }
    await expect(pitches.first().locator(".pitch-node")).toHaveCount(11);

    for (const statBlock of await metrics.all()) {
      await expect(
        statBlock.getByText("Manager fit", { exact: true }),
      ).toBeVisible();
      await expect(
        statBlock.getByText("Era fit", { exact: true }),
      ).toBeVisible();
      await expect(
        statBlock.getByText("Balance", { exact: true }),
      ).toBeVisible();
      await expect(statBlock.locator("b")).toHaveCount(3);
    }
    const formationNamesFit = await cards.evaluateAll((items) =>
      items.every((card) => {
        const name = card.querySelector("strong");
        return name ? name.scrollWidth <= name.clientWidth + 1 : false;
      }),
    );
    expect(formationNamesFit).toBe(true);

    const firstCard = cards.first();
    await firstCard.click();
    await expect(firstCard).toHaveAttribute("aria-pressed", "true");
    await expect(firstCard).toHaveAttribute("data-selected", "true");
    await expect(firstCard.locator("svg")).toHaveCount(0);
    expect(
      await firstCard.evaluate((card) => getComputedStyle(card).boxShadow),
    ).not.toBe("none");
    await expect(firstCard).toHaveCSS(
      "border-top-color",
      "rgba(255, 226, 117, 0.9)",
    );
    await expect(
      action.getByText("SELECTED SYSTEM", { exact: true }),
    ).toBeVisible();
    await expect(
      action.getByRole("button", { name: "Draft", exact: true }),
    ).toBeEnabled();

    const initialActionBox = await action.boundingBox();
    expect(initialActionBox).not.toBeNull();
    expect(initialActionBox!.y + initialActionBox!.height).toBeLessThanOrEqual(
      height,
    );
    expect(
      height - (initialActionBox!.y + initialActionBox!.height),
    ).toBeGreaterThanOrEqual(70);

    if (width >= 390) {
      expect(cardBoxes[3].bottom).toBeLessThanOrEqual(initialActionBox!.y - 8);
    } else {
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
    }

    const finalCardBox = await cards.last().boundingBox();
    const finalActionBox = await action.boundingBox();
    expect(finalCardBox).not.toBeNull();
    expect(finalActionBox).not.toBeNull();
    expect(finalCardBox!.y + finalCardBox!.height).toBeLessThanOrEqual(
      finalActionBox!.y - 8,
    );
    expect(
      await list.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
    await expectNoPageOverflow(page);
  }
});

test("manager and formation respins share a centered mobile confirmation modal", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390");

  const modalViewports = [
    ...phoneWidths.map((width) => ({ width, height: phoneHeights[width] })),
    { width: 390, height: 480 },
  ];

  const expectCenteredModal = async (
    kind: "manager" | "formation",
    width: number,
    height: number,
    footerTestId: "mobile-manager-action" | "mobile-formation-action",
  ) => {
    const backdrop = page.getByTestId(`mobile-${kind}-respin-backdrop`);
    const dialog = page.getByTestId(`mobile-${kind}-respin-dialog`);
    const footer = page.getByTestId(footerTestId);
    await expect(backdrop).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(backdrop).toHaveCSS("position", "fixed");

    const boxes = await page.evaluate(
      ({ kind, footerTestId }) => {
        const modal = document.querySelector(
          `[data-testid="mobile-${kind}-respin-dialog"]`,
        );
        const overlay = document.querySelector(
          `[data-testid="mobile-${kind}-respin-backdrop"]`,
        );
        const action = document.querySelector(
          `[data-testid="${footerTestId}"]`,
        );
        if (!modal || !overlay || !action) return null;
        const modalBox = modal.getBoundingClientRect();
        return {
          left: modalBox.left,
          right: modalBox.right,
          top: modalBox.top,
          bottom: modalBox.bottom,
          width: modalBox.width,
          centerX: modalBox.left + modalBox.width / 2,
          centerY: modalBox.top + modalBox.height / 2,
          scrollHeight: modal.scrollHeight,
          clientHeight: modal.clientHeight,
          overlayZ: Number.parseInt(getComputedStyle(overlay).zIndex, 10),
          footerZ: Number.parseInt(getComputedStyle(action).zIndex, 10),
        };
      },
      { kind, footerTestId },
    );
    expect(boxes).not.toBeNull();
    expect(boxes!.left).toBeGreaterThanOrEqual(13);
    expect(boxes!.right).toBeLessThanOrEqual(width - 13);
    expect(boxes!.top).toBeGreaterThanOrEqual(9);
    expect(boxes!.bottom).toBeLessThanOrEqual(height - 9);
    expect(boxes!.width).toBeLessThanOrEqual(380);
    expect(Math.abs(boxes!.centerX - width / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes!.centerY - height / 2)).toBeLessThanOrEqual(1);
    expect(boxes!.scrollHeight).toBeLessThanOrEqual(boxes!.clientHeight + 1);
    expect(boxes!.overlayZ).toBeGreaterThan(boxes!.footerZ);
    await expect(footer).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /continue|draft/i }),
    ).toHaveCount(0);
    await expectNoPageOverflow(page);
    return { backdrop, dialog };
  };

  for (const [index, viewport] of modalViewports.entries()) {
    const { width, height } = viewport;
    const confirmRespin = width === 390 && height === 844;
    await page.setViewportSize(viewport);
    await beginMode(page, "Classic Draft", /choose 2010s/i);

    const managerPicker = page.getByTestId("mobile-manager-picker");
    const managerRespin = managerPicker.getByRole("button", {
      name: /manager respin/i,
    });
    await managerRespin.click();
    const managerModal = await expectCenteredModal(
      "manager",
      width,
      height,
      "mobile-manager-action",
    );
    await expect(
      managerModal.dialog.getByText("MANAGER RESPIN ×1", { exact: true }),
    ).toBeVisible();
    await expect(
      managerModal.dialog.getByRole("button", {
        name: "RESPIN MANAGERS",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      managerModal.dialog.getByRole("button", {
        name: "KEEP MANAGERS",
        exact: true,
      }),
    ).toBeVisible();

    if (confirmRespin) {
      await managerModal.dialog
        .getByRole("button", { name: "RESPIN MANAGERS", exact: true })
        .click();
      await expect(managerModal.dialog).toHaveCount(0);
      await expect(
        managerPicker.getByRole("button", { name: /manager respin used/i }),
      ).toBeDisabled();
    } else if (index % 3 === 0) {
      await page.keyboard.press("Escape");
      await expect(managerModal.dialog).toHaveCount(0);
    } else if (index % 3 === 1) {
      await managerModal.backdrop.click({ position: { x: 3, y: 3 } });
      await expect(managerModal.dialog).toHaveCount(0);
    } else {
      await managerModal.dialog
        .getByRole("button", { name: "KEEP MANAGERS", exact: true })
        .click();
      await expect(managerModal.dialog).toHaveCount(0);
    }

    const manager = managerPicker
      .getByRole("button", { name: /^choose /i })
      .first();
    await manager.click();
    await managerPicker
      .getByRole("button", { name: "Continue", exact: true })
      .click();

    const formationPicker = page.getByTestId("mobile-formation-picker");
    const formationRespin = formationPicker.getByRole("button", {
      name: /formation respin/i,
    });
    await formationRespin.click();
    const formationModal = await expectCenteredModal(
      "formation",
      width,
      height,
      "mobile-formation-action",
    );
    await expect(
      formationModal.dialog.getByText("FORMATION RESPIN ×1", { exact: true }),
    ).toBeVisible();
    await expect(
      formationModal.dialog.getByRole("button", {
        name: "RESPIN SYSTEMS",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      formationModal.dialog.getByRole("button", {
        name: "KEEP SYSTEMS",
        exact: true,
      }),
    ).toBeVisible();

    if (confirmRespin) {
      await formationModal.dialog
        .getByRole("button", { name: "RESPIN SYSTEMS", exact: true })
        .click();
      await expect(formationModal.dialog).toHaveCount(0);
      await expect(
        formationPicker.getByRole("button", { name: /formation respin used/i }),
      ).toBeDisabled();
    } else if (index % 3 === 0) {
      await formationModal.dialog
        .getByRole("button", { name: "KEEP SYSTEMS", exact: true })
        .click();
      await expect(formationModal.dialog).toHaveCount(0);
    } else if (index % 3 === 1) {
      await page.keyboard.press("Escape");
      await expect(formationModal.dialog).toHaveCount(0);
    } else {
      await formationModal.backdrop.click({ position: { x: 3, y: 3 } });
      await expect(formationModal.dialog).toHaveCount(0);
    }
    await expectNoPageOverflow(page);
  }
});

test("mobile draft composes its summary, tactical board, and mini pick rail", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390");

  const draftViewports = [
    ...phoneWidths.map((width) => ({ width, height: phoneHeights[width] })),
    { width: 390, height: 568 },
  ];

  for (const viewport of draftViewports) {
    const { width, height } = viewport;
    await page.setViewportSize(viewport);
    await beginMode(page, "Classic Draft");
    await chooseShortlistManagerAndFormation(page);

    const status = page.locator(".draft-statusbar");
    const pitchPanel = page.locator(".draft-pitch-panel");
    const pitch = pitchPanel.locator(".pitch");
    const choices = page.locator(".draft-choices");
    const grid = page.locator(".draft-card-grid");
    const cards = grid.locator(".player-card");
    const respin = choices.getByRole("button", { name: /player respins ×2/i });
    await expect(status).toBeVisible();
    await expect(pitchPanel).toBeVisible();
    await expect(pitch).toBeVisible();
    await expect(choices).toBeVisible();
    await expect(cards).toHaveCount(5);
    await expect(respin).toBeVisible();
    await expect(respin).toBeEnabled();

    await respin.click();
    const playerRespinBackdrop = page.getByTestId(
      "mobile-player-respin-backdrop",
    );
    const playerRespinDialog = page.getByTestId("mobile-player-respin-dialog");
    await expect(playerRespinBackdrop).toBeVisible();
    await expect(playerRespinDialog).toBeVisible();
    await expect(
      playerRespinDialog.getByText("PLAYER RESPIN ×2", { exact: true }),
    ).toBeVisible();
    await expect(
      playerRespinDialog.getByRole("heading", {
        name: /replace these five player choices/i,
      }),
    ).toBeVisible();
    await expect(
      playerRespinDialog.getByRole("button", {
        name: "RESPIN PLAYERS",
        exact: true,
      }),
    ).toBeVisible();
    const playerModalBox = await playerRespinDialog.boundingBox();
    expect(playerModalBox).not.toBeNull();
    expect(
      Math.abs(playerModalBox!.x + playerModalBox!.width / 2 - width / 2),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(playerModalBox!.y + playerModalBox!.height / 2 - height / 2),
    ).toBeLessThanOrEqual(1);
    expect(playerModalBox!.x).toBeGreaterThanOrEqual(13);
    expect(playerModalBox!.x + playerModalBox!.width).toBeLessThanOrEqual(
      width - 13,
    );
    await playerRespinDialog
      .getByRole("button", { name: "KEEP PLAYERS", exact: true })
      .click();
    await expect(playerRespinDialog).toHaveCount(0);

    const geometry = await page.evaluate(() => {
      const box = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const bounds = element.getBoundingClientRect();
        return {
          left: bounds.left,
          right: bounds.right,
          top: bounds.top,
          bottom: bounds.bottom,
          width: bounds.width,
          height: bounds.height,
        };
      };
      const rail = document.querySelector<HTMLElement>(".draft-card-grid");
      return {
        status: box(".draft-statusbar"),
        pitch: box(".draft-pitch-panel .pitch"),
        panel: box(".draft-pitch-panel"),
        choices: box(".draft-choices"),
        card: box(".draft-card-grid .player-card"),
        railScrollWidth: rail?.scrollWidth ?? 0,
        railClientWidth: rail?.clientWidth ?? 0,
        railOverflowX: rail ? getComputedStyle(rail).overflowX : "",
      };
    });
    expect(geometry.status).not.toBeNull();
    expect(geometry.pitch).not.toBeNull();
    expect(geometry.panel).not.toBeNull();
    expect(geometry.choices).not.toBeNull();
    expect(geometry.card).not.toBeNull();
    expect(geometry.status!.height).toBeLessThanOrEqual(110);
    expect(geometry.pitch!.width).toBeGreaterThanOrEqual(203);
    expect(geometry.pitch!.width).toBeLessThanOrEqual(241);
    expect(geometry.pitch!.height).toBeGreaterThanOrEqual(281);
    expect(geometry.pitch!.height).toBeLessThanOrEqual(336);
    expect(geometry.card!.width).toBeGreaterThanOrEqual(147);
    expect(geometry.card!.width).toBeLessThanOrEqual(175);
    expect(geometry.card!.height).toBeGreaterThanOrEqual(249);
    expect(geometry.card!.height).toBeLessThanOrEqual(265);
    expect(geometry.choices!.top).toBeLessThan(height);
    expect(geometry.choices!.top).toBeGreaterThanOrEqual(
      geometry.panel!.bottom + 7,
    );
    expect(geometry.railScrollWidth).toBeGreaterThan(geometry.railClientWidth);
    expect(geometry.railOverflowX).toBe("auto");

    const firstCard = cards.first();
    await expect(firstCard.locator(".player-rating strong")).toHaveText(
      /^\d{2,3}$/,
    );
    await expect(firstCard.locator(".player-rating span")).not.toBeEmpty();
    await expect(firstCard.locator(".player-era span")).toHaveText(/^\d{4}$/);
    await expect(firstCard.locator(".circular-portrait")).toBeVisible();
    await expect(firstCard.locator(".player-country")).not.toBeEmpty();
    await expect(firstCard.locator("h3")).not.toBeEmpty();
    await expect(
      firstCard.getByRole("button", { name: "View tournament record" }),
    ).toBeVisible();

    const lastCard = cards.last();
    await lastCard.scrollIntoViewIfNeeded();
    const lastCardBox = await lastCard.boundingBox();
    expect(lastCardBox).not.toBeNull();
    expect(lastCardBox!.x).toBeGreaterThanOrEqual(0);
    expect(lastCardBox!.x + lastCardBox!.width).toBeLessThanOrEqual(width + 1);
    await expect(lastCard.locator("h3")).not.toBeEmpty();

    await firstCard
      .getByRole("button", { name: "View tournament record" })
      .click();
    const playerRecord = page.getByRole("dialog");
    await expect(playerRecord).toBeVisible();
    await expect(playerRecord.getByText("CAREER ACCOLADES")).toBeVisible();
    await playerRecord
      .getByRole("button", { name: /close player record/i })
      .click();
    await expect(playerRecord).toHaveCount(0);

    const choose = firstCard.locator(".player-card__pick-target");
    await choose.click();
    await expect(firstCard).toHaveClass(/player-card--selected/);
    const selectedShadow = await firstCard.evaluate(
      (card) => getComputedStyle(card).boxShadow,
    );
    expect(selectedShadow).not.toBe("none");
    const selectedSummary = page.locator(".selected-player-summary");
    await expect(selectedSummary).toBeVisible();
    const summaryBox = await selectedSummary.boundingBox();
    expect(summaryBox).not.toBeNull();
    expect(summaryBox!.height).toBeLessThanOrEqual(82);
    await expect(
      page
        .locator('.draft-pitch-panel .pitch-node[aria-disabled="false"]')
        .first(),
    ).toBeVisible();
    await selectedSummary.getByRole("button", { name: /cancel/i }).click();
    await expect(selectedSummary).toHaveCount(0);
    await expectNoPageOverflow(page);
  }
});

for (const width of fullFlowPhones) {
  test(`classic phone flow uses taps from setup through match result at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-390");
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: phoneHeights[width] });

    await beginMode(page, "Classic Draft", /choose 2010s/i);
    await chooseShortlistManagerAndFormation(page);
    await draftSquad(page);
    await expectNoPageOverflow(page);

    await page.getByRole("button", { name: /choose opponent/i }).click();
    await expectOpponentScreenToFit(page, width);
    const allStars = page.getByRole("button", {
      name: /select world cup all-stars/i,
    });
    await allStars.scrollIntoViewIfNeeded();
    await allStars.click();
    await page.getByRole("button", { name: /enter the tunnel/i }).click();
    await expect(
      page.getByRole("heading", { name: "All Stars", exact: true }),
    ).toBeVisible();
    await expectOpponentRevealToScrollAndFit(
      page,
      width,
      phoneHeights[width],
    );
    const enterFinal = page.getByRole("button", { name: /enter final/i });
    await enterFinal.scrollIntoViewIfNeeded();
    await expect(enterFinal).toBeInViewport();
    await expect(enterFinal).toBeEnabled();
    await expect(page.getByTestId("final-versus-mark")).toHaveCSS(
      "opacity",
      "1",
    );

    const matchupGeometry = async () =>
      page.evaluate(() => {
        const bounds = (testId: string) => {
          const element = document.querySelector(`[data-testid="${testId}"]`);
          if (!element) return null;
          const box = element.getBoundingClientRect();
          return {
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
          };
        };
        const finalLabel = Array.from(document.querySelectorAll("span")).find(
          (element) => element.textContent === "THE WORLD CUP FINAL",
        );
        const finalLabelBox = finalLabel?.getBoundingClientRect();
        return {
          user: bounds("user-final-team"),
          versus: bounds("final-versus-mark"),
          opponent: bounds("opponent-final-team"),
          scrollY: window.scrollY,
          finalLabel: finalLabelBox
            ? {
                left: finalLabelBox.left,
                right: finalLabelBox.right,
                scrollWidth: finalLabel?.scrollWidth ?? 0,
                clientWidth: finalLabel?.clientWidth ?? 0,
              }
            : null,
        };
      });

    const beforeLaunch = await matchupGeometry();
    expect(beforeLaunch.finalLabel).not.toBeNull();
    expect(beforeLaunch.finalLabel!.left).toBeGreaterThanOrEqual(0);
    expect(beforeLaunch.finalLabel!.right).toBeLessThanOrEqual(width + 1);
    expect(beforeLaunch.finalLabel!.scrollWidth).toBeLessThanOrEqual(
      beforeLaunch.finalLabel!.clientWidth + 1,
    );

    await enterFinal.click();
    await expect(
      page.getByTestId("match-transition").locator(".."),
    ).toHaveAttribute("data-transitioning", "true");
    await page.waitForTimeout(180);
    const duringLaunch = await matchupGeometry();

    for (const identity of ["user", "versus", "opponent"] as const) {
      expect(beforeLaunch[identity]).not.toBeNull();
      expect(duringLaunch[identity]).not.toBeNull();
      for (const measurement of ["left", "top", "width", "height"] as const) {
        const delta = Math.abs(
          duringLaunch[identity]![measurement] -
            beforeLaunch[identity]![measurement],
        );
        expect(
          delta,
          `${identity} ${measurement} moved during ENTER FINAL`,
        ).toBeLessThanOrEqual(0.75);
      }
    }

    await expect(page.getByTestId("match-broadcast")).toBeVisible();
    const broadcastOverflow = await page.evaluate(() => ({
      html: getComputedStyle(document.documentElement).overflowY,
      body: getComputedStyle(document.body).overflowY,
    }));
    expect(broadcastOverflow.html).not.toBe("hidden");
    expect(broadcastOverflow.body).not.toBe("hidden");
    if (width === 390) {
      await page.getByRole("button", { name: /fast forward/i }).click();
      const finalResult = page.getByRole("button", {
        name: /view final result/i,
      });
      await expect(finalResult).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("FULL TIME", { exact: true })).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: /win the world cup|are world champions/i,
        }),
      ).toBeVisible();
      await expectNoPageOverflow(page);
      await finalResult.click();
    } else {
      await page.getByRole("button", { name: /skip to result/i }).click();
    }
    await expect(page).toHaveURL(/\/result$/);
    await expect(
      page.getByTestId("result-hero").getByText("FINAL RECORD"),
    ).toBeVisible();
    await expectNoPageOverflow(page);

    if (width === 390) {
      await page.evaluate(() => {
        const key = "trophy-xi-game-v1";
        const persisted = JSON.parse(window.localStorage.getItem(key)!);
        persisted.state.gameMode = "world-cup-run";
        window.localStorage.setItem(key, JSON.stringify(persisted));
      });
      await page.reload();
      await expect(
        page.getByText("Continue tournament", { exact: true }),
      ).toBeHidden();
      const completedRunAction = page.getByRole("button", {
        name: /view world cup run/i,
      });
      await expect(completedRunAction).toBeVisible();
      await completedRunAction.click();
      await expect(page).toHaveURL(/\/play\/world-cup-run$/);
    }
  });
}

test("the narrowest and widest target phones keep setup and draft taps usable", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390");
  test.setTimeout(60_000);

  for (const width of [320, 430]) {
    await page.setViewportSize({ width, height: width === 320 ? 700 : 932 });
    await beginMode(page, "Classic Draft");
    await chooseShortlistManagerAndFormation(page);

    const choice = page
      .getByRole("button", { name: /select .* for placement, rated/i })
      .first();
    await expect(choice).toBeVisible();
    await choice.click();

    const position = page
      .locator('.draft-pitch-panel .pitch-node[aria-disabled="false"]')
      .first();
    await expect(position).toBeVisible();
    await position.click();
    await expect(
      page.getByLabel(/1 of 14 players drafted/i).first(),
    ).toBeVisible();
    await expectNoPageOverflow(page);
  }
});

test("World Cup Run presents the tournament on phone after the same draft", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390");
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });

  await beginMode(page, "World Cup Run");
  await chooseShortlistManagerAndFormation(page);
  await draftSquad(page);
  await page.getByRole("button", { name: /enter world cup/i }).click();
  await expect(page).toHaveURL(/\/play\/world-cup-run$/, { timeout: 15_000 });
  const entryViewports = [
    ...phoneWidths.map((width) => ({ width, height: phoneHeights[width] })),
    { width: 390, height: 568 },
  ];

  for (const viewport of entryViewports) {
    await page.setViewportSize(viewport);

    const headline = page.getByRole("heading", { name: "ENTER THE WORLD CUP" });
    const action = page.getByRole("button", { name: /begin the world cup/i });
    await expect(headline).toBeVisible();
    await expect(page.getByText("48 NATIONS", { exact: true })).toBeVisible();
    await expect(page.getByText("ONE TROPHY", { exact: true })).toBeVisible();
    await expect(
      page.getByText("YOUR RUN STARTS NOW", { exact: true }),
    ).toBeVisible();
    await expect(action).toBeVisible();
    await expect(headline).toHaveCSS("opacity", "1");
    await expect(action).toHaveCSS("opacity", "1");

    const geometry = await page.evaluate(() => {
      const main = document.querySelector("main");
      const header = document.querySelector(".game-header");
      const title = main?.querySelector("h1");
      const kicker = main?.querySelector("section > div:first-child");
      const meta = main?.querySelector('[aria-label="World Cup overview"]');
      const button = main?.querySelector("button");
      if (!main || !header || !title || !kicker || !meta || !button)
        return null;

      const mainBox = main.getBoundingClientRect();
      const headerBox = header.getBoundingClientRect();
      const titleBox = title.getBoundingClientRect();
      const buttonBox = button.getBoundingClientRect();
      const cleanArtwork = getComputedStyle(main, "::after");

      return {
        viewportHeight: window.innerHeight,
        scrollY: window.scrollY,
        documentHeight: document.documentElement.scrollHeight,
        mainTop: mainBox.top,
        mainBottom: mainBox.bottom,
        headerBottom: headerBox.bottom,
        titleTop: titleBox.top,
        titleCenter: titleBox.left + titleBox.width / 2,
        titleTextAlign: getComputedStyle(title).textAlign,
        kickerCenter:
          kicker.getBoundingClientRect().left +
          kicker.getBoundingClientRect().width / 2,
        metaCenter:
          meta.getBoundingClientRect().left +
          meta.getBoundingClientRect().width / 2,
        titleOverflowX: getComputedStyle(title).overflowX,
        titleOverflowY: getComputedStyle(title).overflowY,
        buttonTop: buttonBox.top,
        buttonBottom: buttonBox.bottom,
        artworkImage: cleanArtwork.backgroundImage,
        artworkPosition: cleanArtwork.backgroundPosition,
        artworkSize: cleanArtwork.backgroundSize,
      };
    });

    expect(geometry).not.toBeNull();
    expect(
      Math.abs(geometry!.mainTop - geometry!.headerBottom),
    ).toBeLessThanOrEqual(1);
    expect(geometry!.mainBottom).toBeLessThanOrEqual(viewport.height + 1);
    expect(geometry!.mainBottom).toBeGreaterThanOrEqual(viewport.height - 1);
    expect(geometry!.scrollY).toBeLessThanOrEqual(1);
    expect(geometry!.documentHeight).toBeLessThanOrEqual(
      geometry!.viewportHeight + 1,
    );
    expect(geometry!.titleTop).toBeLessThan(viewport.height * 0.28);
    expect(geometry!.titleTextAlign).toBe("center");
    expect(
      Math.abs(geometry!.titleCenter - viewport.width / 2),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(geometry!.kickerCenter - viewport.width / 2),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(geometry!.metaCenter - viewport.width / 2),
    ).toBeLessThanOrEqual(1);
    expect(geometry!.titleOverflowX).not.toBe("hidden");
    expect(geometry!.titleOverflowY).not.toBe("hidden");
    expect(geometry!.buttonTop).toBeGreaterThan(viewport.height * 0.72);
    expect(geometry!.buttonBottom).toBeLessThanOrEqual(viewport.height - 4);
    expect(viewport.height - geometry!.buttonBottom).toBeGreaterThanOrEqual(18);
    expect(geometry!.artworkImage).toContain("backgroundwc");
    expect(geometry!.artworkPosition).toMatch(/80% (58|60)%/);
    expect(geometry!.artworkSize).not.toBe("cover");
    await expectNoPageOverflow(page);
  }

  await page.getByRole("button", { name: /begin the world cup/i }).click();
  await expect(
    page.getByRole("heading", { name: "GROUP STAGE" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /begin the world cup/i }),
  ).toHaveCount(0);

  const dashboardViewports = [
    ...phoneWidths.map((width) => ({ width, height: phoneHeights[width] })),
    { width: 390, height: 568 },
    { width: 390, height: 480 },
  ];

  for (const viewport of dashboardViewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
    });

    const dashboard = page.getByTestId("world-cup-group-dashboard");
    const fixture = page.getByTestId("world-cup-next-fixture");
    const road = page.getByTestId("world-cup-group-road");
    const standings = page.getByTestId("world-cup-standings");
    const restart = page.getByRole("button", {
      name: "Restart World Cup Run",
      exact: true,
    });
    const simulateMatch = fixture.getByRole("button", {
      name: /simulate match/i,
    });
    const simulateGroup = fixture.getByRole("button", {
      name: /simulate group/i,
    });
    const progressSteps = page
      .getByRole("navigation", { name: "Tournament progress" })
      .locator(":scope > div");
    const standingsRows = standings.locator(
      '[data-user="true"], [data-user="false"]',
    );

    await expect(dashboard).toBeVisible();
    await expect(fixture).toBeVisible();
    await expect(road).toBeVisible();
    await expect(standings).toBeVisible();
    await expect(restart).toBeVisible();
    await expect(simulateMatch).toBeVisible();
    await expect(simulateGroup).toBeVisible();
    await expect(progressSteps).toHaveCount(6);
    await expect(progressSteps.locator("b")).toHaveText([
      "GROUPS",
      "R32",
      "R16",
      "QF",
      "SF",
      "FINAL",
    ]);
    for (const label of await progressSteps.locator("b").all()) {
      await expect(label).toBeVisible();
    }
    await expect(progressSteps.first()).toHaveAttribute(
      "data-mobile-active",
      "true",
    );
    expect(
      await progressSteps
        .first()
        .evaluate((step) => getComputedStyle(step).color),
    ).toBe("rgb(244, 216, 107)");
    await expect(road.locator('[data-current="true"]')).toHaveCount(1);
    await expect(standingsRows).toHaveCount(4);
    await expect(standings.locator('[data-user="true"]')).toHaveCount(1);

    const geometry = await page.evaluate(() => {
      const bounds = (element: Element | null) => {
        if (!element) return null;
        const box = element.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
        };
      };
      const dashboard = document.querySelector(
        '[data-testid="world-cup-group-dashboard"]',
      );
      const standings = document.querySelector(
        '[data-testid="world-cup-standings"]',
      );
      const restart =
        document.querySelector('button[aria-label="Restart World Cup Run"]') ??
        Array.from(document.querySelectorAll("button")).find((button) =>
          button.textContent?.includes("RESTART"),
        ) ??
        null;
      const actions = document.querySelectorAll(
        '[data-testid="world-cup-next-fixture"] button',
      );
      const progress = document.querySelector(
        'nav[aria-label="Tournament progress"]',
      );
      const rows = standings?.querySelectorAll(
        '[data-user="true"], [data-user="false"]',
      );
      const lastRow = rows?.[rows.length - 1] ?? null;
      const shell = dashboard?.closest(".game-page");

      return {
        dashboard: bounds(dashboard),
        standings: bounds(standings),
        restart: bounds(restart),
        firstAction: bounds(actions[0] ?? null),
        secondAction: bounds(actions[1] ?? null),
        progress: bounds(progress),
        lastRow: bounds(lastRow),
        viewportHeight: window.innerHeight,
        shellMaxHeight: shell ? getComputedStyle(shell).maxHeight : "",
        shellOverflowY: shell ? getComputedStyle(shell).overflowY : "",
      };
    });

    expect(geometry.dashboard).not.toBeNull();
    expect(geometry.standings).not.toBeNull();
    expect(geometry.restart).not.toBeNull();
    expect(geometry.firstAction).not.toBeNull();
    expect(geometry.secondAction).not.toBeNull();
    expect(geometry.progress).not.toBeNull();
    expect(geometry.restart!.left).toBeGreaterThanOrEqual(0);
    expect(geometry.restart!.right).toBeLessThanOrEqual(viewport.width);
    expect(geometry.restart!.width).toBeGreaterThanOrEqual(40);
    expect(geometry.restart!.height).toBeGreaterThanOrEqual(40);
    expect(geometry.progress!.left).toBeGreaterThanOrEqual(0);
    expect(geometry.progress!.right).toBeLessThanOrEqual(viewport.width);
    expect(geometry.progress!.height).toBeLessThanOrEqual(42);
    expect(geometry.firstAction!.right).toBeLessThanOrEqual(
      geometry.secondAction!.left,
    );
    expect(geometry.shellMaxHeight).toBe("none");
    expect(geometry.shellOverflowY).not.toBe("hidden");
    await expectNoPageOverflow(page);

    if (
      geometry.lastRow &&
      geometry.lastRow.bottom > geometry.viewportHeight + 1
    ) {
      await standingsRows.last().scrollIntoViewIfNeeded();
      await expect(standingsRows.last()).toBeInViewport();
      const scrollState = await page.evaluate(() => {
        const dashboard = document.querySelector(
          '[data-testid="world-cup-group-dashboard"]',
        );
        const shell = dashboard?.closest(".game-page");
        const main = dashboard?.closest("main");
        return {
          window: window.scrollY,
          html: document.documentElement.scrollTop,
          body: document.body.scrollTop,
          shell: shell?.scrollTop ?? 0,
          main: main?.scrollTop ?? 0,
        };
      });
      expect(Math.max(...Object.values(scrollState))).toBeGreaterThan(0);
    } else {
      expect(geometry.lastRow).not.toBeNull();
      expect(geometry.lastRow!.bottom).toBeLessThanOrEqual(viewport.height);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
  });
  const road = page.getByTestId("world-cup-group-road");
  await expect(road.locator('[data-complete="true"]')).toHaveCount(0);
  await page.getByRole("button", { name: /simulate match/i }).click();
  await expect(road.locator('[data-complete="true"]')).toHaveCount(1);
  await page.getByRole("button", { name: /simulate group/i }).click();
  await expect(
    page.getByRole("button", { name: /simulate group/i }),
  ).toHaveCount(0);
  await expect(page).toHaveURL(/\/play\/world-cup-run$/);
  await expectNoPageOverflow(page);

  const enterRoundOf32 = page.getByRole("button", {
    name: /enter round of 32/i,
  });
  for (
    let attempt = 0;
    attempt < 6 && (await enterRoundOf32.count()) === 0;
    attempt += 1
  ) {
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "Restart World Cup Run", exact: true })
      .click();
    await expect(page.getByTestId("world-cup-group-dashboard")).toBeVisible();
    await page.getByRole("button", { name: /simulate group/i }).click();
  }
  await expect(enterRoundOf32).toBeVisible();
  await enterRoundOf32.click();
  await expect(
    page.getByText("WORLD CUP RUN · KNOCKOUT", { exact: true }),
  ).toBeVisible();

  const knockoutViewports = [
    ...phoneWidths.map((width) => ({ width, height: phoneHeights[width] })),
    { width: 390, height: 568 },
  ];

  for (const viewport of knockoutViewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
    });

    const browser = page.getByTestId("mobile-knockout-bracket");
    const roundTabs = browser.getByRole("navigation", {
      name: "Browse knockout rounds",
    });
    const cards = browser.locator("article");
    const userCard = browser.locator('article[data-user="true"]');
    const simulateMatch = page.getByRole("button", { name: /simulate match/i });
    const simulateRound = page.getByRole("button", { name: /simulate round/i });

    await expect(browser).toBeVisible();
    await expect(
      page.getByLabel("Full World Cup knockout bracket"),
    ).toBeHidden();
    await expect(roundTabs.getByRole("button")).toHaveCount(5);
    await expect(cards).toHaveCount(16);
    await expect(userCard).toHaveCount(1);
    await expect(simulateMatch).toBeVisible();
    await expect(simulateRound).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Restart World Cup Run", exact: true }),
    ).toBeVisible();

    const geometry = await page.evaluate(() => {
      const browser = document.querySelector(
        '[data-testid="mobile-knockout-bracket"]',
      );
      const tabs =
        browser?.querySelectorAll(
          'nav[aria-label="Browse knockout rounds"] button',
        ) ?? [];
      const actions = Array.from(document.querySelectorAll("button")).filter(
        (button) => /SIMULATE (MATCH|ROUND)/.test(button.textContent ?? ""),
      );
      const boxes = (elements: Element[]) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return {
            left: box.left,
            right: box.right,
            top: box.top,
            bottom: box.bottom,
          };
        });
      return {
        tabs: boxes(Array.from(tabs)),
        actions: boxes(actions),
        shellMaxHeight: browser?.closest(".game-page")
          ? getComputedStyle(browser.closest(".game-page")!).maxHeight
          : "",
      };
    });

    expect(geometry.tabs).toHaveLength(5);
    for (const box of geometry.tabs) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(viewport.width);
    }
    expect(geometry.actions).toHaveLength(2);
    expect(geometry.actions[0].right).toBeLessThanOrEqual(
      geometry.actions[1].left,
    );
    expect(geometry.shellMaxHeight).toBe("none");
    expect(
      await cards
        .locator("strong")
        .evaluateAll((names) =>
          names.every((name) => name.scrollWidth <= name.clientWidth + 1),
        ),
    ).toBe(true);
    expect(
      await userCard.evaluate((card) => getComputedStyle(card).boxShadow),
    ).not.toBe("none");
    await expectNoPageOverflow(page);

    await cards.last().scrollIntoViewIfNeeded();
    await expect(cards.last()).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
  });

  const browser = page.getByTestId("mobile-knockout-bracket");
  const roundTabs = browser.getByRole("navigation", {
    name: "Browse knockout rounds",
  });
  const rounds = [
    { name: /^R32/i, stage: "round-of-32", matches: 16 },
    { name: /^R16/i, stage: "round-of-16", matches: 8 },
    { name: /^QF/i, stage: "quarter-final", matches: 4 },
    { name: /^SF/i, stage: "semi-final", matches: 2 },
    { name: /^FINAL/i, stage: "final", matches: 1 },
  ];

  for (const round of rounds) {
    const tab = roundTabs.getByRole("button", { name: round.name });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-pressed", "true");
    await expect(browser).toHaveAttribute("data-stage", round.stage);
    await expect(browser.locator("article")).toHaveCount(round.matches);
  }

  await roundTabs.getByRole("button", { name: /^R32/i }).click();
  const knockoutSnapshot = await page.evaluate(() =>
    window.localStorage.getItem("trophy-xi-game-v1"),
  );
  expect(knockoutSnapshot).not.toBeNull();

  await page.getByRole("button", { name: /simulate match/i }).click();
  await expect(
    browser.locator('article[data-user="true"][data-complete="true"]'),
  ).toHaveCount(1);

  await page.evaluate((snapshot) => {
    window.localStorage.setItem("trophy-xi-game-v1", snapshot!);
  }, knockoutSnapshot);
  await page.reload();
  await expect(page.getByTestId("mobile-knockout-bracket")).toBeVisible();
  await page.getByRole("button", { name: /simulate round/i }).click();
  await expect
    .poll(async () => {
      const actionGone =
        (await page
          .getByRole("button", { name: /simulate round/i })
          .count()) === 0;
      const advanced =
        (await page
          .getByTestId("mobile-knockout-bracket")
          .getAttribute("data-stage")) !== "round-of-32";
      return actionGone || advanced;
    })
    .toBe(true);
  await expectNoPageOverflow(page);

  const eliminationStages = [
    {
      stage: "round-of-32",
      nextStage: "round-of-16",
      label: "R32",
      eyebrow: "ROUND OF 32",
      headline: "The journey ends in the Round of 32.",
    },
    {
      stage: "round-of-16",
      nextStage: "quarter-final",
      label: "R16",
      eyebrow: "ROUND OF 16",
      headline: "The journey ends in the Round of 16.",
    },
    {
      stage: "quarter-final",
      nextStage: "semi-final",
      label: "QF",
      eyebrow: "QUARTERFINAL",
      headline: "The dream ends in the quarterfinal.",
    },
    {
      stage: "semi-final",
      nextStage: "final",
      label: "SF",
      eyebrow: "SEMIFINAL",
      headline: "The dream ends in the semifinal.",
    },
    {
      stage: "final",
      nextStage: "complete",
      label: "FINAL",
      eyebrow: "WORLD CUP FINAL",
      headline: "So close to the trophy.",
    },
  ] as const;

  for (const exit of eliminationStages) {
    await page.evaluate(
      ({ snapshot, stage, nextStage }) => {
        const persisted = JSON.parse(snapshot!);
        persisted.state.worldCupRun.status = "eliminated";
        persisted.state.worldCupRun.currentStage = nextStage;
        persisted.state.worldCupRun.eliminatedStage = stage;
        persisted.state.worldCupRun.championTeamId = null;
        window.localStorage.setItem(
          "trophy-xi-game-v1",
          JSON.stringify(persisted),
        );
      },
      {
        snapshot: knockoutSnapshot,
        stage: exit.stage,
        nextStage: exit.nextStage,
      },
    );
    await page.reload();

    const loss = page.getByTestId("world-cup-loss");
    const progress = page.getByRole("navigation", {
      name: "Tournament progress",
    });
    const actualRound = progress.locator('[data-mobile-active="true"]');
    await expect(loss).toBeVisible();
    await expect(loss.getByText(exit.eyebrow, { exact: true })).toBeVisible();
    await expect(
      loss.getByRole("heading", { name: exit.headline }),
    ).toBeVisible();
    await expect(page.getByTestId("world-cup-loss-player")).toBeVisible();
    await expect(actualRound).toHaveCount(1);
    await expect(actualRound).toContainText(exit.label);
    await expect(actualRound).toHaveAttribute("data-active", "false");
    expect(
      await actualRound.evaluate((step) => getComputedStyle(step).color),
    ).toBe("rgb(244, 216, 107)");
    await expectNoPageOverflow(page);
  }

  for (const width of phoneWidths) {
    await page.setViewportSize({ width, height: phoneHeights[width] });
    await page.evaluate(() => window.scrollTo(0, 0));
    const loss = page.getByTestId("world-cup-loss");
    const headline = loss.getByRole("heading", {
      name: "So close to the trophy.",
    });
    const returnToMenu = page.getByRole("button", { name: /return to menu/i });
    await expect(loss).toBeVisible();
    await expect(headline).toBeVisible();
    expect(
      await headline.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
    if (width >= 390) {
      await expect(returnToMenu).toBeInViewport();
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight),
      ).toBeLessThanOrEqual(phoneHeights[width] + 1);
    }
    await returnToMenu.scrollIntoViewIfNeeded();
    await expect(returnToMenu).toBeVisible();
    await expectNoPageOverflow(page);
  }

  await page.evaluate((snapshot) => {
    const persisted = JSON.parse(snapshot!);
    const run = persisted.state.worldCupRun;
    run.status = "champion";
    run.currentStage = "complete";
    run.eliminatedStage = null;
    run.championTeamId = run.userTeamId;
    persisted.state.worldCupRun = run;
    window.localStorage.setItem("trophy-xi-game-v1", JSON.stringify(persisted));
  }, knockoutSnapshot);
  await page.reload();

  for (const viewport of [
    ...phoneWidths.map((width) => ({ width, height: phoneHeights[width] })),
    { width: 390, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    const victory = page.getByTestId("world-cup-victory");
    const headline = victory.getByRole("heading");
    await expect(victory).toBeVisible();
    await expect(
      victory.getByText("WORLD CHAMPIONS", { exact: true }),
    ).toBeVisible();
    await expect(headline).toContainText("Trophy XI");
    await expect(page.getByTestId("world-cup-victory-stats")).toBeHidden();
    await expect(page.getByTestId("world-cup-victory-art")).toBeVisible();
    expect(
      await headline.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
    const primaryAction = victory.getByRole("button", {
      name: /return to main screen/i,
    });
    const secondaryAction = victory.getByRole("button", {
      name: /view world cup run/i,
    });
    if (viewport.width >= 390 && viewport.height > 800) {
      await expect(primaryAction).toBeInViewport();
      await expect(secondaryAction).toBeInViewport();
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight),
      ).toBeLessThanOrEqual(viewport.height + 1);
    }
    await primaryAction.scrollIntoViewIfNeeded();
    await expect(primaryAction).toBeVisible();
    await expect(secondaryAction).toBeVisible();
    await expectNoPageOverflow(page);
  }
});

test("768px and desktop keep the protected landing and setup presentation", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440");

  for (const width of [768, 1440]) {
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 1000 });
    await page.goto("/");
    await expect(page.getByTestId("mobile-landing")).toBeHidden();
    await expect(page.getByTestId("desktop-landing")).toBeVisible();
    await expect(page.getByTestId("hero-showcase")).toBeVisible();
    await expect(page.locator(".hero-card h3")).toHaveText([
      "Lionel Messi",
      "Cristiano Ronaldo",
    ]);
    await expect(page.locator(".site-header")).toHaveCSS("position", "fixed");
    await expectNoPageOverflow(page);
  }

  await page.goto("/play");
  await expect(
    page.getByRole("heading", { name: /how will you build your xi/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Choose a game mode" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /free selection/i }),
  ).toBeVisible();
  const desktopWorldCup = page.getByRole("button", {
    name: /world cup run/i,
  });
  await expect(
    desktopWorldCup.getByText("FAN FAVORITE", { exact: true }),
  ).toBeVisible();
  await expect(desktopWorldCup).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("navigation", { name: "Game navigation" }),
  ).toBeHidden();

  await page.goto("/play/era");
  await expect(page.locator(".era-page")).toBeVisible();
  await expect(page.getByTestId("mobile-era-screen")).toBeHidden();

  for (const width of [768, 1440]) {
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 1000 });
    await page.goto("/database");
    await expect(page.getByTestId("database-hero")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Filters", exact: true }),
    ).toBeHidden();
    await expect(page.getByRole("combobox", { name: "Nation" })).toBeVisible();
    const desktopDatabase = await page.evaluate(() => {
      const hero = document.querySelector<HTMLElement>(
        '[data-testid="database-hero"]',
      );
      const grid = document.querySelector<HTMLElement>(
        '[data-testid="database-grid"]',
      );
      const firstCard = document.querySelector<HTMLElement>(
        '[data-testid="database-card"]',
      );
      return {
        heroHeight: hero?.getBoundingClientRect().height ?? 0,
        columns: grid
          ? getComputedStyle(grid).gridTemplateColumns
              .split(" ")
              .filter(Boolean).length
          : 0,
        cardHeight: firstCard?.getBoundingClientRect().height ?? 0,
      };
    });
    expect(desktopDatabase.heroHeight).toBeGreaterThanOrEqual(276);
    expect(desktopDatabase.columns).toBe(width === 768 ? 3 : 5);
    expect(desktopDatabase.cardHeight).toBeGreaterThanOrEqual(266);
    await expectNoPageOverflow(page);
  }
});
