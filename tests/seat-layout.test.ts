import { describe, expect, it } from "vitest";
import { groupSeats, seatLabel, seatStatus } from "@/lib/seat-layout";
import { formatMoney } from "@/lib/money";

describe("seatStatus", () => {
  it("prefers sold over held", () => {
    expect(seatStatus(true, true)).toBe("sold");
    expect(seatStatus(false, true)).toBe("held");
    expect(seatStatus(false, false)).toBe("available");
  });
});

describe("groupSeats", () => {
  it("groups by section and row keeping order", () => {
    const seats = [
      { id: "1", section: "Stalls", row: "A", number: 1 },
      { id: "2", section: "Stalls", row: "A", number: 2 },
      { id: "3", section: "Stalls", row: "B", number: 1 },
      { id: "4", section: "Balcony", row: "E", number: 1 },
    ];
    const grouped = groupSeats(seats);
    expect([...grouped.keys()]).toEqual(["Stalls", "Balcony"]);
    expect(grouped.get("Stalls")?.get("A")?.map((s) => s.id)).toEqual(["1", "2"]);
    expect(grouped.get("Balcony")?.get("E")).toHaveLength(1);
  });
});

describe("labels and money", () => {
  it("formats seat labels", () => {
    expect(seatLabel({ section: "Hall", row: "C", number: 7 })).toBe("Hall C7");
  });

  it("formats cents as currency", () => {
    expect(formatMoney(3500, "EUR")).toBe("\u20ac35.00");
    expect(formatMoney(1250, "GBP")).toBe("\u00a312.50");
  });
});
