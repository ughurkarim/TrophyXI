import { expect, test } from "@playwright/test";

const expectedAccentByEra = {
  "2020s": "#59c7d8",
  "2010s": "#a786d8",
  "2000s": "#d7b64d",
  "1990s": "#c98a45",
  "1980s": "#b86655",
  "1970s": "#a6a39a",
  "Neutral / All Eras": "#e5cf79",
} as const;

test("era choices remain compact, distinct, and accessible", async ({
  page,
}, testInfo) => {
  await page.goto("/play/era");

  await expect(
    page.getByRole("heading", { name: "Choose your era." }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "The era sets the style and conditions of the match. Every player remains available, but their pace, technique, physicality, tactics, and overall fit may translate differently.",
    ),
  ).toBeVisible();

  const cards = page.locator(".era-card");
  await expect(cards).toHaveCount(7);
  await expect(page.getByText(/draftable cards available/i)).toHaveCount(0);
  await expect(page.getByText(/photo pending/i)).toHaveCount(0);

  const layout = await cards.evaluateAll((elements) => {
    const boxes = elements.map((element) => {
      const bounds = element.getBoundingClientRect();
      const description = element.querySelector("p");
      return {
        top: Math.round(bounds.top),
        right: bounds.right,
        bottom: bounds.bottom,
        left: bounds.left,
        descriptionClipped: description
          ? description.scrollHeight > description.clientHeight + 1
          : true,
        decorativeContent: getComputedStyle(element, "::after").content,
      };
    });

    return {
      boxes,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: window.innerHeight,
    };
  });

  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.boxes.every((box) => !box.descriptionClipped)).toBe(true);
  expect(
    layout.boxes.every(
      (box) =>
        box.decorativeContent === "none" ||
        box.decorativeContent === "normal" ||
        box.decorativeContent === '""',
    ),
  ).toBe(true);

  for (let first = 0; first < layout.boxes.length; first += 1) {
    for (let second = first + 1; second < layout.boxes.length; second += 1) {
      const a = layout.boxes[first];
      const b = layout.boxes[second];
      const overlaps =
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top;
      expect(overlaps).toBe(false);
    }
  }

  const rowCounts = Object.values(
    layout.boxes.reduce<Record<string, number>>((rows, box) => {
      rows[box.top] = (rows[box.top] ?? 0) + 1;
      return rows;
    }, {}),
  );

  if (testInfo.project.name === "desktop-1440") {
    expect(rowCounts).toEqual([4, 3]);
    expect(layout.boxes.every((box) => box.bottom <= layout.viewportHeight)).toBe(
      true,
    );
  } else if (testInfo.project.name === "tablet-768") {
    expect(rowCounts).toEqual([3, 3, 1]);
  } else {
    expect(rowCounts).toEqual([1, 1, 1, 1, 1, 1, 1]);
  }

  for (const [era, accent] of Object.entries(expectedAccentByEra)) {
    const card = page.getByRole("button", {
      name: new RegExp(`^Choose ${era.replaceAll("/", "\\/")},`, "i"),
    });
    await expect(card).toBeVisible();
    expect(
      await card.evaluate((element) =>
        getComputedStyle(element)
          .getPropertyValue("--era-accent")
          .trim()
          .toLowerCase(),
      ),
    ).toBe(accent);
  }

  const firstCard = cards.first();
  await firstCard.focus();
  await expect(firstCard).toBeFocused();
  expect(
    await firstCard.evaluate(
      (element) => getComputedStyle(element).outlineStyle,
    ),
  ).not.toBe("none");
  await expect(firstCard.getByText("Select era")).toBeVisible();
});

test("era cards preserve a text selection state and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/play/era");

  const card = page.getByRole("button", {
    name: /^Choose 1970s,/i,
  });
  await expect(card).toBeVisible();
  expect(
    await card.evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe("0s");

  await card.click();
  await expect(page).toHaveURL(/\/play\/manager$/);
  await page.goBack();

  const selectedCard = page.getByRole("button", {
    name: /^Choose 1970s,/i,
  });
  await expect(selectedCard).toHaveAttribute("aria-pressed", "true");
  await expect(selectedCard.getByText("Selected")).toBeVisible();
});
