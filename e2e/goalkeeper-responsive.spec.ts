import { expect, test } from "@playwright/test";

test("goalkeeper preview and placement preserve safe 3-5-2 geometry", async ({
  page,
}) => {
  test.setTimeout(60_000);

  await page.goto("/play/era");
  await page.getByRole("button", { name: /choose neutral/i }).click();
  await expect(
    page.getByRole("heading", { name: /choose your manager/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^choose /i }).first().click();
  await page
    .getByRole("button", { name: /continue with/i })
    .click();
  await expect(
    page.getByRole("heading", { name: "Choose your system." }),
  ).toBeVisible();
  await page.locator(".formation-card").first().click();
  await page.getByRole("button", { name: "ENTER DRAFT →" }).click();
  await expect(page.getByLabel("0 of 14 players drafted")).toBeVisible();

  await page.evaluate(() => {
    const key = "trophy-xi-game-v1";
    const saved = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    saved.state = {
      ...saved.state,
      formationId: "3-5-2",
      selectedPlayerId: null,
      selectedSlotId: null,
      projectedPositionFits: [],
      optionIds: [
        "manuel-neuer-2014",
        "lionel-messi-2014",
        "cristiano-ronaldo-2014",
        "sergio-ramos-2014",
        "luka-modric-2014",
      ],
    };
    window.localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload();

  const goalkeeperCard = page
    .locator(".draft-card-grid .player-card")
    .filter({
      has: page
        .locator(".player-rating span")
        .filter({ hasText: /^GK$/ }),
    })
    .first();
  await expect(goalkeeperCard).toBeVisible();
  await goalkeeperCard.locator(".player-card__pick-target").click();

  const goalkeeperSlot = page.getByRole("button", {
    name: /^GK\. Perfect Fit, 100 percent/i,
  });
  await expect(goalkeeperSlot).toBeVisible();
  await expect(goalkeeperSlot).toHaveAttribute("aria-disabled", "false");
  await expect(page.getByText("−0%", { exact: true })).toHaveCount(0);

  const geometry = async () =>
    goalkeeperSlot.evaluate((node) => {
      const pitch = node.closest(".pitch")!;
      const pitchBounds = pitch.getBoundingClientRect();
      const nodeBounds = node.getBoundingClientRect();
      const discBounds = node
        .querySelector(".pitch-node__disc")!
        .getBoundingClientRect();
      const fitBounds = node
        .querySelector(".pitch-node__fit")!
        .getBoundingClientRect();
      const overlaps = (first: DOMRect, second: DOMRect) =>
        first.left < second.right - 1 &&
        first.right > second.left + 1 &&
        first.top < second.bottom - 1 &&
        first.bottom > second.top + 1;
      const otherNodes = [
        ...pitch.querySelectorAll<HTMLElement>(".pitch-node"),
      ].filter((candidate) => candidate !== node);
      return {
        style: {
          left: (node as HTMLElement).style.left,
          top: (node as HTMLElement).style.top,
          x: (node as HTMLElement).dataset.slotX,
          y: (node as HTMLElement).dataset.slotY,
        },
        center: {
          x: Math.round(
            ((nodeBounds.left + nodeBounds.width / 2 - pitchBounds.left) /
              pitchBounds.width) *
              1000,
          ),
          y: Math.round(
            ((nodeBounds.top + nodeBounds.height / 2 - pitchBounds.top) /
              pitchBounds.height) *
              1000,
          ),
        },
        size: {
          width: Math.round(discBounds.width),
          height: Math.round(discBounds.height),
        },
        nodeInside:
          nodeBounds.left >= pitchBounds.left - 1 &&
          nodeBounds.right <= pitchBounds.right + 1 &&
          nodeBounds.top >= pitchBounds.top - 1 &&
          nodeBounds.bottom <= pitchBounds.bottom + 1,
        fitInside:
          fitBounds.left >= pitchBounds.left - 1 &&
          fitBounds.right <= pitchBounds.right + 1 &&
          fitBounds.top >= pitchBounds.top - 1 &&
          fitBounds.bottom <= pitchBounds.bottom + 1,
        fitAbove: fitBounds.bottom <= nodeBounds.top + 1,
        fitOverlapsAnotherNode: otherNodes.some((candidate) =>
          overlaps(
            fitBounds,
            candidate
              .querySelector(".pitch-node__disc")!
              .getBoundingClientRect(),
          ),
        ),
        fitOverlapsAnotherLabel: otherNodes.some((candidate) => {
          const label = candidate.querySelector(".pitch-node__fit");
          return label
            ? overlaps(fitBounds, label.getBoundingClientRect())
            : false;
        }),
      };
    });

  const beforeInteraction = await geometry();
  expect(beforeInteraction).toMatchObject({
    style: { left: "50%", top: "91%", x: "50", y: "91" },
    size: {
      width: beforeInteraction.size.width,
      height: beforeInteraction.size.height,
    },
    nodeInside: true,
    fitInside: true,
    fitAbove: true,
    fitOverlapsAnotherNode: false,
    fitOverlapsAnotherLabel: false,
  });
  expect(beforeInteraction.center.x).toBe(500);
  expect(beforeInteraction.center.y).toBeGreaterThanOrEqual(907);
  expect(beforeInteraction.center.y).toBeLessThanOrEqual(912);
  expect(beforeInteraction.size.width).toBe(beforeInteraction.size.height);

  await goalkeeperSlot.hover();
  await goalkeeperSlot.focus();
  const afterInteraction = await geometry();
  expect(afterInteraction.style).toEqual(beforeInteraction.style);
  expect(afterInteraction.center).toEqual(beforeInteraction.center);
  expect(afterInteraction.size).toEqual(beforeInteraction.size);

  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("goalkeeper-preview.png"),
    animations: "disabled",
    fullPage: false,
  });

  await goalkeeperSlot.click();
  await expect(page.getByLabel("1 of 14 players drafted")).toBeVisible();
  const placedGoalkeeper = page.getByLabel(/^GK: Manuel Neuer 2014/i);
  await expect(placedGoalkeeper).toBeVisible();
  await expect(placedGoalkeeper).toHaveAttribute("data-slot-x", "50");
  await expect(placedGoalkeeper).toHaveAttribute("data-slot-y", "91");
  const placedGeometry = await placedGoalkeeper.evaluate((node) => {
    const pitchBounds = node.closest(".pitch")!.getBoundingClientRect();
    const nodeBounds = node.getBoundingClientRect();
    const discBounds = node
      .querySelector(".pitch-node__disc")!
      .getBoundingClientRect();
    return {
      style: {
        left: (node as HTMLElement).style.left,
        top: (node as HTMLElement).style.top,
      },
      center: {
        x: Math.round(
          ((nodeBounds.left + nodeBounds.width / 2 - pitchBounds.left) /
            pitchBounds.width) *
            1000,
        ),
        y: Math.round(
          ((nodeBounds.top + nodeBounds.height / 2 - pitchBounds.top) /
            pitchBounds.height) *
            1000,
        ),
      },
      size: {
        width: Math.round(discBounds.width),
        height: Math.round(discBounds.height),
      },
    };
  });
  expect(placedGeometry).toEqual({
    style: { left: "50%", top: "91%" },
    center: beforeInteraction.center,
    size: beforeInteraction.size,
  });
  await page.screenshot({
    path: test.info().outputPath("goalkeeper-placed.png"),
    animations: "disabled",
    fullPage: false,
  });
});
