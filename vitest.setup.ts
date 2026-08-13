import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import englishMessages from "./messages/en.json";

vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl")>();
  const translator = actual.createTranslator({
    locale: "en",
    messages: englishMessages,
  }) as unknown as (key: string, values?: Record<string, string | number | Date>) => string;

  return {
    ...actual,
    useLocale: () => "en",
    useMessages: () => englishMessages,
    useTranslations: (namespace?: string) =>
      (key: string, values?: Record<string, string | number | Date>) =>
        translator(namespace ? `${namespace}.${key}` : key, values),
  };
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => undefined,
});

const memoryStorage = (() => {
  let values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => {
      values = new Map();
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: memoryStorage,
});

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: memoryStorage,
});

vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({
    ok: false,
    json: async () => ({}),
  }),
);
