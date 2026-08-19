# GameVault LAN-First Fork — Development & Baseline

This document records the forked repository architecture, toolchain, service
dependencies, and the exact baseline state captured before any feature work.

Baseline created: **2026-08-19**
Authenticated GitHub user (fork owner): **Amateur-God**

---

## 1. Repository architecture

Official upstream organisation: **[Phalcode](https://github.com/Phalcode)**
(GameVault, licensed **CC BY-NC-SA 4.0**).

```
GameVault
├── gamevault-backend   (NestJS 11, TypeORM)  ── authoritative library/metadata/API
│     └── PostgreSQL 16  (Docker, dev)         ── or SQLite (better-sqlite3)
├── gamevault-app       (C# WPF, .NET 8)       ── desktop client (install/launch/saves)
├── gamevault-frontend  (Vite/React 19 + Tauri 2) ── web/cross-platform client
└── streaming/
      ├── moonlight-common-c  (GPL-3.0)  ── GameStream protocol core (to be embedded)
      └── moonlight-qt        (GPL-3.0)  ── reference impl (read-only, decode/render/input)
```

Consumed as a normal dependency (no fork): `@phalcode/ts-igdb-client`.
Orchestrated, not forked: **[LizardByte/Sunshine](https://github.com/LizardByte/Sunshine)**
(GPL-3.0 host) — configured via `apps.json` + its `:47990` API + a generic
`GameVaultLaunch --game <id>` bridge.

### Forked / cloned repositories

| Local dir | origin (fork)                                        | upstream                                             | Branch | Notes |
|-----------|------------------------------------------------------|-----------------------------------------------------|--------|-------|
| `backend/`  | https://github.com/Amateur-God/gamevault-backend  | https://github.com/Phalcode/gamevault-backend       | master | NestJS 11 |
| `app/`      | https://github.com/Amateur-God/gamevault-app      | https://github.com/Phalcode/gamevault-app           | master | WPF .NET 8 |
| `frontend/` | https://github.com/Amateur-God/gamevault-frontend | https://github.com/Phalcode/gamevault-frontend      | master | Vite/React/Tauri |
| `streaming/moonlight-common-c/` | https://github.com/Amateur-God/moonlight-common-c | https://github.com/moonlight-stream/moonlight-common-c | master | fork (submodules) |
| `streaming/moonlight-qt/` | — (reference clone) | https://github.com/moonlight-stream/moonlight-qt | master | shallow, read-only |

---

## 2. Baseline commit SHAs (unmodified upstream state)

| Repo | Fork branch | Baseline commit | Commit date | Nearest upstream tag |
|------|-------------|-----------------|-------------|----------------------|
| gamevault-backend  | master | `f95cc9f13134e73ce769d4fee33cd63bb0398a36` | 2026-02-15 | `16.3.0` |
| gamevault-app      | master | `f638dbab4a9b833417d4dd142a914e961b9453e5` | 2026-01-07 | `1.17.5.0` (+1) |
| gamevault-frontend | master | `cc19907956b783bdaea77290eafb454cc40b66f1` | 2026-04-23 | `16.2.1` (+2) |
| moonlight-common-c | master | `874ac9548f1bd6f095ef2b435c42cdde460e7821` | 2026-08-18 | — |
| moonlight-qt (ref) | master | `d2f6990` | 2026-08-18 | — |

---

## 3. Toolchain (installed via winget)

| Tool | Version | Purpose |
|------|---------|---------|
| Git | 2.55.0.3 | VCS |
| GitHub CLI (`gh`) | 2.97.0 | forking / auth |
| Node.js LTS | 24.19.0 | backend + frontend |
| npm | 11.17.0 | bundled with Node |
| pnpm | 10.29.3 | backend + frontend package manager (`packageManager` field) |
| .NET SDK | 8.0.424 | `gamevault-app` (`net8.0-windows10.0.22000.0`) |
| Docker Desktop | 29.7.2 | PostgreSQL 16 for dev |
| Temurin JRE | 21.0.12 | frontend `openapi-generator-cli` |
| CMake | 4.4.2 | native Moonlight module (Milestone 7) |
| FFmpeg | 9.0 | native Moonlight module (Milestone 7) |
| VS 2022 C++ Build Tools | (VCTools workload) | native Moonlight module (Milestone 7) |

---

## 4. Service dependencies

- **PostgreSQL 16** (dev): run via Docker (`backend/docker-compose.dev.yml`), exposed on `localhost:5432`.
  Alternative for fully-offline/no-Docker dev: set `DB_SYSTEM=SQLITE` (uses `better-sqlite3`).
- No other external services are required for the baseline.

---

## 5. Build / test / launch commands

### Backend (`backend/`)
```powershell
pnpm install
# start Postgres 16 (from backend/):
docker compose -f docker-compose.dev.yml up -d
# copy env and edit as needed:
copy .env.example .env
pnpm test           # jest (uses in-memory SQLite via .testing.env)
pnpm start          # nest start --watch  -> http://localhost:8080
# Swagger UI:        http://localhost:8080/api/docs
# OpenAPI YAML:      http://localhost:8080/api/docs-yaml
```
Migrations run automatically on start when `DB_SYNCHRONIZE=false` (default).

### Frontend (`frontend/`)
```powershell
# Point the API client generator at the local backend (offline/LAN):
$env:GAMEVAULT_OPENAPI_URL = "http://localhost:8080/api/docs-yaml"
pnpm install        # postinstall generates ./src/api from the OpenAPI spec
pnpm dev            # vite dev server
```

### App (`app/`)
```powershell
dotnet restore gamevault.sln
dotnet build gamevault.sln -c Debug
# run the built exe from gamevault/bin/Debug/net8.0-windows10.0.22000.0/
```

---

## 6. Environment variables

Backend configuration is resolved by `backend/src/configuration.ts`
(env vars, `<NAME>_FILE` Docker secrets, or `config.yaml`). See
`backend/.env.example` for the full annotated list. Key variables:

| Variable | Default | Notes |
|----------|---------|-------|
| `DB_SYSTEM` | `POSTGRESQL` | or `SQLITE` |
| `DB_HOST` / `DB_PORT` | `localhost` / `5432` | Postgres connection |
| `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE` | `default` / `default` / `gamevault` | Postgres credentials |
| `DB_SYNCHRONIZE` | `false` | when false, migrations run on start |
| `SERVER_PORT` | `8080` | HTTP port |
| `SERVER_REGISTRATION_DISABLED` | `false` | allow first-user registration |
| `SERVER_ACCOUNT_ACTIVATION_DISABLED` | `false` | set `true` in dev to skip activation |
| `VOLUMES_*` | `/config`, `/media`, ... | set to `./.local/*` for local dev |
| `METADATA_IGDB_CLIENT_ID/SECRET` | — | optional IGDB metadata |

**Never commit secrets.** `.env` is git-ignored; only `.env.example` is tracked.

---

## 7. Remote-play integration (Milestone 7) — license note

Sunshine, moonlight-qt, and moonlight-common-c are all **GPL-3.0**; GameVault is
**CC BY-NC-SA 4.0**. Per the project decision, Moonlight streaming is linked
**directly into** the `gamevault-app` client. Linking GPL-3.0 code into the client
makes the *combined binary* GPL-3.0, which is incompatible with CC BY-NC-SA.

This is acceptable **only for private, non-distributed household use** — GPL
obligations trigger on **distribution**. The merged `gamevault-app` + Moonlight
binary must **not** be redistributed. Redistribution would require licensing the
entire client under GPL-3.0. All upstream LICENSE/NOTICE/attribution files are
preserved in each fork.

---

## 8. Upstream sync workflow

```powershell
git fetch upstream
git checkout develop
git merge upstream/master   # or rebase, per repo convention
```
`origin` = your fork, `upstream` = official repo. Do not force-push shared branches.
