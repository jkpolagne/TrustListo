# TrustListo

Multi-tenant real-estate brokerage platform (capstone). Full spec: `SPEC.md` (~1200 lines, 66 KB).

## Token rules (follow every session)
- **Never read SPEC.md whole.** Find the section with `grep -n '^##' SPEC.md`, then read only that range (Read with offset/limit, or `sed -n 'A,Bp' SPEC.md`).
- Read only the files the task touches. Use grep/glob to locate code before opening files.
- Don't re-read a file you just edited. Don't paste whole files back in replies.
- Run tests/lint scoped to the changed package (`pnpm --filter api test`), not the whole repo, unless asked.
- Keep replies short: what changed, file paths, anything that failed.

## Spec section map (SPEC.md)
§1 Product & out-of-scope · §2 Non-negotiable rules · §3 Tech stack · §4 Repo structure · §5 Roles/permissions/scoping
§6 Prisma data model (big) · §7 Module 2 Marketplace · §8 Module 1 AI docs · §9 Requirements checklist
§10 Module 3 Commissions · §11 Closing · §12 Ratings · §13 API · §14 Security · §15 Build plan
§16 OPEN questions · §17 Seed/demo · §18 Env vars · §19 Glossary

## Always-on rules (short form of §2 — read §2 if unsure)
1. AI only flags; only `BROKER` can approve/verify.
2. No payment/money movement code.
3. Commission vouchers go through the broker first.
4. Every firm-owned row has `firmId`; every authed query is scoped by it.
5. SuperAdmin never sees firm clients/docs/commissions.
6. Public users never log in.
7. Consultant picker randomized server-side; no featured agents.
8. No co-broke: inquiries go to the listing firm's consultants only.
9. Tranche requestable only when milestone reached AND docs verified.
10. Consultants schedule visits; CompanyAdmin approves.
11. Every approval/rejection/signature/status change → audit log.

## Working agreements
- Ask before changing the data model (§6).
- Don't decide anything marked **[OPEN]** in §16 — ask.
- Build in §15 milestone order; check that milestone's acceptance criteria before moving on.

## Stack (details §3)
pnpm workspaces · `apps/web` React 18 + Vite + TS + Tailwind · `apps/api` Express + TS + Prisma · Postgres 16 + PostGIS · tesseract.js + sharp · MinIO (dev) / DO Spaces · Vitest.
