export type RandomSource = () => number;

export const createSeededRandom = (seed: number): RandomSource => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export const hashString = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const randomInt = (random: RandomSource, min: number, max: number) =>
  Math.floor(random() * (max - min + 1)) + min;

export const shuffle = <T>(items: T[], random: RandomSource) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

export const weightedPick = <T>(
  items: T[],
  weight: (item: T) => number,
  random: RandomSource,
): T => {
  const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
  let cursor = random() * total;
  for (const item of items) {
    cursor -= Math.max(0, weight(item));
    if (cursor <= 0) return item;
  }
  return items.at(-1)!;
};
