import { prisma } from "./prisma";
import { cached } from "./cache";

export const EVENTS_CACHE_KEY = "events:upcoming";
const EVENTS_TTL = Number(process.env.EVENTS_CACHE_TTL ?? 300);

export type EventSummary = {
  id: string;
  slug: string;
  title: string;
  venue: string;
  startsAt: string;
  currency: string;
  fromPriceCents: number | null;
};

export function listUpcomingEvents(): Promise<EventSummary[]> {
  return cached(EVENTS_CACHE_KEY, EVENTS_TTL, loadUpcomingEvents);
}

async function loadUpcomingEvents(): Promise<EventSummary[]> {
  const events = await prisma.event.findMany({
    where: { startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
  });
  const prices = await prisma.seat.groupBy({
    by: ["eventId"],
    where: { eventId: { in: events.map((e) => e.id) } },
    _min: { priceCents: true },
  });
  const minByEvent = new Map(prices.map((p) => [p.eventId, p._min.priceCents]));

  return events.map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    venue: e.venue,
    startsAt: e.startsAt.toISOString(),
    currency: e.currency,
    fromPriceCents: minByEvent.get(e.id) ?? null,
  }));
}

export function getEventBySlug(slug: string) {
  return prisma.event.findUnique({ where: { slug } });
}
