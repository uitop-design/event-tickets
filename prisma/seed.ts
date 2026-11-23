import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Section = { name: string; rows: string[]; seatsPerRow: number; priceCents: number };

function seatGrid(sections: Section[]) {
  return sections.flatMap((s) =>
    s.rows.flatMap((row) =>
      Array.from({ length: s.seatsPerRow }, (_, i) => ({
        section: s.name,
        row,
        number: i + 1,
        priceCents: s.priceCents,
      })),
    ),
  );
}

const events = [
  {
    slug: "jazz-night-december",
    title: "Jazz Night",
    venue: "Blue Room Club",
    description: "An evening of standards with a local quartet.",
    startsAt: new Date("2026-12-12T19:30:00Z"),
    sections: [
      { name: "Stalls", rows: ["A", "B", "C", "D"], seatsPerRow: 10, priceCents: 3500 },
      { name: "Balcony", rows: ["E", "F"], seatsPerRow: 8, priceCents: 2500 },
    ],
  },
  {
    slug: "indie-film-premiere",
    title: "Indie Film Premiere",
    venue: "Cinema Lumen, Hall 2",
    description: "Premiere screening followed by a Q&A with the director.",
    startsAt: new Date("2026-12-18T18:00:00Z"),
    sections: [{ name: "Hall", rows: ["A", "B", "C", "D", "E", "F"], seatsPerRow: 12, priceCents: 1200 }],
  },
];

async function main() {
  for (const { sections, ...event } of events) {
    const existing = await prisma.event.findUnique({ where: { slug: event.slug } });
    if (existing) continue;
    await prisma.event.create({
      data: { ...event, seats: { create: seatGrid(sections) } },
    });
  }
  console.log("Seed finished");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
