"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function secondsLeft(expiresAt: string) {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

const MESSAGES: Record<string, string> = {
  HOLD_EXPIRED: "Your reservation expired. Please pick the seats again.",
  SEAT_SOLD: "One of the seats was sold a moment ago.",
};

export function CheckoutForm({ holdToken, expiresAt, onExpired }: { holdToken: string; expiresAt: string; onExpired: () => void }) {
  const router = useRouter();
  const [left, setLeft] = useState(() => secondsLeft(expiresAt));
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      const s = secondsLeft(expiresAt);
      setLeft(s);
      if (s === 0) {
        clearInterval(t);
        onExpired();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt, onExpired]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holdToken, email }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(MESSAGES[data.error] ?? "Checkout failed");
      return;
    }
    router.push(`/orders/${data.id}`);
  }

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <form className="checkout" onSubmit={submit}>
      <p>Seats reserved for <strong>{mm}:{ss}</strong></p>
      <label>
        Email for tickets
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <button className="primary" type="submit" disabled={busy || left === 0}>
        {busy ? "Processing..." : "Buy tickets"}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
