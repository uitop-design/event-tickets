import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { eventId } = await params;
  const seats = await prisma.seat.findMany({
    where: { eventId },
    include: { ticket: { select: { id: true } } },
    orderBy: [{ section: "asc" }, { row: "asc" }, { number: "asc" }],
  });
  if (seats.length === 0) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  return NextResponse.json(
    seats.map((s) => ({
      id: s.id,
      section: s.section,
      row: s.row,
      number: s.number,
      priceCents: s.priceCents,
      status: s.ticket ? "sold" : "available",
    })),
  );
}
