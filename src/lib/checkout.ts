import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getHold, releaseHold } from "./holds";

export type CheckoutErrorCode = "HOLD_EXPIRED" | "SEAT_NOT_FOUND" | "SEAT_SOLD";

export class CheckoutError extends Error {
  constructor(public code: CheckoutErrorCode) {
    super(code);
  }
}

export function ticketCode(): string {
  return randomBytes(5).toString("hex").toUpperCase();
}

/**
 * Turns an active hold into a paid order. Payment is out of scope here:
 * the order is marked PAID right away. The unique index on Ticket.seatId
 * is the last line of defence against double booking.
 */
export async function checkout(holdToken: string, email: string) {
  const hold = await getHold(holdToken);
  if (!hold) throw new CheckoutError("HOLD_EXPIRED");

  const seats = await prisma.seat.findMany({
    where: { id: { in: hold.seatIds }, eventId: hold.eventId },
  });
  if (seats.length !== hold.seatIds.length) throw new CheckoutError("SEAT_NOT_FOUND");

  const totalCents = seats.reduce((sum, s) => sum + s.priceCents, 0);

  try {
    const order = await prisma.order.create({
      data: {
        eventId: hold.eventId,
        email,
        status: "PAID",
        totalCents,
        tickets: { create: seats.map((s) => ({ seatId: s.id, code: ticketCode() })) },
      },
      include: { tickets: true },
    });
    await releaseHold(holdToken);
    return order;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new CheckoutError("SEAT_SOLD");
    }
    throw err;
  }
}
