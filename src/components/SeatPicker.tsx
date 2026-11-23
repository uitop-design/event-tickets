"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type SeatStatus = "available" | "held" | "sold";
type Seat = { id: string; section: string; row: string; number: number; priceCents: number; status: SeatStatus };
type Hold = { token: string; seatIds: string[]; expiresAt: string };

function group(seats: Seat[]) {
  const sections = new Map<string, Map<string, Seat[]>>();
  for (const s of seats) {
    const rows = sections.get(s.section) ?? new Map<string, Seat[]>();
    rows.set(s.row, [...(rows.get(s.row) ?? []), s]);
    sections.set(s.section, rows);
  }
  return sections;
}

const price = (cents: number, currency: string) => `${(cents / 100).toFixed(2)} ${currency}`;

export function SeatPicker({ eventId, currency }: { eventId: string; currency: string }) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hold, setHold] = useState<Hold | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/seats`, { cache: "no-store" });
    if (res.ok) setSeats(await res.json());
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const total = useMemo(
    () => seats.filter((s) => selected.has(s.id)).reduce((sum, s) => sum + s.priceCents, 0),
    [seats, selected],
  );

  function toggle(seat: Seat) {
    if (hold || seat.status !== "available") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else next.add(seat.id);
      return next;
    });
  }

  async function holdSelected() {
    setError(null);
    const res = await fetch(`/api/events/${eventId}/holds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatIds: [...selected] }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not hold seats");
      setSelected(new Set());
      await load();
      return;
    }
    setHold(data);
  }

  async function cancelHold() {
    if (!hold) return;
    await fetch(`/api/holds/${hold.token}`, { method: "DELETE" });
    setHold(null);
    setSelected(new Set());
    await load();
  }

  return (
    <section>
      {[...group(seats)].map(([section, rows]) => (
        <div key={section} className="section">
          <h3>{section}</h3>
          {[...rows].map(([row, rowSeats]) => (
            <div key={row} className="seat-row">
              <span className="row-label">{row}</span>
              {rowSeats.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`seat ${s.status} ${selected.has(s.id) ? "selected" : ""}`}
                  disabled={s.status !== "available"}
                  title={`${section} ${row}${s.number} · ${price(s.priceCents, currency)}`}
                  onClick={() => toggle(s)}
                >
                  {s.number}
                </button>
              ))}
            </div>
          ))}
        </div>
      ))}

      {error && <p className="error">{error}</p>}

      <div className="summary">
        <span>{selected.size} seat(s) · {price(total, currency)}</span>
        {!hold && (
          <button type="button" className="primary" disabled={selected.size === 0} onClick={holdSelected}>
            Reserve seats
          </button>
        )}
        {hold && (
          <button type="button" onClick={cancelHold}>Cancel reservation</button>
        )}
      </div>
    </section>
  );
}
