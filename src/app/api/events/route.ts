import { NextResponse } from "next/server";
import { listUpcomingEvents } from "@/lib/events";

export async function GET() {
  return NextResponse.json(await listUpcomingEvents());
}
