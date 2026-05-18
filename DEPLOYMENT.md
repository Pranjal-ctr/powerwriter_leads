# Railway Deployment Guide

## Required Services

- Next.js app service
- Railway PostgreSQL service

## Required Environment Variables

Set this on the Railway app service:

```bash
DATABASE_URL="${{Postgres.DATABASE_URL}}"
NODE_ENV="production"
```

Railway normally injects `PORT` automatically. Do not commit local `.env` files.

## Build And Start

This repository includes `railway.json`.

- Build command: `npm run build`
- Start command: `npm run railway:start`

`npm run railway:start` runs:

```bash
prisma migrate deploy && prisma db seed && next start
```

The seed is idempotent. It creates or updates the configured services, providers,
provider rules, and round-robin cursors.

## First Deployment

1. Push this repository to GitHub.
2. Create a new Railway project from the GitHub repo.
3. Add a Railway PostgreSQL database.
4. Set `DATABASE_URL` on the app service to the Postgres connection variable.
5. Deploy.

On boot, Railway applies `prisma/migrations`, seeds the required provider config,
and starts the Next.js server.

## Local Production Check

```bash
npm run lint
npm run build
```

For a local database:

```bash
npx prisma dev
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```
