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

// Delete a key only if it still belongs to the given hold token.
const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0`;

async function releaseSeatKeys(eventId: string, seatIds: string[], token: string) {
  await Promise.all(seatIds.map((id) => redis.eval(RELEASE_SCRIPT, 1, seatKey(eventId, id), token)));
}

/**
 * Hold seats for a limited time. Each seat gets its own key created with NX,
 * so two buyers can never hold the same seat. If any seat is taken, seats
 * grabbed so far are released again: a hold is all or nothing.
 */
export async function holdSeats(
  eventId: string,
  seatIds: string[],
): Promise<{ ok: true; hold: Hold } | { ok: false; taken: string[] }> {
  const token = randomUUID();
  const acquired: string[] = [];
  const taken: string[] = [];

  for (const seatId of seatIds) {
    const res = await redis.set(seatKey(eventId, seatId), token, "EX", HOLD_TTL_SECONDS, "NX");
    if (res === "OK") acquired.push(seatId);
    else taken.push(seatId);
  }

  if (taken.length) {
    await releaseSeatKeys(eventId, acquired, token);
    return { ok: false, taken };
  }

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

/** True while every seat key of the hold still points at its token. */
export async function holdIsIntact(hold: Hold): Promise<boolean> {
  const values = await redis.mget(...hold.seatIds.map((id) => seatKey(hold.eventId, id)));
  return values.every((v) => v === hold.token);
}

export async function releaseHold(token: string): Promise<void> {
  const hold = await getHold(token);
  if (!hold) return;
  await releaseSeatKeys(hold.eventId, hold.seatIds, token);
  await redis.del(tokenKey(token));
}

/** Returns ids of seats that currently have an active hold. */
export async function heldSeatIds(eventId: string, seatIds: string[]): Promise<Set<string>> {
  if (seatIds.length === 0) return new Set();
  const values = await redis.mget(...seatIds.map((id) => seatKey(eventId, id)));
  return new Set(seatIds.filter((_, i) => values[i] !== null));
}
