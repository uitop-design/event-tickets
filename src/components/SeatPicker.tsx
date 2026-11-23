"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckoutForm } from "./CheckoutForm";
import { formatMoney } from "@/lib/money";
import { groupSeats, seatLabel, type SeatView } from "@/lib/seat-layout";

type Hold = { token: string; seatIds: string[]; expiresAt: string };

export function SeatPicker({ eventId, currency }: { eventId: string; currency: string }) {
  const [seats, setSeats] = useState<SeatView[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hold, setHold] = useState<Hold | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/seats`, { cache: "no-store" });
    if (res.ok) setSeats(await res.json());
  }, [eventId]);

  useEffect(() => {
    load();
    // keep other buyers' holds and sales visible without a reload
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  const total = useMemo(
    () => seats.filter((s) => selected.has(s.id)).reduce((sum, s) => sum + s.priceCents, 0),
    [seats, selected],
  );

  function toggle(seat: SeatView) {
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
      <div className="legend">
        <span><i className="seat" /> free</span>
        <span><i className="seat held" /> reserved</span>
        <span><i className="seat sold" /> sold</span>
      </div>
      {[...groupSeats(seats)].map(([section, rows]) => (
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
                  title={`${seatLabel(s)} · ${formatMoney(s.priceCents, currency)}`}
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
        <span>{selected.size} seat(s) · {formatMoney(total, currency)}</span>
        {!hold && (
          <button type="button" className="primary" disabled={selected.size === 0} onClick={holdSelected}>
            Reserve seats
          </button>
        )}
        {hold && (
          <button type="button" onClick={cancelHold}>Cancel reservation</button>
        )}
      </div>

      {hold && <CheckoutForm holdToken={hold.token} expiresAt={hold.expiresAt} onExpired={cancelHold} />}
    </section>
  );
}
