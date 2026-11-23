import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { seatLabel } from "@/lib/seat-layout";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const order = await prisma.order.findUnique({
    where: { id: (await params).id },
    include: { event: true, tickets: { include: { seat: true } } },
  });
  if (!order) notFound();

  return (
    <>
      <h1>Thank you!</h1>
      <p>
        Order <code>{order.id}</code> for <strong>{order.event.title}</strong>. Tickets were sent to {order.email}.
      </p>
      <table className="tickets">
        <thead>
          <tr><th>Seat</th><th>Code</th><th>Price</th></tr>
        </thead>
        <tbody>
          {order.tickets.map((t) => (
            <tr key={t.id}>
              <td>{seatLabel(t.seat)}</td>
              <td><code>{t.code}</code></td>
              <td>{formatMoney(t.seat.priceCents, order.event.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p><strong>Total: {formatMoney(order.totalCents, order.event.currency)}</strong></p>
    </>
  );
}
