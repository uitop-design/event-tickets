import { redis } from "./redis";

/** Read-through cache; if Redis is unreachable the loader result is returned directly. */
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
