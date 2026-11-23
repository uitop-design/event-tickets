import { redis } from "./redis";

export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch {
    return load();
  }
  const value = await load();
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds).catch(() => undefined);
  return value;
}

export async function invalidate(...keys: string[]): Promise<void> {
  if (keys.length) await redis.del(...keys).catch(() => undefined);
}
