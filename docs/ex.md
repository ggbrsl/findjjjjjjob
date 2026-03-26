  Build a Node.js CLI scraper for Boss Zhipin (zhipin.com) job listings using Chrome DevTools Protocol (CDP) without any headless browser libraries.

  ## Core Requirements

  **Architecture:**
  - Pure Node.js ESM (type: "module"), only dependency: `ws` for WebSocket
  - Control Chrome via CDP over WebSocket (port 9222 by default)
  - Auto-launch Chrome with a dedicated user profile if not already running
  - Intercept XHR responses by listening to `Network.responseReceived` events — do NOT parse HTML DOM

  **Commands:**
  1. `list` — navigate to a search URL, intercept `/wapi/zpgeek/search/joblist.json` responses, scroll to trigger pagination, collect jobs
  2. `search` — same as list but opens a new tab first
  3. `detail` — read an existing JSON output, fetch JD text for each job via `Runtime.evaluate` (injecting `fetch()` with credentials)

  **Anti-detection:**
  - Inject realistic scroll behavior via `Runtime.evaluate`: simulate wheel events + smooth scrollTo at multiple checkpoints
  - Add gaussian-distributed random delays between requests (not uniform random)
  - Simulate mouse movements and visibility events before fetching detail

  **Data model per job:**
  id, security_id, lid, title, salary, company, city, district, experience, degree, skills[], company_size, company_stage, industry, boss_name, boss_title, job_url, jd (null
  initially), fetched_at

  **Output format:**
  ```json
  {
    "meta": { "query", "city", "city_code", "total", "fetched_count", "total_count", "updated_at" },
    "jobs": [...]
  }

  Login check: use Network.getCookies to verify wt2 and __zp_stoken__ cookies exist before scraping

  CLI options:
  --query, --city (name→code mapping for 50+ Chinese cities), --page, --count (auto-calculate scroll rounds), --delay, --slow, --output, --input, --cdp-port, --verbose,
  --no-auto-start, --skip-login-check

  File structure:
  - boss.js (entry, 3 lines)
  - index.js (all command logic + Chrome management)
  - model.js (raw API → job struct mapping)
  - cities.js (city name → code map)
  - shared/cdp-client.js (WebSocket CDP client with send/on/off/close)
  - shared/json-io.js (loadJsonFile / saveJsonFile with Unicode unescape)
  - shared/runtime.js (sleep, jitter, gaussianJitter, writeLine, writeError)

  Implement incremental saving (every 5 items for detail, every scroll for list) so progress survives interruption. Merge strategy: don't overwrite existing jd when re-running
  list.
  ```