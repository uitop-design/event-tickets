import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeRedis } from "./fake-redis";

const fake = createFakeRedis();
vi.mock("@/lib/redis", () => ({ redis: fake }));

const { getHold, heldSeatIds, holdIsIntact, holdSeats, releaseHold } = await import("@/lib/holds");

describe("seat holds", () => {
  beforeEach(() => fake.store.clear());

  it("holds free seats and stores the hold", async () => {
    const res = await holdSeats("ev1", ["s1", "s2"]);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(await getHold(res.hold.token)).toMatchObject({ eventId: "ev1", seatIds: ["s1", "s2"] });
    expect(await heldSeatIds("ev1", ["s1", "s2", "s3"])).toEqual(new Set(["s1", "s2"]));
  });

  it("does not let two buyers hold the same seat", async () => {
    await holdSeats("ev1", ["s1"]);
    const second = await holdSeats("ev1", ["s1"]);
    expect(second).toEqual({ ok: false, taken: ["s1"] });
  });

  it("releases seats it grabbed when one of them is taken", async () => {
    await holdSeats("ev1", ["s3"]);
    const res = await holdSeats("ev1", ["s1", "s2", "s3"]);
    expect(res.ok).toBe(false);
    expect(await heldSeatIds("ev1", ["s1", "s2"])).toEqual(new Set());
  });

  it("release frees the seats and forgets the hold", async () => {
    const res = await holdSeats("ev1", ["s1"]);
    if (!res.ok) throw new Error("hold failed");
    await releaseHold(res.hold.token);
    expect(await getHold(res.hold.token)).toBeNull();
    expect((await holdSeats("ev1", ["s1"])).ok).toBe(true);
  });

  it("detects a hold whose seat was taken over after expiry", async () => {
    const res = await holdSeats("ev1", ["s1"]);
    if (!res.ok) throw new Error("hold failed");
    fake.store.set("hold:ev1:s1", "someone-else");
    expect(await holdIsIntact(res.hold)).toBe(false);
  });

  it("never deletes a seat key owned by another token", async () => {
    const res = await holdSeats("ev1", ["s1"]);
    if (!res.ok) throw new Error("hold failed");
    fake.store.set("hold:ev1:s1", "someone-else");
    await releaseHold(res.hold.token);
    expect(fake.store.get("hold:ev1:s1")).toBe("someone-else");
  });
});
