import { expect, test } from "@playwright/test";

test("completes a Modern Masters identity-safe draft and opens credits", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /build your xi/i }).first().click();

  await expect(
    page.getByRole("heading", { name: /choose your football era/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /choose modern masters/i }).click();

  await expect(
    page.getByRole("heading", { name: /choose the mind behind the xi/i }),
  ).toBeVisible();
  await expect(page.locator(".manager-card")).toHaveCount(3);
  const originalManagers = await page
    .locator(".manager-card h2")
    .allTextContents();
  await page.getByRole("button", { name: /respin all three/i }).click();
  await page.getByRole("button", { name: /confirm manager respin/i }).click();
  const respunManagers = await page.locator(".manager-card h2").allTextContents();
  expect(respunManagers).toHaveLength(3);
  expect(respunManagers.every((name) => !originalManagers.includes(name))).toBe(
    true,
  );
  const managerName = (await page.locator(".manager-card h2").first().textContent())!;
  await page.getByRole("button", { name: /^Choose /i }).first().click();

  await expect(
    page.getByRole("heading", { name: /give the manager a system/i }),
  ).toBeVisible();
  const formation = page.getByRole("button", { name: /4–3–3/i });
  await formation.click();
  await expect(formation).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /enter the draft/i }).click();
  await expect(page).toHaveURL(/\/play\/draft$/);

  const slotOrder = [
    "ST",
    "GK",
    "CM",
    "LW",
    "LB",
    "RW",
    "LCB",
    "RCM",
    "RB",
    "LCM",
    "RCB",
  ];

  for (let index = 0; index < slotOrder.length; index += 1) {
    await page
      .getByRole("button", {
        name: new RegExp(`^${slotOrder[index]}: empty`),
      })
      .click();
    const choices = page.getByRole("button", { name: /draft .* rated/i });
    await expect(choices).toHaveCount(3);
    await choices.first().click();
    await expect(
      page.getByLabel(`${index + 1} of 11 players drafted`),
    ).toBeVisible();

    if (index === 2) {
      await page.reload();
      await expect(page.getByLabel("3 of 11 players drafted")).toBeVisible();
    }
  }

  await page.getByRole("button", { name: /face the champion/i }).click();
  await expect(page).toHaveURL(/\/match$/);
  const simulate = page.getByRole("button", { name: /simulate match/i });
  await expect(simulate).toBeEnabled();
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
  await expect(page.getByText("Tactical fit", { exact: true })).toBeVisible();
  await expect(page.getByText(/manager impact:/i)).toBeVisible();
  await expect(
    page.getByText("Spain 2010", { exact: true }).first(),
  ).toBeVisible();

  await page.goto("/credits");
  await expect(
    page.getByRole("heading", { name: /archive with a paper trail/i }),
  ).toBeVisible();
  await expect(page.getByText(/268 local png masters/i)).toBeVisible();
  await expect(page.getByText(/intentional illustrations/i)).toBeVisible();
});
