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
    "Pelé",
    "Lionel Messi",
    "Cristiano Ronaldo",
  ]);
  await expect(page.locator(".champion-country strong").first()).toContainText(
    "ARG 🇦🇷",
  );
  await expect(page.locator(".champion-country h3").first()).toHaveText(
    "Argentina",
  );

  const showcase = page.getByTestId("hero-showcase");
  const bounds = await showcase.boundingBox();
  expect(bounds).not.toBeNull();
  if (bounds) {
    for (let index = 0; index < 8; index += 1) {
      await page.mouse.move(
        index % 2 ? bounds.x + bounds.width : bounds.x,
        index % 2 ? bounds.y + bounds.height : bounds.y,
      );
      await page.waitForTimeout(35);
      const transform = await showcase.evaluate(
        (element) => window.getComputedStyle(element).transform,
      );
      const values = transform
        .replace(/^matrix3d\(|^matrix\(|\)$/g, "")
        .split(",")
        .map(Number);
      const x = values.length === 16 ? values[12] : values[4] ?? 0;
      const y = values.length === 16 ? values[13] : values[5] ?? 0;
      expect(Math.abs(x)).toBeLessThanOrEqual(8.2);
      expect(Math.abs(y)).toBeLessThanOrEqual(6.2);
    }
  }

  await page.goto("/database");
  await expect(
    page.getByRole("heading", { name: "Player Database" }),
  ).toBeVisible();
  await captureState("00-database.png");
  await expect(page.getByText("310", { exact: true }).first()).toBeVisible();
  const databaseSearch = page.getByPlaceholder("Search player or nation");
  await databaseSearch.fill("Bastian Schweinsteiger");
  const longNameCard = page.getByRole("button", {
    name: /view bastian schweinsteiger .* photo pending/i,
  });
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
      name: /view lionel messi 2014, rated 96, photo pending/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /view lionel messi 2022, rated 99, photo pending/i,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: /view lionel messi 2014, rated 96, photo pending/i,
    })
    .click();
  const databasePlayerDialog = page.getByRole("dialog");
  await expect(databasePlayerDialog.getByText("PHOTO STATUS")).toBeVisible();
  await expect(
    databasePlayerDialog.getByText(/remains fully draftable/i),
  ).toBeVisible();
  await expect(databasePlayerDialog.getByText("TOP 100 PLAYER")).toBeVisible();
  await expect(
    databasePlayerDialog.getByText("Trophy XI Curated Top 100"),
  ).toBeVisible();
  await expect(
    databasePlayerDialog.getByText("2× World Cup Golden Ball"),
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
    page.getByRole("heading", { name: /choose the match environment/i }),
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
    page.getByRole("heading", { name: /choose the mind behind the xi/i }),
  ).toBeVisible();
  await expect(page.locator(".manager-card")).toHaveCount(5);
  await expect(
    page.locator('.manager-card .circular-portrait[data-photo-status="pending"]'),
  ).toHaveCount(5);
  await expect(page.getByText("PLAYER RESPINS ×2")).toBeVisible();
  await captureState("01-manager-five.png");
  const originalManagerNames = await page
    .locator(".manager-card h2")
    .allTextContents();
  await page
    .getByRole("button", { name: "MANAGER RESPIN ×1" })
    .click();
  await expect(
    page.getByRole("dialog", {
      name: /replace all five manager choices/i,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: /use manager respin/i }).click();
  const replacementManagerNames = await page
    .locator(".manager-card h2")
    .allTextContents();
  expect(replacementManagerNames).toHaveLength(5);
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
  expect(
    managerGradeLabels.some((label) => /offense [BC]/i.test(label)),
  ).toBe(true);
  const managerInspect = page
    .getByRole("button", { name: /view manager record/i })
    .first();
  await managerInspect.click();
  const managerDialog = page.getByRole("dialog");
  await expect(managerDialog.getByText("TOURNAMENT MODEL")).toBeVisible();
  await expect(managerDialog.getByText("TACTICAL FIT")).toBeVisible();
  await expect(managerDialog.getByText("TROPHY XI MANAGER TAGS")).toBeVisible();
  await expect(managerDialog.getByText("PHOTO STATUS")).toBeVisible();
  await expect(
    managerDialog.locator('.circular-portrait[data-photo-status="pending"]'),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(managerInspect).toBeFocused();
  const managerName = (
    await page.locator(".manager-card h2").first().textContent()
  )!;
  await page.getByRole("button", { name: /^Choose /i }).first().click();

  await expect(
    page.getByRole("heading", { name: /give the manager a system/i }),
  ).toBeVisible();
  await expect(page.locator(".formation-card")).toHaveCount(4);
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
  await page.getByRole("button", { name: /enter the draft/i }).click();
  await expect(page).toHaveURL(/\/play\/draft$/);
  await expect(page.getByText("PLAYER RESPINS ×2").first()).toBeVisible();
  await expect(page.getByText("SQUAD ARCHIVE")).toBeVisible();
  const chemistryHud = page.locator(".chemistry-preview-hud");
  await expect(chemistryHud).toHaveAttribute(
    "aria-label",
    /current chemistry \d+/i,
  );

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
  await expect(page.getByText("CAREER ACCOLADES").first()).toBeVisible();
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
  await expect(page.locator(".pitch-node--fit-yellow").first()).toBeVisible();
  await expect(page.locator(".pitch-node--fit-red").first()).toBeVisible();
  await expect(
    page.locator(".pitch-node--fit-incompatible").first(),
  ).toBeVisible();
  await expect(
    page.locator(".pitch-node__fit i").filter({ hasText: "−" }).first(),
  ).toBeVisible();
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
  const selectedTagEffects = page
    .locator(".selected-player-summary")
    .getByText("PLAYER TAG EFFECTS");
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
  const firstSquadPlayer = page
    .locator(".squad-strip .squad-chip--filled")
    .first();
  await firstSquadPlayer.click();
  const playerDialog = page.getByRole("dialog");
  await expect(playerDialog.getByText("TROPHY XI FIT")).toBeVisible();
  await expect(playerDialog.getByText("PLAYER TAG EFFECTS")).toBeVisible();
  await expect(playerDialog.getByText("CAREER ACCOLADES")).toBeVisible();
  await expect(playerDialog.getByText("PHOTO STATUS")).toBeVisible();
  await expect(playerDialog.locator(".player-status")).toBeVisible();
  await expect(playerDialog.locator(".circular-portrait")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(firstSquadPlayer).toBeFocused();
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
  const championsToggle = page.getByRole("switch", {
    name: "Champions Only",
  });
  await expect(championsToggle).toBeChecked();
  const championYears = await page
    .locator(".historical-opponents .opponent-card__title b")
    .allTextContents();
  expect(championYears.map(Number)).toEqual(
    championYears.map(Number).sort((first, second) => second - first),
  );
  const yearOptions = await page
    .getByRole("combobox", { name: "Tournament year" })
    .locator("option")
    .allTextContents();
  expect(yearOptions.slice(1)).toEqual([
    "2026",
    "2022",
    "2018",
    "2014",
    "2010",
    "2006",
    "2002",
    "1998",
    "1994",
    "1990",
    "1986",
    "1982",
    "1978",
    "1974",
    "1970",
  ]);
  await championsToggle.click();
  await expect(championsToggle).not.toBeChecked();
  await page
    .getByRole("combobox", { name: "Tournament year" })
    .selectOption("1970");
  await expect(
    page.getByRole("button", { name: /select belgium 1970/i }),
  ).toBeVisible();
  await championsToggle.click();
  await expect(championsToggle).toBeChecked();
  await page
    .getByRole("button", { name: /select brazil 1970/i })
    .click();
  await captureState("05-opponents.png");
  await page.getByRole("button", { name: /enter the tunnel/i }).click();

  await expect(page).toHaveURL(/\/match$/);
  await expect(
    page.getByRole("heading", { name: "Brazil", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/historical opponent · champion/i)).toBeVisible();
  await expect(page.getByText(/opponent era translation/i)).toBeVisible({
    timeout: 3_000,
  });
  const simulate = page.getByRole("button", { name: /simulate match/i });
  await expect(simulate).toBeEnabled({ timeout: 3_000 });
  await simulate.click();
  await expect(page.getByText(/match engine live/i)).toBeVisible();
  await page.getByRole("button", { name: "Fast forward" }).click();
  await expect(
    page.getByRole("heading", {
      name: new RegExp(`${managerName} adjusts the shape`, "i"),
    }),
  ).toBeVisible({ timeout: 8_000 });
  await page.getByRole("button", { name: /skip to result/i }).click();

  await expect(page).toHaveURL(/\/result$/);
  await expect(page.getByText("MATCH STATISTICS")).toBeVisible();
  await expect(page.getByText(/manager impact:/i)).toBeVisible();
  await expect(page.locator(".squad-minutes__table article")).toHaveCount(14);
  await expect(
    page.locator(".squad-minutes__table article").filter({ hasText: /% fit/ }),
  ).toHaveCount(11);
  await expect(
    page.getByText(/era translation applies in both directions/i),
  ).toBeVisible();
  await expect(page.getByText(/brazil 1970/i).first()).toBeVisible();
  await captureState("06-result.png");

  await page.goto("/credits");
  await expect(
    page.getByRole("heading", { name: /archive with a paper trail/i }),
  ).toBeVisible();
  await expect(page.getByText(/0 active local png masters/i)).toBeVisible();
  await expect(page.getByText(/0 exact-year player faces/i)).toBeVisible();
  await expect(page.getByText(/0 exact-year manager faces/i)).toBeVisible();
  await expect(page.getByText(/310 photo-pending player cards/i)).toBeVisible();
  await expect(page.getByText(/28 photo-pending manager cards/i)).toBeVisible();
  await expect(page.locator(".attribution-list article")).toHaveCount(0);
});
