import { NextResponse } from "next/server";
import { z } from "zod";
import { checkout, CheckoutError } from "@/lib/checkout";

const body = z.object({
  holdToken: z.string().uuid(),
  email: z.string().trim().toLowerCase().email(),
});

const STATUS: Record<string, number> = { HOLD_EXPIRED: 410, SEAT_NOT_FOUND: 400, SEAT_SOLD: 409 };

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid email or hold" }, { status: 400 });

  try {
    const order = await checkout(parsed.data.holdToken, parsed.data.email);
    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    if (err instanceof CheckoutError) {
      return NextResponse.json({ error: err.code }, { status: STATUS[err.code] ?? 400 });
    }
    throw err;
  }
}
