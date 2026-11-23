import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { holdSeats } from "@/lib/holds";

const MAX_SEATS_PER_HOLD = 8;

const body = z.object({
  seatIds: z.array(z.string().min(1)).min(1).max(MAX_SEATS_PER_HOLD),
});

type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { eventId } = await params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: `Pick between 1 and ${MAX_SEATS_PER_HOLD} seats` }, { status: 400 });
  }
  const seatIds = [...new Set(parsed.data.seatIds)];

  const seats = await prisma.seat.findMany({
    where: { id: { in: seatIds }, eventId },
    include: { ticket: { select: { id: true } } },
  });
  if (seats.length !== seatIds.length) {
    return NextResponse.json({ error: "Some seats do not belong to this event" }, { status: 400 });
  }
  const sold = seats.filter((s) => s.ticket).map((s) => s.id);
  if (sold.length) {
    return NextResponse.json({ error: "Some seats are already sold", seatIds: sold }, { status: 409 });
  }

  const result = await holdSeats(eventId, seatIds);
  if (!result.ok) {
    return NextResponse.json({ error: "Some seats are held by someone else", seatIds: result.taken }, { status: 409 });
  }
  return NextResponse.json(result.hold, { status: 201 });
}
