# Daily JSON API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish one static JSON file per day under `api/v1/` that lets the author's other tools look up a BOATCAST replay URL by stadium number and race number.

**Architecture:** A small Node (ESM, no dependencies) generator turns one day of `boatraceopenapi/programs` v3 data into one JSON file. Data comes from a pluggable source: a local clone directory for the backfill, HTTP for the daily GitHub Actions job. Files are committed to `main` and served by GitHub Pages next to the existing `index.html`, which is left unchanged.

**Tech Stack:** Node 20+ (dev machine has v24), `node:test`, `node:assert`, global `fetch`, GitHub Actions.

**Spec:** none written (sized as a small project in chat). The agreed design is the "Design" section below; it replaces a spec document.

## Design (agreed in conversation)

- Consumer is only the author's own tools. Lookup shape: `stadiums["<stadium_number>"].races["<race_number>"].replay_url`.
- One file per day: `api/v1/YYYY/YYYYMMDD.json`, from `2020-01-01` (the earliest BOATCAST replay) to yesterday (JST). Today is excluded because program data lags.
- Day file schema (compact JSON, keys are strings):
  ```json
  {"date":"2024-04-09","stadiums":{"1":{"name":"桐生","title":"第17回…","races":{"1":{"subtitle":"一般","replay_url":"https://front.player.boatrace-cdn.jp/player/vod?..."}}}}}
  ```
  Stadiums with no programs are absent. A day that was fetched successfully with zero programs yields `"stadiums":{}` (distinguishes "no racing" from "not generated").
- Source data: `docs/v3/YYYY/YYYYMMDD.json` of `boatraceopenapi/programs` (v3 only; v2 uses different field names). Local clone: `/home/shimomo/github/boatraceopenapi/programs/docs/v3` (branch `gh-pages`, must be `git pull`ed before backfill). HTTP: `https://boatraceopenapi.github.io/programs/v3/YYYY/YYYYMMDD.json`.
- `index.html` is not modified. Its inline `// --- pure ---` block stays the reference; a test guards against drift between it and `lib/`.

## Global Constraints

- `MIN_DATE` = `2020-01-01`; dates are `YYYY-MM-DD`; "yesterday" is computed in `Asia/Tokyo`.
- Replay URL format must equal `index.html`'s `replayUrl` output exactly (`service=boatcast&stadium=<NNslug>&raceType=race&raceDate=YYYYMMDD&raceNumber=NN&autoplay=0&bitrate=low`).
- Stadium names/slugs: the 24-entry `STADIUMS` table from `index.html`.
- No runtime dependencies; `package.json` has `"type": "module"` and `"test": "node --test"`.
- A day whose source cannot be read or parsed produces no file and a non-zero exit code; other days continue.
- Commit messages follow the repo style (`feat: …`, `docs: …`, Japanese body OK).

## Review Focus

- Program with `stadium_number` not in `STADIUMS` (new venue): fail that day loudly, write no file.
- Program with null/missing `title` or `subtitle`: output `""`, not `null`/`undefined`.
- Duplicate `(stadium_number, number)` in one day's programs: fail that day.
- Source JSON valid but without a `programs` array, or invalid JSON, or HTTP 404/500: failure, no file, other days still processed, exit code 1.
- `--from` before `2020-01-01` or `--to` after yesterday (JST): CLI rejects with a clear message and exit code 2.

---

### Task 1: Replay URL library and drift guard

**Files:**
- Create: `package.json`, `lib/replay.mjs`, `test/replay.test.mjs`

**Interfaces:**
- Produces (`lib/replay.mjs`): `MIN_DATE: string`; `STADIUMS: Record<number,[slug:string,name:string]>` (identical to `index.html`); `replayUrl(date: string, stadium: number, race: number): string | null` (same semantics as the page: `null` on invalid input); `programsUrl(date: string): string`; `programsPath(date: string): string` returning `YYYY/YYYYMMDD.json`.

- [ ] **Step 1: Write failing tests in `test/replay.test.mjs`**
  - `replayUrl("2024-04-09", 1, 1)` equals `https://front.player.boatrace-cdn.jp/player/vod?service=boatcast&stadium=01kiryu&raceType=race&raceDate=20240409&raceNumber=01&autoplay=0&bitrate=low`.
  - `replayUrl` returns `null` for stadium `0`, stadium `25`, race `0`, race `13`, date `"2024-4-9"`.
  - `programsUrl("2024-04-09")` equals `https://boatraceopenapi.github.io/programs/v3/2024/20240409.json`; `programsPath("2024-04-09")` equals `2024/20240409.json`.
  - Drift guard: read `index.html`, take the text between `// --- pure ---` and `// --- /pure ---`, evaluate it with `new Function(block + "; return { STADIUMS, replayUrl, MIN_DATE };")()`, then assert `deepStrictEqual` on `STADIUMS` and `MIN_DATE`, and that `replayUrl` agrees with the lib for every stadium 1–24 × races 1 and 12 on `2024-04-09`.
- [ ] **Step 2: Run `node --test` — expect FAIL** (module not found).
- [ ] **Step 3: Implement `lib/replay.mjs`** by moving the `STADIUMS`, `MIN_DATE`, `replayUrl`, `programsUrl` code verbatim from `index.html`'s pure block and adding `programsPath`; add `package.json`.
- [ ] **Step 4: Run `node --test` — expect all PASS.**
- [ ] **Step 5: Commit** `feat: リプレイURL生成をlibに切り出す（index.htmlとの差異検出テスト付き）`.

### Task 2: Day builder

**Files:**
- Create: `lib/build-day.mjs`, `test/build-day.test.mjs`

**Interfaces:**
- Consumes: `STADIUMS`, `replayUrl` from `lib/replay.mjs`.
- Produces: `buildDay(date: string, source: {programs: Array<{stadium_number:number, number:number, title?:string|null, subtitle?:string|null}>}): DayJson` where `DayJson = {date: string, stadiums: Record<string,{name:string,title:string,races:Record<string,{subtitle:string,replay_url:string}>}>}`. Throws `Error` on: missing/non-array `programs`; unknown `stadium_number`; duplicate `(stadium_number, number)`; `number` outside 1–12.

- [ ] **Step 1: Write failing tests** (one per case): two stadiums with two races each produce the schema above with `replay_url === replayUrl(date, s, r)`; stadium `title` taken from the lowest-numbered race's `title`; `programs: []` → `{date, stadiums:{}}`; null `title`/`subtitle` → `""`; and each throwing case from the Interfaces list, with `assert.throws` and a message matching `/stadium_number|duplicate|programs|number/`.
- [ ] **Step 2: Run `node --test test/build-day.test.mjs` — expect FAIL.**
- [ ] **Step 3: Implement `buildDay`** in `lib/build-day.mjs`; insertion order of `stadiums` and `races` must be ascending numeric so output is deterministic.
- [ ] **Step 4: Run `node --test` — expect all PASS.**
- [ ] **Step 5: Commit** `feat: 1日分のJSONを組み立てるbuildDayを追加する`.

### Task 3: Data sources

**Files:**
- Create: `lib/source.mjs`, `test/source.test.mjs`

**Interfaces:**
- Consumes: `programsPath`, `programsUrl` from `lib/replay.mjs`.
- Produces: `dirSource(dir: string): (date: string) => Promise<object>`; `httpSource(fetchImpl?: typeof fetch): (date: string) => Promise<object>` (default `globalThis.fetch`); `openSource(spec: string): (date: string) => Promise<object>` — the literal `"http"` returns `httpSource()` (always fetching `programsUrl`); any other value is a directory path and returns `dirSource(spec)`. Each loader throws on missing file, HTTP non-2xx, or invalid JSON.

- [ ] **Step 1: Write failing tests:** `dirSource` reads `<tmp>/2024/20240409.json` fixture and returns the parsed object; rejects for a missing file and for invalid JSON; `httpSource` with a stub `fetchImpl` returns parsed JSON for `{ok:true}`, rejects with a message containing `404` for `{ok:false,status:404}`, and calls the stub with `programsUrl(date)`; `openSource("http")` returns an HTTP loader, `openSource("/some/dir")` a directory loader (check by behaviour against a tmp dir).
- [ ] **Step 2: Run `node --test test/source.test.mjs` — expect FAIL.**
- [ ] **Step 3: Implement** with `node:fs/promises` and `JSON.parse`.
- [ ] **Step 4: Run `node --test` — expect all PASS.**
- [ ] **Step 5: Commit** `feat: 出走表データの読み込み元（ローカル/HTTP）を追加する`.

### Task 4: CLI

**Files:**
- Create: `scripts/build.mjs`, `lib/dates.mjs`, `test/dates.test.mjs`, `test/cli.test.mjs`

**Interfaces:**
- Consumes: `buildDay`, `openSource`, `programsPath`, `MIN_DATE`.
- Produces: `lib/dates.mjs`: `yesterdayJst(now?: Date): string`; `eachDate(from: string, to: string): string[]` (inclusive, ascending). CLI: `node scripts/build.mjs --source <dir|http> --from <date> [--to <date>] [--out api/v1] [--missing-only]`. `--to` defaults to `yesterdayJst()`. Exit codes: `0` all days ok, `1` ≥1 day failed (message per failed day on stderr), `2` bad arguments.

- [ ] **Step 1: Write failing tests.** `dates.test.mjs`: `yesterdayJst(new Date("2026-10-28T16:00:00Z"))` is `2026-10-28` (JST is already the 29th); `yesterdayJst(new Date("2026-10-28T14:59:00Z"))` is `2026-10-27`; `eachDate("2024-02-28","2024-03-01")` has 3 entries including `2024-02-29`. `cli.test.mjs` (spawn the CLI with `node:child_process`, tmp `--source` and `--out`): a 2-day fixture range writes both files at `<out>/2024/20240409.json` with compact JSON ending in `\n`; a day whose source file is missing exits `1`, writes no file for it and still writes the other day; `--missing-only` leaves an existing file's bytes untouched and does not read its source; `--from 2019-12-31` and `--to 2999-01-01` each exit `2`.
- [ ] **Step 2: Run `node --test` — expect FAIL.**
- [ ] **Step 3: Implement** with `node:util` `parseArgs`. Output is `JSON.stringify(day) + "\n"`; create directories with `mkdir -p` semantics; process days sequentially.
- [ ] **Step 4: Run `node --test` — expect all PASS.**
- [ ] **Step 5: Commit** `feat: 日次JSONを生成するCLIを追加する`.

### Task 5: Backfill from the local clone

**Files:**
- Create: `api/v1/2020/…` through `api/v1/2026/…` (generated)

- [ ] **Step 1: Update the source clone:** `git -C /home/shimomo/github/boatraceopenapi/programs pull --ff-only` — expect success (branch `gh-pages`).
- [ ] **Step 2: Generate:** `node scripts/build.mjs --source /home/shimomo/github/boatraceopenapi/programs/docs/v3 --from 2020-01-01` — expect exit 0 and no stderr output. If failures appear, report them to the user before continuing.
- [ ] **Step 3: Verify:** file count under `api/v1` equals the number of days from 2020-01-01 to yesterday (JST) inclusive; at least one file has `"stadiums":{}`; for one known held day, `stadiums["1"].races["1"].replay_url` equals what `index.html` shows for the same inputs (open the page or compare to `replayUrl`); total size of `api/` is reported to the user.
- [ ] **Step 4: Commit** `feat: 2020-01-01以降の日次JSONを生成する` (large commit is expected).

### Task 6: Daily update workflow and docs

**Files:**
- Create: `.github/workflows/daily.yml`
- Modify: `README.md`

- [ ] **Step 1: Create the workflow.** Triggers: `schedule` cron `0 22 * * *` (07:00 JST) and `workflow_dispatch`. Permissions `contents: write`. Steps: checkout; `actions/setup-node` Node 22; `node --test`; `node scripts/build.mjs --source http --from 2020-01-01 --missing-only` (self-heals any previously failed day, and costs no network when nothing is missing); if `git status --porcelain api` is non-empty, commit as `github-actions[bot]` with message `chore: 日次JSONを追加する` and push to `main`.
- [ ] **Step 2: Update `README.md`:** add an "API" section with the URL pattern `https://<pages-host>/api/v1/YYYY/YYYYMMDD.json`, the schema example from the Design section, the lookup expression, the date range, and the regeneration commands (backfill with `--source <local clone>/docs/v3`, daily with `--source http`). Replace `<pages-host>` with the real GitHub Pages host after checking the repository's Pages settings.
- [ ] **Step 3: Verify locally:** `node scripts/build.mjs --source http --from <yesterday> --to <yesterday> --out <scratch dir>` — expect exit 0 and one file whose `date` is yesterday.
- [ ] **Step 4: Commit and push** `feat: 日次更新のGitHub Actionsを追加する`. Ask the user before pushing.
- [ ] **Step 5: After push, trigger `workflow_dispatch` once** (`gh workflow run daily.yml`) and confirm the run is green, then confirm the published URL `…/api/v1/<yyyy>/<yyyymmdd>.json` returns 200 on GitHub Pages. If the bot's push does not trigger a Pages rebuild, report it to the user instead of working around it.
