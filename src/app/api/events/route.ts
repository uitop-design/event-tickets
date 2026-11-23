import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const events = await prisma.event.findMany({
    where: { startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    select: { id: true, slug: true, title: true, venue: true, startsAt: true, currency: true },
  });
  return NextResponse.json(events);
}
