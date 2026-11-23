import { randomUUID } from "node:crypto";
import { redis } from "./redis";

export const HOLD_TTL_SECONDS = Number(process.env.SEAT_HOLD_TTL ?? 600);

export type Hold = {
  token: string;
  eventId: string;
  seatIds: string[];
  expiresAt: string;
};

const seatKey = (eventId: string, seatId: string) => `hold:${eventId}:${seatId}`;
const tokenKey = (token: string) => `holdset:${token}`;

/**
 * Hold seats for a limited time. Each seat gets its own key created with NX,
 * so two buyers can never hold the same seat.
 */
export async function holdSeats(
  eventId: string,
  seatIds: string[],
): Promise<{ ok: true; hold: Hold } | { ok: false; taken: string[] }> {
  const token = randomUUID();
  const taken: string[] = [];

  for (const seatId of seatIds) {
    const res = await redis.set(seatKey(eventId, seatId), token, "EX", HOLD_TTL_SECONDS, "NX");
    if (res !== "OK") taken.push(seatId);
  }
  if (taken.length) return { ok: false, taken };

  const hold: Hold = {
    token,
    eventId,
    seatIds,
    expiresAt: new Date(Date.now() + HOLD_TTL_SECONDS * 1000).toISOString(),
  };
  await redis.set(tokenKey(token), JSON.stringify(hold), "EX", HOLD_TTL_SECONDS);
  return { ok: true, hold };
}

export async function getHold(token: string): Promise<Hold | null> {
  const raw = await redis.get(tokenKey(token));
  return raw ? (JSON.parse(raw) as Hold) : null;
}

export async function releaseHold(token: string): Promise<void> {
  const hold = await getHold(token);
  if (!hold) return;
  await redis.del(...hold.seatIds.map((id) => seatKey(hold.eventId, id)), tokenKey(token));
}

/** Returns ids of seats that currently have an active hold. */
export async function heldSeatIds(eventId: string, seatIds: string[]): Promise<Set<string>> {
  if (seatIds.length === 0) return new Set();
  const values = await redis.mget(...seatIds.map((id) => seatKey(eventId, id)));
  return new Set(seatIds.filter((_, i) => values[i] !== null));
}
