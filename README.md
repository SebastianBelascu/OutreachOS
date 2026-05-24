# OutreachOS

Internal outbound operations software for SmartFusion, built on:

- Next.js App Router
- Supabase Auth
- Prisma + PostgreSQL
- Brevo transactional email

## What ships in this version

- Internal workspace shell with `dashboard`, `leads`, `campaigns`, `mailboxes`, `analytics`, `settings`
- Prisma data model for leads, campaigns, sequence steps, enrollments, outbound messages, email events, import jobs, suppressions, and app users
- Lead CRUD and note-taking
- CSV lead import with preview, duplicate detection, and import reporting
- Mailbox management for multiple sender identities
- Campaign creation, sequence-step authoring, lead enrollment, and activation
- Queue-style dispatch and send cron endpoints
- Brevo transactional send integration
- Brevo transactional webhook ingestion with idempotent event storage
- Internal unsubscribe flow backed by suppression entries
- Basic analytics and worker run tracking

## Environment variables

Copy `.env.example` into your local env file and set:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
DATABASE_URL=
DIRECT_URL=
BREVO_API_KEY=
BREVO_WEBHOOK_BEARER_TOKEN=
APP_BASE_URL=
```

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run test:unit
npx prisma generate
```

## Key routes

- `/dashboard` overview metrics and recent activity
- `/leads` lead creation, search, filtering, and CSV import
- `/leads/[leadId]` notes and lead message timeline
- `/campaigns` campaign creation and campaign list
- `/campaigns/[campaignId]` sequence steps, enrollments, activation, and scheduled messages
- `/mailboxes` sender identity management
- `/analytics` delivery metrics and worker history
- `/settings` infrastructure/env checklist

## Operational endpoints

- `POST /api/leads/import`
- `POST /api/cron/outreach/dispatch`
- `POST /api/cron/outreach/send`
- `POST /api/webhooks/brevo/transactional`
- `GET /unsubscribe/[token]`

## Notes

- Postgres is the source of truth; Brevo is used for delivery and event callbacks.
- Reply automation is prepared at the data-model level but not yet implemented.
- `cacheComponents` is disabled in `next.config.ts` because this internal app is request-driven and DB-backed.
