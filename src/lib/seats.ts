import { prisma } from "./prisma";
import { heldSeatIds } from "./holds";
import { seatStatus, type SeatView } from "./seat-layout";

/** Seat map with live status, or null when the event has no seats. */
export async function getSeatMap(eventId: string): Promise<SeatView[] | null> {
  const seats = await prisma.seat.findMany({
    where: { eventId },
    include: { ticket: { select: { id: true } } },
    orderBy: [{ section: "asc" }, { row: "asc" }, { number: "asc" }],
  });
  if (seats.length === 0) return null;

  const held = await heldSeatIds(eventId, seats.map((s) => s.id));
  return seats.map((s) => ({
    id: s.id,
    section: s.section,
    row: s.row,
    number: s.number,
    priceCents: s.priceCents,
    status: seatStatus(Boolean(s.ticket), held.has(s.id)),
  }));
}
