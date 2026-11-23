# Event Tickets

Seat reservation and ticket sales for small venues. Visitors open an event, pick seats on a
seat map, get a short reservation and check out with their email to receive ticket codes.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- PostgreSQL with Prisma
- Redis (ioredis) for seat holds and caching
- Zod for request validation, Vitest for tests

## How seat holds work

Reserving seats must be safe when many people click at the same time:

1. `POST /api/events/:eventId/holds` creates one key per seat:
   `SET hold:<eventId>:<seatId> <token> EX <ttl> NX`. Only one buyer can win a seat.
2. If any seat is already taken, seats grabbed so far are released again
   (a Lua script deletes a key only if it still holds the same token).
3. The hold itself is stored as `holdset:<token>` with the same TTL.
4. On checkout the hold is checked again, an order with tickets is written in Postgres and the
   hold is released. A unique index on `Ticket.seatId` prevents double sales even if Redis
   loses data.

Holds expire on their own after `SEAT_HOLD_TTL` seconds, so abandoned carts free seats automatically.

## Getting started

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000.

## Environment

| Variable           | Default                  | Description                          |
| ------------------ | ------------------------ | ------------------------------------ |
| `DATABASE_URL`     | -                        | Postgres connection string           |
| `REDIS_URL`        | `redis://localhost:6379` | Redis connection string              |
| `SEAT_HOLD_TTL`    | `600`                    | Seconds a reservation is kept        |
| `EVENTS_CACHE_TTL` | `300`                    | Seconds the event list is cached     |

## API

| Method | Path                            | Description                              |
| ------ | ------------------------------- | ---------------------------------------- |
| GET    | `/api/events`                   | Upcoming events with lowest price        |
| GET    | `/api/events/:eventId`          | Event details                            |
| GET    | `/api/events/:eventId/seats`    | Seat map: `available`, `held`, `sold`    |
| POST   | `/api/events/:eventId/holds`    | `{ "seatIds": [...] }`, up to 8 seats    |
| GET    | `/api/holds/:token`             | Hold details while it is active          |
| DELETE | `/api/holds/:token`             | Cancel a hold                            |
| POST   | `/api/orders`                   | `{ "holdToken", "email" }`               |
| GET    | `/api/orders/:id`               | Order with tickets                       |

Checkout errors: `410 HOLD_EXPIRED`, `409 SEAT_SOLD`, `400 SEAT_NOT_FOUND`.

Payments are not part of this project: orders are marked `PAID` right after checkout.

## Structure

```
prisma/                 schema and seed
src/app/                pages and route handlers
src/components/         SeatPicker, CheckoutForm
src/lib/holds.ts        Redis seat holds
src/lib/checkout.ts     hold -> order
src/lib/seats.ts        seat map with live status
src/lib/seat-layout.ts  pure seat helpers (used in the browser too)
src/lib/money.ts        price formatting
tests/                  Vitest suites
```
