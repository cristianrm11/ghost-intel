# Ghost Intel

> AI-powered career intelligence pipeline — aggregate, normalize, and query job market data with Claude.

Part of the **Ghost Suite** — a portfolio of browser automation tools targeting the software engineering job market.

---

## What it does

Ghost Intel runs a continuous ETL pipeline across public job APIs:

1. **Fetch** — pulls raw job postings from RemoteOK, Adzuna, and HN Who's Hiring
2. **Normalize** — Claude Haiku extracts structured data: skills, seniority, salary, remote status
3. **Analyze** — Claude Sonnet generates executive market reports with trend narratives
4. **Search** — natural language queries score and rank stored jobs by relevance

---

## Architecture

```
Sources              Pipeline              CLI
─────────────────    ──────────────────    ──────────────────────────────
RemoteOK  ──────┐                         ghost-intel setup
Adzuna    ──────┼──▶ normalizer.ts   ──▶  ghost-intel fetch
HN Hiring ──────┘    (Claude Haiku)       ghost-intel analyze [days]
                      │                   ghost-intel search [query]
                      ▼
               ~/.ghost-intel/
               ├── config.json
               ├── jobs.json     ◀── NormalizedJob store (atomic writes)
               └── seen.json     ◀── dedup index
```

---

## Commands

### `ghost-intel setup`
Interactive prompt to configure API keys and search keywords.

```
◆ Ghost Intel — Setup
│
◆ Anthropic API key
│  sk-ant-...
│
◆ Configure Adzuna?
│  ● Yes  ○ No
│
◆ Search keywords (comma-separated)
│  browser automation, playwright, puppeteer, typescript
│
◆ Max jobs per source per fetch
│  50
│
◇ Config saved to ~/.ghost-intel/config.json
```

### `ghost-intel fetch`
Pulls new jobs, normalizes with Claude, saves to local store.

```
◆ Ghost Intel — Fetch Jobs
│  Keywords: browser automation, playwright | Max per source: 50
│
◇ RemoteOK: 12 jobs found
◇ Adzuna: 31 jobs found
◇ HN: 8 jobs found
│  51 total | 0 already seen | 51 new
│
◇ Normalizing... 51/51
◇ Normalized 49/51 jobs

◇ Done! 49 jobs saved. Total in store: 49
```

### `ghost-intel analyze [days]`
Generates a market intelligence report for the last N days (default: 30).

```
═══ GHOST INTEL MARKET REPORT ═══
Generated: 6/29/2026, 10:30:00 AM
Jobs analyzed: 49 | Sources: remoteok, adzuna, hn

Market Overview
[AI-generated 3-paragraph narrative]

Top Required Skills
  TypeScript                ████████████████████ 38
  Node.js                   █████████████████    32
  Playwright                ████████████         23
  React                     ██████████           19
  ...

Top Hiring Companies        Seniority Breakdown
  1. Acme Corp (4 openings)   senior     42% (21 jobs)
  2. StartupXYZ (3 openings)  mid        31% (15 jobs)
  ...                         junior     12% (6 jobs)

Remote Work: 78% of roles are fully remote
```

### `ghost-intel search [query]`
Natural language job search using Claude to score relevance.

```
$ ghost-intel search "senior remote playwright typescript $150k+"

Results for: "senior remote playwright typescript $150k+"
────────────────────────────────────────────────────────────

1. Senior Automation Engineer @ Stripe
   92% match | Remote | senior | $145k–$175k
   Matches all core skills: Playwright, TypeScript, senior level
   https://stripe.com/jobs/...
   Skills: TypeScript, Playwright, Node.js, CI/CD, GitHub Actions

2. Staff Test Engineer @ Linear
   87% match | Remote | staff | $160k–$200k
   Strong match on automation stack, slightly above target seniority
   https://linear.app/jobs/...
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (ESM, strict) |
| AI | Claude Haiku (normalize) + Claude Sonnet (analyze, search) |
| Sources | RemoteOK API, Adzuna Jobs API, HN Algolia API |
| Storage | JSON file store with atomic writes (no native deps) |
| CLI | @clack/prompts + picocolors |

---

## Sources

| Source | Auth | Coverage | Notes |
|--------|------|----------|-------|
| RemoteOK | None | Remote-first tech jobs | Free public API |
| Adzuna | Free API key | 50+ job boards aggregated | 1000 req/month free |
| HN Who's Hiring | None | Curated engineer-to-engineer | Monthly thread |

---

## Setup

```bash
git clone https://github.com/cristianrm11/ghost-intel
cd ghost-intel
npm install

# First run — interactive config
npm run setup

# Start fetching
npm run fetch

# Generate market report (last 7 days)
npm run analyze -- 7

# Search stored jobs
npm run search -- "remote playwright engineer"
```

**Requires:** Node.js 18+, Anthropic API key. Adzuna optional (enhances coverage).

---

## Privacy

All data is stored locally at `~/.ghost-intel/`. No data is sent to any server except:
- Anthropic API (job text for normalization/analysis)
- Job source APIs (keyword queries only)

---

## License

MIT
