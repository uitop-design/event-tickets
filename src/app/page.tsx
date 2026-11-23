import Link from "next/link";
import { listUpcomingEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

export default async function Home() {
  const events = await listUpcomingEvents();

  return (
    <>
      <h1>Upcoming events</h1>
      {events.length === 0 && <p className="muted">No events scheduled yet.</p>}
      <ul className="event-list">
        {events.map((e) => (
          <li key={e.id} className="event-row">
            <div>
              <Link href={`/events/${e.slug}`} className="event-title">{e.title}</Link>
              <div className="muted">{e.venue} · {dateFmt.format(new Date(e.startsAt))}</div>
            </div>
            {e.fromPriceCents != null && (
              <span className="price">from {(e.fromPriceCents / 100).toFixed(2)} {e.currency}</span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
