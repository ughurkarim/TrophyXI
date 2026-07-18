import { expect, test } from "@playwright/test";

test("completes the 1970s World Cup gauntlet with a bench and two respins", async ({
  page,
}) => {
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
      window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    }, options);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(filename),
      animations: "disabled",
    });
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
  await page.getByRole("button", { name: /choose 1970s/i }).click();

  await expect(
    page.getByRole("heading", { name: /choose the mind behind the xi/i }),
  ).toBeVisible();
  await expect(page.locator(".manager-card")).toHaveCount(3);
  await expect(page.locator(".manager-card__grades").first()).toContainText("OFF");
  await expect(page.locator(".manager-card__grades").first()).toContainText("DEF");
  const managerName = (
    await page.locator(".manager-card h2").first().textContent()
  )!;
  await page.getByRole("button", { name: /^Choose /i }).first().click();

  await expect(
    page.getByRole("heading", { name: /give the manager a system/i }),
  ).toBeVisible();
  await expect(page.locator(".formation-card")).toHaveCount(4);
  await page.locator(".formation-card").first().click();
  await page.getByRole("button", { name: /enter the draft/i }).click();
  await expect(page).toHaveURL(/\/play\/draft$/);

  for (let index = 0; index < 11; index += 1) {
    const emptyNodes = page.locator(
      '.draft-pitch-panel .pitch-node--interactive[aria-label*="empty"]',
    );
    const node = emptyNodes.last();
    const nodeHandle = await node.elementHandle();
    const coordinatesBefore = await nodeHandle?.evaluate((element) => ({
      left: (element as HTMLElement).style.left,
      top: (element as HTMLElement).style.top,
      x: (element as HTMLElement).dataset.slotX,
      y: (element as HTMLElement).dataset.slotY,
    }));
    await node.click();
    const coordinatesAfter = await nodeHandle?.evaluate((element) => ({
      left: (element as HTMLElement).style.left,
      top: (element as HTMLElement).style.top,
      x: (element as HTMLElement).dataset.slotX,
      y: (element as HTMLElement).dataset.slotY,
    }));
    expect(coordinatesAfter).toEqual(coordinatesBefore);

    const choices = page.getByRole("button", { name: /draft .* rated/i });
    await expect(choices).toHaveCount(3);
    if (index === 0) {
      await page.getByRole("button", { name: "RESPINS ×2" }).click();
      await page.getByRole("button", { name: /confirm respin/i }).click();
      await expect(page.getByRole("button", { name: "RESPINS ×1" })).toBeVisible();
      await expect(page.locator(".draft-card-grid > div").first()).toHaveCSS(
        "opacity",
        "1",
      );
      await captureState("02-starter-draft.png", {
        focusDraftChoices: true,
      });
    }
    await choices.first().click();
    await expect(
      page.getByLabel(`${index + 1} of 14 players drafted`),
    ).toBeVisible();

    if (index === 2) {
      await page.reload();
      await expect(page.getByLabel("3 of 14 players drafted")).toBeVisible();
    }
  }

  await page.getByRole("button", { name: /draft the bench/i }).click();
  await captureState("03-bench-draft.png", {
    focusDraftChoices: true,
  });
  for (let index = 0; index < 3; index += 1) {
    const choices = page.getByRole("button", { name: /draft .* rated/i });
    await expect(choices).toHaveCount(3);
    if (index === 1) {
      await page.getByRole("button", { name: "RESPINS ×1" }).click();
      await page.getByRole("button", { name: /confirm respin/i }).click();
      await expect(page.getByRole("button", { name: "RESPINS USED" })).toBeDisabled();
    }
    await choices.first().click();
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
  await page
    .getByRole("button", { name: /choose historical opponent/i })
    .click();

  await expect(
    page.getByRole("heading", { name: /choose a nation-year opponent/i }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Tournament year" })
    .selectOption("1970");
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
  await expect(page.getByText(/era translation applies in both directions/i)).toBeVisible();
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
