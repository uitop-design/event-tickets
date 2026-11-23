import { NextResponse } from "next/server";
import { getSeatMap } from "@/lib/seats";

type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const seats = await getSeatMap((await params).eventId);
  if (!seats) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json(seats);
}
