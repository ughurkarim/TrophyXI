import { expect, test } from "@playwright/test";

test("completes the player-first World Cup gauntlet with separate respins", async ({
  page,
}) => {
  test.setTimeout(90_000);

  const captureState = async (
    filename: string,
    options: { focusDraftChoices?: boolean } = {},
  ) => {
    await page.evaluate(({ focusDraftChoices }) => {
      const choices = document.querySelector<HTMLElement>(".draft-choices");
      const statusbar = document.querySelector<HTMLElement>(".draft-statusbar");
      const focusChoices =
        focusDraftChoices && window.innerWidth <= 900 && choices;
      const stickyOffset =
        window.innerWidth <= 700 ? (statusbar?.offsetHeight ?? 0) + 8 : 0;
      const top = focusChoices
        ? choices.getBoundingClientRect().top + window.scrollY - stickyOffset
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
  await expect(page.locator(".manager-card")).toHaveCount(3);
  await expect(page.getByText("PLAYER RESPINS ×2")).toBeVisible();
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

  await expect(playerChoices()).toHaveCount(5);
  await playerChoices().nth(1).click();
  await expect(page.getByLabel("0 of 14 players drafted")).toBeVisible();
  await expect(page.locator(".pitch-node--fit-green").first()).toBeVisible();
  await expect(
    page.locator(".pitch-node--fit-yellow, .pitch-node--fit-red").first(),
  ).toBeVisible();
  await expect(
    page.locator(".pitch-node__fit i").filter({ hasText: "−" }).first(),
  ).toBeVisible();
  await captureState("02-player-selected.png", {
    focusDraftChoices: true,
  });
  await page
    .getByRole("button", { name: /cancel selection/i })
    .first()
    .click();
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

  for (let index = 0; index < 11; index += 1) {
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
    page.getByRole("heading", { name: /brazil.*1970/i }),
  ).toBeVisible();
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
  await expect(page.getByText(/338 local png masters/i)).toBeVisible();
  await expect(page.getByText(/licensed photographs/i).first()).toBeVisible();
  await expect(page.getByText(/intentional illustrations/i)).toBeVisible();
});
