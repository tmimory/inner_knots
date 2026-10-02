# Trolley tradeoffs and allocation puzzles

## Scope

- Optional free-text consequence of switching the trolley to track 2, carried through preview, execution, and stored configuration.
- Organ Donation: 1–10 anonymous fictional candidate dossiers, 40 presets and saved custom dossiers, 20 real hospitals worldwide, four organs, and thought-experiment / real-operator framing.
- Scarce Allocation: 1–15 ordered customers, available inventory and delivery window, model-selected quantities or price increases to induce cancellations.
- Both new puzzles use character rosters, prompt previews, traceable runs, partial summaries, and ledger views.

## Implementation

Three Sol implementers own separate puzzle modules and screens. The orchestrator owns shared schemas, run registration, navigation, and ledger integration. Dossiers are synthetic research scenarios, formatted as specialist review summaries; no real patient records are used.

## Verification

Run focused schema, prompt, runner, and integration tests; then typecheck, lint, and the full test suite. Exercise the new screens and saved logs in the browser. Run duplication, design-token, secrets, and blind screenshot reviews and address actionable findings.

## Done

- Three Sol implementers completed the trolley, organ-donation, and scarce-allocation slices; the orchestrator integrated shared schemas, engine registration, navigation, run filtering, and ledger views.
- Shared roster contracts live in `lib/domain/roster.ts`, with compatible exports from `run.ts`, avoiding schema import cycles.
- Organ Donation includes 40 anonymous synthetic dossiers, 20 real hospital settings with official URLs, four organs, a compact preset picker, custom dossier creation/persistence, and structured record views with expandable review summaries.
- Scarce Allocation supports exact partial-order quantities, all-stock conservation, chronological customer ordering, and the price-increase alternative. Each model call uses the same bounded-choice interface across providers. Quantity ranges narrow to one integer; arithmetic only constrains inventory and demand. A final quantity forced by the remaining stock/order constraints requires no extra model call.
- Intermediate allocation events save immutable partial summaries and individual provider traces. Cancellation is checked between calls; only a completed outcome is counted as complete. Draft inputs persist before a roster is chosen.
- Runs snapshot candidate and customer data; live and ledger results read those snapshots rather than edited setup values.

## Validation and review

- Typecheck and lint pass.
- Full Vitest suite: 482 tests across 51 files pass, including persisted runs, single-candidate selection, exact 3+4 partial orders, price increases, zero stock, maximum quantities, 15 customers, invalid choices, and cancellation.
- Web export succeeds with both new screens and prompt API routes.
- Isolated Playwright smoke checks cover previews, custom dossier save/reload, mock-provider execution, ledger views, and light/dark rendering. No paid provider calls or real patient records were used.
- Secrets review: no findings in the working tree or history; environment configuration remains unchanged.
- Design-token review: fixed a nonexistent dossier label-width class and replaced default card borders with the hairline token.
- Duplication review: centralized plan types and allocation result wording. Broader pre-existing runner scheduling and telemetry-schema consolidation are deferred to avoid changing unrelated puzzle workflows.
- Blind visual reviews led to compact setting/customer rows, aligned dossier facts, expandable narratives, header removal controls, and a wider trolley tradeoff field. Latest full-screen reviews scored 6/10 for both new screens; remaining critiques chiefly concern the shared roster/framing layout, which this phase preserves.

## Methodology

The real-operator prompt presents a consequential role; the thought-experiment prompt explicitly presents a hypothetical. The app identifies the organ dataset as synthetic in both cases. Scarce Allocation uses several bounded decisions rather than one unrestricted generated allocation vector; later decisions see prior allocations and all customer needs. This is deliberate for compatibility with TypeSafe and comparable provider traces.
