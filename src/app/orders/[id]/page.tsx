import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

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
              <td>{t.seat.section} {t.seat.row}{t.seat.number}</td>
              <td><code>{t.code}</code></td>
              <td>{(t.seat.priceCents / 100).toFixed(2)} {order.event.currency}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p><strong>Total: {(order.totalCents / 100).toFixed(2)} {order.event.currency}</strong></p>
    </>
  );
}
