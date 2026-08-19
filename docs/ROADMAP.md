# GameVault LAN-First Fork — Roadmap & Status

Last updated: 2026-08-19. Legend: ✅ done · 🟡 in progress / partial · ⬜ not started.

This is a private, self-hosted, non-distributed fork. External services are optional
enrichment only; everything core must work offline on a LAN.

---

## Clients & platforms

| Component | Tech | Platforms | Role |
|-----------|------|-----------|------|
| `gamevault-backend` | NestJS + TypeORM | anywhere (Docker) | authoritative library/metadata/API |
| `gamevault-app` | C# WPF (.NET 8) | Windows | mature desktop client |
| `gamevault-frontend` | Tauri 2 (React + **Rust**) | **Windows / Linux / macOS** | cross-platform client (the Linux client) |
| host agent (future) | TBD | Windows / Linux | headless install/launch/stream on remote hosts (M6/M7) |

The Tauri frontend already ships a native Rust backend (`downloads.rs`,
`extraction.rs`, `installation.rs`, `games.rs`, `time_tracker.rs`) with real
download/extract/install/launch/playtime — so it is a true cross-platform client,
not a web wrapper. Its launch path is currently Windows-oriented (`msiexec`, direct
`.exe`); Linux/Proton support is an extension of that Rust layer.

---

## Cross-platform & Proton/Wine strategy (NEW)

- **Runtime model:** the release/launch config carries a `runtime` of
  `native` | `proton` | `wine` (+ optional Proton/Wine version and prefix path) and
  a target OS. Stored server-side; each client executes what it supports.
- **Windows hosts:** launch native `.exe`/installer (WPF or Tauri).
- **Linux hosts:** build the Tauri frontend for Linux; extend Rust
  `launch_game` / `launch_installation_executable` to:
  - run **native Linux** binaries directly (`LINUX_PORTABLE`/`LINUX_SOFTWARE`), and
  - run **Windows** games via **Proton** (preferred, uses Steam's runtime) or **Wine**,
    honoring the per-game runtime config + prefix.
- **GameType gap:** `GameType` has native Linux values but no notion of "Windows game
  run via Proton on Linux" — that lives in the runtime/launch config, not the type.
- The **WPF client stays Windows-only**; Linux is served by the Tauri client (and,
  later, the headless host agent for remote-play hosts).

---

## Milestone status

### M0 — Phase 0 baseline ✅
Toolchain, forks, upstream remotes, Postgres, migrations, tests, both clients build
and connect. Documented in `DEVELOPMENT_FORK.md`. Baseline SHAs recorded.

### M1 — Steam metadata & achievements 🟡
- Backend ✅: Steam metadata provider; `Achievement`/`AchievementState`/`PlaySession`
  entities + migrations (sqlite+postgres); full schema import (locked+unlocked),
  unlock state, global rarity, icon caching, historical playtime (idempotent);
  endpoints (`/games/:id/achievements`, `/games/:id/playtime`,
  `/providers/steam/import`, `/play-sessions/*`); client-supplied API key; tests.
- WPF client ✅: models + API client, local play-session tracking, achievements tab
  (X/Y, locked/unlocked, rarity), Steam settings (SteamID + API key).
- **Gaps:** achievement **icon thumbnails** in the WPF list (currently text + status);
  **Tauri/Linux client parity** for achievements/playtime/Steam settings ⬜;
  achievement **unlock notifications** (belongs with M5).

### M2 — Native release & install model 🟡 (current)
- ✅ **Slice 1 — package integrity:** SHA-256 `checksum` on `GamevaultGame`
  (+ migrations), streaming compute, `GAMES_CHECKSUM_ON_INDEX` flag, on-demand
  `PUT /games/:id/checksum`, client verification after LAN download, tests.
- ⬜ **Slice 2 — per-host install state:** `GameHost` (OS + capabilities +
  compatibility layers) and `InstalledGame` (game + host + install path + version),
  with a **runtime/Proton-aware launch config**. (Overlaps M6.)
- ⬜ **Slice 3 — release model:** distribution types (`gog` / `steam` / `archive` /
  `portable` / `installer` / `rom` / `disc-image` / `manual`); GOG **multi-part**
  installers; ROM/disc typing; per-release install/launch config.
- Reused as-is: HTTP range/resumable download, archive extraction, exe detection,
  install→play, install rediscovery.

### M3 — Emulator support ⬜
Emulator provider abstraction (xemu, PCSX2, RPCS3, Dolphin, RetroArch), discovery,
platform mapping, ROM/disc scanning (hash-based), per-game overrides, playtime.

### M4 — Self-hosted save sync ⬜
Native + emulator saves, versioned snapshots, restore, conflict detection, offline
queue, retention. (Backend has a savefiles module to build on.)

### M5 — Local achievement detection ⬜
`AchievementDetector` interface + registry; file/JSON/XML/SQLite/log/registry
detectors; local unlock + notifications. (M1 already stores definitions/state.)

### M6 — Multi-host ⬜
Host registration, heartbeat/status, per-host installs (from M2 Slice 2),
capabilities, Wake-on-LAN. Introduces the host agent.

### M7 — Sunshine / Moonlight (embedded, per decision) ⬜
Direct-linked Moonlight streaming in the client (fork `moonlight-common-c`,
native decode/render/input), Sunshine orchestration + launch bridge, WoL.
Native toolchain (CMake/MSVC/FFmpeg) already installed.

### M8 — Fullscreen / controller UX ⬜
Controller-friendly library, game details, install/play/stream, achievements, saves.

### CX — Cross-platform clients (Linux via Tauri + Proton) 🟡 (NEW)
- Tauri frontend base exists and builds the web layer.
- ⬜ Build/package the Tauri client for **Linux** (needs Rust toolchain in CI/dev).
- ⬜ Extend Rust launch for **Proton/Wine** + native Linux.
- ⬜ Port M1 UI (achievements, playtime, Steam settings) into the React frontend for parity.

---

## Audit — is everything needed for done/in-progress milestones present?

- **M0:** ✅ complete against all Phase 0 criteria.
- **M1:** ✅ backend + WPF functional end-to-end. Outstanding polish/parity:
  icon thumbnails (WPF), and the whole M1 feature set in the Tauri/Linux client.
- **M2:** ✅ Slice 1 (integrity) complete and verified; Slices 2–3 outstanding.
- **Cross-cutting:** Linux/Proton now tracked as **CX**; the runtime/launch config it
  needs will be delivered as part of **M2 Slice 2** so later milestones build on it.
