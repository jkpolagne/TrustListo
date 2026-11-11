# TrustListo

Multi-tenant real-estate brokerage platform (capstone). The full specification is in
[SPEC.md](SPEC.md); the panel walkthrough, module by module, is in
[docs/DEMO-GUIDE.md](docs/DEMO-GUIDE.md).

## Run it on your own computer

You need, once:

- **Node.js 20 or newer** — <https://nodejs.org>
- **pnpm** — after installing Node, run `corepack enable` (it picks the right pnpm version)
- **Docker Desktop**, running — <https://www.docker.com/products/docker-desktop/>
- **Git**, and access to this repository (ask the owner to add you as a collaborator)

Then:

```bash
git clone https://github.com/jkpolagne/TrustListo.git
cd TrustListo
git checkout m4-docai            # the branch with M4–M9, until it is merged into main

cp .env.example .env             # Windows PowerShell: copy .env.example .env
pnpm install
pnpm db:up                       # starts Postgres (with PostGIS) and MinIO in Docker
```

Choose how to start:

```bash
pnpm db:reset:starter   # clean start: only the SuperAdmin and two firms (admin + broker each)
pnpm db:reset           # full demo data: consultants, listings, leads, clients, commissions
```

Both commands **erase the local database** first. Then:

```bash
pnpm --filter api demo:kit   # mock documents to upload during the demo → demo-kit/
pnpm dev                     # API on :4000, website on http://localhost:5173
```

All demo accounts use the password `Password123!`.

## Useful commands

| Command                                             | What it does                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `pnpm dev`                                          | Runs the API and the website together. Stop with Ctrl+C.           |
| `pnpm db:up` / `pnpm db:down`                       | Starts / stops the Docker database and file storage.               |
| `pnpm --filter api test`                            | Runs the API test suite (134 tests, including the full demo deal). |
| `pnpm --filter api docai:samples` then `docai:eval` | Module 1 accuracy evaluation for Chapter 4 (SPEC §8.8).            |

The OCR model ships with the project, so document reading works without internet.

## Troubleshooting

- **"Can't reach database server"** — Docker Desktop isn't running, or `pnpm db:up` wasn't run.
- **Port 5432, 9000 or 5173 already in use** — another Postgres, MinIO or dev server is running;
  stop it, or stop the other copy of this project.
- **Login fails right after a reset** — the reset must finish first; it prints
  `Starter setup: …` or `Seeded …` when done.
