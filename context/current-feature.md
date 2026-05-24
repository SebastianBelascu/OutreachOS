# OutreachOS v1 foundation

## Goal

Implement the first operational version of OutreachOS as an internal outbound tool on top of:
- Next.js App Router
- Supabase Auth
- Prisma + PostgreSQL
- Brevo transactional email

## Scope

- Replace starter UI with an internal workspace shell
- Add Prisma schema for leads, campaigns, mailboxes, sequences, messages, events, imports, suppressions, and internal users
- Add CRUD flows for leads, campaigns, sequence steps, mailboxes, and notes
- Add CSV import with preview/dedupe/import report
- Add cron endpoints for dispatching and sending scheduled messages
- Add Brevo transactional sending service and webhook ingestion
- Add unsubscribe flow and analytics snapshots

## Constraints

- Single internal workspace
- Role model: ADMIN / OPERATOR
- Multiple sender identities
- Reply automation deferred, but message/thread metadata prepared now

## Progress

- [x] Planning completed
- [x] Prisma schema and backend services
- [x] API routes and webhook handling
- [x] Internal dashboard UI
- [x] Build verification
