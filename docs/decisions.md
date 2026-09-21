# Decisions

- **2026-09-21 — Expo API routes as the local backend.** Keeps API keys off the client bundle, lets us write JSONL with Node `fs`, and reaches local LLMs, all with one `npm run dev`. Alternative (browser-only with `dangerouslyAllowBrowser`) rejected because keys would ship in the bundle.
- **2026-09-21 — Append-only JSONL with replay for entity collections.** Matches the "review with cat/jq" goal, trivial to implement, and gives free edit history. Files are small (hundreds of rows).
- **2026-09-21 — Polling instead of SSE for run progress.** Simpler on React Native, no connection handling, one-second latency is fine for runs that take seconds to minutes.
- **2026-09-21 — Prompts as markdown with frontmatter.** Editable by non-programmers; the composer validates variables so a typo in a template fails loudly at load time.
- **2026-09-21 — Trolley object catalogue built from a small grammar.** Objects are generated from `subject × relation × modifier` tables plus a hand-written list of singular items, so "your neighbor's eldest daughter" exists without listing hundreds of rows by hand. See phase 5.
- **2026-09-21 — Easing curves stored as bezier control points.** `theme/tokens.ts` keeps `easings.standard` as `[0.65, 0, 0.35, 1]` rather than a `cubic-bezier(...)` string or a Reanimated `Easing` value, because the Node CSS generator imports that file directly: plain data is the only form both the web build (`--easing-standard`, a Tailwind `transitionTimingFunction`) and native (`Easing.bezier(...)`) can spell out from one source.
