# Implementation plan

Sequential phases. Each phase ends with: type-check passes, app boots, the phase doc gets a "Done" note listing what shipped and any deviations, and one commit named `phase N: <title>`. Independent work inside a phase runs in parallel subagents.

1. **Scaffold, theme, shell** — Expo + Router + NativeWind + API routes, theme tokens, fonts, UI kit, left menu.
2. **Domain, storage, prompts** — zod types, JSONL store, prompt loader/composer, CRUD API routes.
3. **Provider layer** — factory + 5 adapters, structured/tool modes, effort, token clamp, tracing.
4. **Characters** — avatars, editor, list/search, final prompt preview.
5. **Trolley problems** — object catalogue + creator, tracks, variants, run engine, animation, histogram.
6. **Prisoner's dilemma** — relationships, variants, payoffs, iterated mode, side-by-side prompts and histograms.
7. **Choose your own adventure** — React Flow builder, amnesia toggle, run, outcome visualizer.
8. **Logs** — run list, run detail with span tree and full context.
9. **Polish and review** — critic passes, README, CLAUDE.md commands.
