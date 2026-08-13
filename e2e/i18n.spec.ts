import { expect, test } from "@playwright/test";
import ar from "../messages/ar.json";
import de from "../messages/de.json";
import en from "../messages/en.json";
import es from "../messages/es.json";
import fr from "../messages/fr.json";
import it from "../messages/it.json";
import ptBR from "../messages/pt-BR.json";
import ru from "../messages/ru.json";

const localeCases = [
  ["en", "English", en],
  ["es", "Español", es],
  ["fr", "Français", fr],
  ["ru", "Русский", ru],
  ["de", "Deutsch", de],
  ["it", "Italiano", it],
  ["ar", "العربية", ar],
] as const;

test("same-page locale sequence updates the complete landing shell without a browser reload", async ({ context, page }) => {
  await context.addCookies([{ name: "trophy-xi-locale", value: "pt-BR", domain: "127.0.0.1", path: "/" }]);
  await page.goto("/");
  await page.evaluate(() => {
    (window as typeof window & { __localeSwitchSentinel?: string }).__localeSwitchSentinel = "alive";
  });

  const mobile = page.viewportSize()!.width < 768;
  const heroLocaleMarker = mobile
    ? page.locator("#mobile-hero-title")
    : page.locator(".hero__copy > .eyebrow");
  const expectedLandingText = (messages: typeof en) => mobile
    ? `${messages.landing.mobile.build}${messages.landing.mobile.beat}`
    : messages.landing.eyebrow;

  await expect(heroLocaleMarker).toContainText(expectedLandingText(ptBR));
  let previousText = expectedLandingText(ptBR);

  for (const [locale, nativeName, messages] of localeCases) {
    await page.locator('button[aria-haspopup="listbox"]:visible').click();
    await page.getByRole("option", { name: nativeName, exact: true }).click();

    const nextText = expectedLandingText(messages as typeof en);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(heroLocaleMarker).toContainText(nextText);
    if (previousText !== nextText) await expect(heroLocaleMarker).not.toContainText(previousText);
    expect(await page.evaluate(() => (window as typeof window & { __localeSwitchSentinel?: string }).__localeSwitchSentinel)).toBe("alive");
    previousText = nextText;
  }

  await page.locator('button[aria-haspopup="listbox"]:visible').click();
  await page.getByRole("option", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(heroLocaleMarker).toContainText(expectedLandingText(en));
});

test("language menu stays above content and switching preserves the active game page", async ({ page }) => {
  await page.goto("/play");
  await page.evaluate(() => {
    (window as typeof window & { __localeSwitchSentinel?: string }).__localeSwitchSentinel = "alive";
    localStorage.setItem("trophyxi-i18n-qa", "preserved");
  });

  const trigger = page.getByRole("button", { name: "Select language" }).first();
  await trigger.click();
  const menu = page.getByRole("listbox", { name: "Language" });
  await expect(menu).toBeVisible();

  const box = await menu.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);

  await page.getByRole("option", { name: "العربية" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page).toHaveURL(/\/play$/);
  expect(await page.evaluate(() => (window as typeof window & { __localeSwitchSentinel?: string }).__localeSwitchSentinel)).toBe("alive");
  expect(await page.evaluate(() => localStorage.getItem("trophyxi-i18n-qa"))).toBe("preserved");

  await page.getByRole("button", { name: "اختيار اللغة" }).first().click();
  await page.getByRole("option", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("Arabic keeps the fixed landing card composition", async ({ context, page }) => {
  await context.addCookies([{ name: "trophy-xi-locale", value: "ar", domain: "127.0.0.1", path: "/" }]);
  await page.goto("/");
  const mobile = page.viewportSize()!.width < 768;
  const messi = mobile ? page.locator('[data-player-id="lionel-messi-2026"]') : page.locator('[data-side="messi"]');
  const ronaldo = mobile ? page.locator('[data-player-id="lamine-yamal-2026"]') : page.locator('[data-side="ronaldo"]');
  await expect(messi).toBeVisible();
  await expect(ronaldo).toBeVisible();
  const messiBox = await messi.boundingBox();
  const ronaldoBox = await ronaldo.boundingBox();
  expect(messiBox!.x).toBeLessThan(ronaldoBox!.x);
});
