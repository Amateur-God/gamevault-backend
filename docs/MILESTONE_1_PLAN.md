# Milestone 1 — Steam Metadata & Achievements (Implementation Plan)

Status: planning only. No feature code is written until this plan is approved.
Target branches: `feature/steam-achievements` (backend + app), off `develop`.

## Guiding constraints
- Import the **complete** Steam achievement schema (locked + unlocked), not only
  earned achievements.
- All imported data is persisted locally; **offline viewing must not require Steam**.
- Steam is an optional metadata/history source, never a runtime dependency.
- Keep changes isolated and upstream-mergeable (extend, don't rewrite).

## What already exists upstream (reuse, don't rebuild)
- `MetadataProvider` abstract base: `src/modules/metadata/providers/abstract.metadata-provider.service.ts`
  (`slug`, `name`, `priority`, `enabled`, `request_interval_ms`, `search()`,
  `getByProviderDataIdOrFail()`, `getBestMatch()`, auto-registration).
- Concrete providers: `providers/igdb/…`, `providers/rawg-legacy/…`, `providers/testing/…`.
- `GameMetadata` entity (`metadata/games/game.metadata.entity.ts`) keyed by
  `provider_slug` + `provider_data_id` — this is the existing provider-mapping
  mechanism (Steam AppID maps here as `provider_slug: "steam"`, `provider_data_id: <appid>`).
- `MediaService` downloads/caches artwork into `VOLUMES.MEDIA` — reuse for
  achievement icons so they are available offline.
- Config pattern `METADATA.IGDB.{ENABLED,PRIORITY,CLIENT_ID,CLIENT_SECRET,REQUEST_INTERVAL_MS}`
  in `src/configuration.ts` — mirror for Steam.
- Migrations are hand-written and duplicated per DB under
  `src/modules/database/migrations/{sqlite,postgres}/` (scripts:
  `migration:gen:sqlite`, `migration:gen:postgres`).

## Backend work

### 1. Steam provider + config
- Add `METADATA.STEAM.{ENABLED, PRIORITY, API_KEY, REQUEST_INTERVAL_MS}` to
  `src/configuration.ts` (+ `.env.example`).
- New `providers/steam/steam.metadata-provider.service.ts` extending
  `MetadataProvider` (`slug: "steam"`), implementing `search()` and
  `getByProviderDataIdOrFail()` to produce a `GameMetadata` from:
  - `store.steampowered.com/api/appdetails?appids=<appid>` — title, description,
    developer, publisher, release date, genres, header/hero/background artwork
    (cached via `MediaService`). No API key required.
  - `ISteamUser/GetPlayerSummaries` (optional) for validation.
- Register automatically like IGDB/RAWG (via `onModuleInit`/`register()`).

### 2. Achievements (net-new domain)
New module `src/modules/achievements/` with entities + migrations (both DBs):
- `Achievement` — belongs to `GamevaultGame` (game identity): `name`,
  `description`, `icon` (Media), `icon_locked` (Media), `hidden`,
  `global_percentage?`, `provider_mappings[]`.
- `AchievementProviderMapping` — `provider_slug`, `provider_data_id` (appid),
  `provider_achievement_api_name` (Steam `name` / API name). Identity is by
  provider mapping, **not** display name.
- `AchievementState` — per user+achievement: `unlocked`, `unlocked_at`,
  `source` enum (`steam-import` | `gamevault-local` | `manual` |
  `retroachievements` | `other-provider`).
- Import logic:
  - `ISteamUserStats/GetSchemaForGame/v2` (key+appid) → **all** definitions
    (name, displayName, description, hidden, icon, icongray). Icons cached to
    local media.
  - `ISteamUserStats/GetPlayerAchievements/v1` (key+steamid+appid) → unlocked
    state + `unlocktime` → `AchievementState`.
  - `ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2` → rarity.

### 3. Playtime / play sessions (net-new)
- `PlaySession` entity: `user`, `game`, `host?`, `started_at`, `ended_at`,
  `duration_seconds`, `source` enum (`gamevault` | `steam-import` | `manual`).
- Import historical Steam playtime via `IPlayerService/GetOwnedGames/v1`
  (`include_appinfo`, `include_played_free_games`) as a single `steam-import`
  session per game; **kept separate** from GameVault-tracked time and **not**
  re-added on refresh (idempotent by `source` + appid).

### 4. API (follow existing controller conventions)
- `POST /providers/steam/import` — body `{ gameId, appid, steamId? }`:
  map AppID, import metadata + full achievement schema + user state + playtime.
- `POST /providers/steam/refresh` — re-pull, respecting local overrides.
- `GET /games/:id/achievements` — definitions + per-user state (offline, from DB).
- `GET /games/:id/playtime` — `{ steamImport, gamevault, combined }`.
- `POST /play-sessions` (start/stop) + `GET /users/:id/play-sessions`.

### 5. Migrations
- Add matching migrations under `migrations/sqlite/` and `migrations/postgres/`
  for `achievement`, `achievement_provider_mapping`, `achievement_state`,
  `play_session`. Verify `migration:run` on both drivers.

## Client work

### gamevault-app (C# WPF)
- Steam AppID mapping UI on the game page (enter/confirm AppID).
- Achievements panel: `X / Y` header, unlocked/locked rows with cached icons,
  hidden-achievement handling, unlock timestamps.
- Playtime display: Steam historical vs GameVault vs combined.
- **Local play session tracking**: on launch, start session → monitor process
  tree → on exit, `POST /play-sessions` (this is the `gamevault` source).

### gamevault-frontend (React)
- Regenerate the OpenAPI client (already points at the local backend) so new
  endpoints/types appear automatically; add read-only achievement + playtime UI.

## Testing (mirror existing `*.metadata-provider.service.spec.ts` patterns)
- Steam metadata import; **complete** achievement schema import (locked+unlocked);
  locked achievement persistence; unlocked state + timestamp import; offline
  metadata/achievement viewing (provider unreachable); playtime import kept
  separate and idempotent on refresh; provider failure handling; new migrations
  run on sqlite + postgres. Use `TESTING_MOCK_PROVIDERS` where applicable.

## Explicitly out of scope for Milestone 1
- Local achievement **detection**/unlocking (Milestone 5).
- RetroAchievements provider (later milestone; same mapping shape).
