import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/events";
import { SeatPicker } from "@/components/SeatPicker";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getEventBySlug((await params).slug);
  if (!event) notFound();

  return (
    <>
      <h1>{event.title}</h1>
      <p className="muted">
        {event.venue} · {event.startsAt.toUTCString()}
      </p>
      {event.description && <p>{event.description}</p>}
      <div className="stage">STAGE</div>
      <SeatPicker eventId={event.id} currency={event.currency} />
    </>
  );
}
