import { NextResponse } from "next/server";
import { getHold, releaseHold } from "@/lib/holds";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const hold = await getHold((await params).token);
  if (!hold) return NextResponse.json({ error: "Hold expired" }, { status: 404 });
  return NextResponse.json(hold);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  await releaseHold((await params).token);
  return new NextResponse(null, { status: 204 });
}
