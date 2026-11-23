// Pure helpers shared by the server and the seat picker in the browser.

export type SeatStatus = "available" | "held" | "sold";

export type SeatView = {
  id: string;
  section: string;
  row: string;
  number: number;
  priceCents: number;
  status: SeatStatus;
};

export function seatStatus(sold: boolean, held: boolean): SeatStatus {
  if (sold) return "sold";
  return held ? "held" : "available";
}

export function seatLabel(seat: { section: string; row: string; number: number }): string {
  return `${seat.section} ${seat.row}${seat.number}`;
}

/** Section -> row -> seats, keeping the order of the input array. */
export function groupSeats<T extends { section: string; row: string }>(seats: T[]): Map<string, Map<string, T[]>> {
  const sections = new Map<string, Map<string, T[]>>();
  for (const seat of seats) {
    let rows = sections.get(seat.section);
    if (!rows) {
      rows = new Map();
      sections.set(seat.section, rows);
    }
    const row = rows.get(seat.row);
    if (row) row.push(seat);
    else rows.set(seat.row, [seat]);
  }
  return sections;
}
