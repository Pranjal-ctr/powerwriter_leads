# PowerWriter Leads

Lead intake and provider distribution app built with Next.js 16, React 19,
Prisma 7, and PostgreSQL.

## Features

- Customer lead intake form
- Provider dashboard with quota usage
- Mandatory provider assignment
- Fair-pool round-robin allocation
- Monthly quota tracking
- Idempotent payment webhook handling
- Server-Sent Events for dashboard refreshes

## Tech Stack

- Next.js App Router
- React
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Zod

## Local Setup

```bash
npm install
cp .env.example .env
```

Set `DATABASE_URL` in `.env`, then run:

```bash
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Useful Scripts

```bash
npm run dev
npm run lint
npm run build
npm run db:migrate
npm run db:migrate:deploy
npm run db:seed
```

## Railway Deployment

This repo includes `railway.json`.

On Railway:

1. Create a PostgreSQL service.
2. Set `DATABASE_URL` on the app service to Railway's Postgres URL.
3. Deploy from GitHub.

Railway uses:

```bash
npm run build
npm run railway:start
```

`railway:start` applies migrations, seeds required provider/service config, and
starts the Next.js server.

More detail is in [DEPLOYMENT.md](./DEPLOYMENT.md).
