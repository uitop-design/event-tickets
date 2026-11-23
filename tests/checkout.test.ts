import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/holds", () => ({
  getHold: vi.fn(),
  holdIsIntact: vi.fn(),
  releaseHold: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    seat: { findMany: vi.fn() },
    order: { create: vi.fn() },
  },
}));

const holds = await import("@/lib/holds");
const { prisma } = await import("@/lib/prisma");
const { checkout, CheckoutError, ticketCode } = await import("@/lib/checkout");

const hold = { token: "t1", eventId: "ev1", seatIds: ["s1", "s2"], expiresAt: new Date().toISOString() };
const seats = [
  { id: "s1", eventId: "ev1", section: "A", row: "1", number: 1, priceCents: 2000 },
  { id: "s2", eventId: "ev1", section: "A", row: "1", number: 2, priceCents: 1500 },
];

describe("checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(holds.getHold).mockResolvedValue(hold);
    vi.mocked(holds.holdIsIntact).mockResolvedValue(true);
    vi.mocked(prisma.seat.findMany).mockResolvedValue(seats as never);
  });

  it("fails when the hold is gone", async () => {
    vi.mocked(holds.getHold).mockResolvedValue(null);
    await expect(checkout("t1", "a@b.c")).rejects.toMatchObject({ code: "HOLD_EXPIRED" });
  });

  it("fails when the hold lost one of its seats", async () => {
    vi.mocked(holds.holdIsIntact).mockResolvedValue(false);
    await expect(checkout("t1", "a@b.c")).rejects.toBeInstanceOf(CheckoutError);
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it("creates a paid order with the summed total and releases the hold", async () => {
    vi.mocked(prisma.order.create).mockResolvedValue({ id: "o1" } as never);
    const order = await checkout("t1", "a@b.c");

    expect(order).toEqual({ id: "o1" });
    const args = vi.mocked(prisma.order.create).mock.calls[0][0];
    expect(args.data).toMatchObject({ eventId: "ev1", email: "a@b.c", status: "PAID", totalCents: 3500 });
    expect(holds.releaseHold).toHaveBeenCalledWith("t1");
  });

  it("maps unique violations to SEAT_SOLD", async () => {
    vi.mocked(prisma.order.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "5.22.0" }),
    );
    await expect(checkout("t1", "a@b.c")).rejects.toMatchObject({ code: "SEAT_SOLD" });
    expect(holds.releaseHold).not.toHaveBeenCalled();
  });
});

describe("ticketCode", () => {
  it("returns 10 upper-case hex characters", () => {
    expect(ticketCode()).toMatch(/^[0-9A-F]{10}$/);
  });
});
