# Phase 1 — Scaffold, theme, shell

## Goal
A runnable Expo app with the left menu, theme system, fonts, UI kit, and a working API route. No puzzle logic yet.

## Checklist
- [x] `npx create-expo-app` (SDK 57, TypeScript, Expo Router). Remove template screens.
- [x] NativeWind 4 + Tailwind config wired to CSS variables. `web.output: "server"` so `app/api/**+api.ts` routes run.
- [x] `theme/tokens.ts` scroll theme; `theme/global.css`; `theme/index.ts` with `vars()` + `useTheme()`.
- [x] Fonts via `@expo-google-fonts/cinzel` and `@expo-google-fonts/cormorant-garamond`, loaded in `app/_layout.tsx`; Tailwind `font-display` / `font-body`.
- [x] `components/ui/`: Button, Card, Input, Textarea, Select, Switch, Badge, Dialog, Tabs, Progress, Tooltip, Slider, Label, Separator, Toast. Variants via `class-variance-authority`.
- [x] `components/shell/`: LeftMenu (Characters, Puzzles ▸ Trolley / Prisoner's Dilemma / Adventure, Logs), PageHeader, GreekKey ornament, Scroll surface.
- [x] Routes: `/characters`, `/puzzles/trolley`, `/puzzles/prisoners-dilemma`, `/puzzles/adventure`, `/logs` with placeholder content. `/` redirects to `/characters`.
- [x] `app/api/health+api.ts` returns `{ ok: true }`; a `lib/client/api.ts` fetch helper; the Characters placeholder screen shows the health result.
- [x] `.env.example` gains every variable the app will read (see architecture) with comments. `data/` added to `.gitignore`.
- [x] Scripts: `dev` (`expo start --web`), `typecheck`, `lint`.
- [x] `npm run typecheck` passes. App boots with `npm run dev`.

## Done

Shipped 2026-09-21. The app boots, serves its own API, and every screen is reachable.

### What shipped

**Scaffold.** `npx create-expo-app@latest --template default` (Expo SDK 57.0.24, React 19.2.3, RN 0.86.3) generated into a temp dir; only the pieces we needed were copied in. Routes live at the repo root (`app/`, `components/`, `lib/`, `theme/`), not the template's `src/`. Template example screens, components, `reset-project.js`, and the Expo-branded assets were dropped; the icon, favicon, splash and Android adaptive icon images were kept.

**Styling.** NativeWind 4.2.7 with Tailwind 3.4.19 (NativeWind 4 requires Tailwind v3, not v4). `babel.config.js` (`jsxImportSource: "nativewind"` + `nativewind/babel`), `metro.config.js` (`withNativeWind`, input `./theme/global.css`), `nativewind-env.d.ts`.

**Theme.** `theme/tokens.ts` is the only file with literal design values. A generator, `scripts/build-theme-css.mjs`, derives two files from it and runs in `predev` / `prestart` / `prebuild`, so they cannot drift:

- `theme/global.css` — `:root` / `.dark` / `prefers-color-scheme` CSS variables plus the Tailwind directives.
- `theme/tailwind-tokens.cjs` — the `theme.extend` object that `tailwind.config.js` requires. Colors are `rgb(var(--color-x) / <alpha-value>)`; sizes and durations are emitted as literals derived from the tokens.

Two themes, `scroll` (parchment/iron-gall ink) and `nightScroll` (candlelit), share token keys. Every foreground/background pair clears 4.5:1. Also in tokens: 25-pigment `avatarPalette`, fonts, spacing, control heights, layout measures, radii, ink shadows, a named opacity scale (`opacity-disabled`, `opacity-hover`, and the color modifiers `bg-foreground/scrim`, `bg-muted/subtle`), motion durations, z-index layers, border widths, font sizes and line heights.

**Runtime theme.** `theme/provider.tsx` (`ThemeProvider`, `useTheme`, `useThemeName`), `theme/vars.ts` (NativeWind `vars()` for native), `theme/color.ts` (hex → `"r g b"`, camel → kebab; shared by the runtime and the generator).

**Fonts.** Cinzel (display), Cormorant Garamond (body), GFS Neohellenic (Greek subtitles — the package exists on npm, so it was included). Loaded with `expo-font` in `app/_layout.tsx` behind a splash hold that releases on load *or* error.

**UI kit** (`components/ui/`, shadcn API shape, `cva` variants, `cn()` from `lib/utils.ts`): Button, Card (+Header/Title/Description/Content/Footer), Input, Textarea (with the `n / max` counter), Select, Switch, Checkbox, Badge, Dialog, Tabs, Progress, Tooltip, Slider, Label, Separator, Text (h1–h4, p, lead, muted, small, greek, code) and a `ToastProvider` / `useToast`. Built on `@rn-primitives/*` 1.5.x where a primitive exists.

**Shell** (`components/shell/`): `AppShell` (fixed menu column above 900px, slide-over drawer below), `LeftMenu` (Characters, Puzzles ▸ three puzzles, Logs; active state from `usePathname`), `PageHeader`, `Scroll` surface, `GreekKey` meander ornament (react-native-svg, theme colors), `Wordmark`, and `nav-items.ts` — the one place a menu entry is declared.

**Backend.** `app/api/health+api.ts` (`GET` → `{ ok, time }`) served by `web.output: "server"`. `lib/client/api.ts` has `apiFetch<T>`, `apiUrl`, `apiBaseUrl` and an `ApiError` class; web uses a relative path, native reads `EXPO_PUBLIC_API_BASE_URL` (default `http://localhost:8081`).

**Env.** `.env.example` now lists all ten variables with provenance comments. `data/` is gitignored. No `.env` was created.

### Commands

```
npm install
npm run theme:css     # regenerate theme/global.css + theme/tailwind-tokens.cjs
npm run dev           # expo start --web (runs theme:css first)
npm run typecheck     # tsc --noEmit
npm run lint          # expo lint
npm test              # vitest run
```

Verified on 2026-09-21: `typecheck` clean, `lint` clean, `test` 4/4 passing (`cn()`), `dev` boots on :8081 — `GET /api/health` → `200 {"ok":true,...}`, `GET /` → `200 text/html` (66 KB SSR), `/characters`, `/puzzles/trolley`, `/puzzles/prisoners-dilemma`, `/puzzles/adventure`, `/logs` → 200. The SSR HTML contains both themes' CSS variables and the loaded font families.

### Deviations from the plan

1. **`app.config.ts` instead of `app.json`.** The splash and Android adaptive-icon background colors are design values; a TS config lets them come from `theme/tokens.ts` instead of being repeated as hex. Expo's config loader only transpiles the config file itself, so the import is written `./theme/tokens.ts` with the explicit extension (hence `allowImportingTsExtensions` in `tsconfig.json`).
2. **A second generated file, `theme/tailwind-tokens.cjs`.** `tailwind.config.js` must be CommonJS, and the plan left the tokens/Tailwind bridge open. Generating the `theme.extend` object keeps `tokens.ts` the only source and keeps every literal out of the Tailwind config.
3. **The generator reads `tokens.ts` directly** using Node's native TypeScript type stripping. This needs **Node ≥ 22.18** (developed on 22.22).
4. **Named Tailwind scales, not numeric.** Spacing, radii, font sizes, shadows, durations and z-index are named (`p-md`, `rounded-lg`, `text-base`, `shadow-ink-soft`, `duration-fast`, `z-overlay`), plus `h-control-{sm,md,lg,icon}` for control heights and `w-menu` / `max-w-content` for layout. `p-4` is off-scale by design, which makes a stray magic number easy to spot.
5. **Slider drag handling is hand-built.** `@rn-primitives/slider` is presentational and has no drag; a `PanResponder` over the track supplies it.
6. **`@expo-google-fonts/gfs-neohellenic` exists**, so the Greek subtitle face was included rather than skipped.
7. **Tailwind 3.4.19, not 4.x** — required by NativeWind 4.
8. **`@xyflow/react` is not installed yet.** Nothing in phase 1 renders a graph; phase 7 installs it (12.11.6 at time of writing).
9. **`vitest.config.mts`** rather than `.ts`, so Vite loads it as ESM without a warning.
10. **Checkbox** was added to the kit (a primitive existed and phase 5/6 will need it).

### Review

`duplication-critic` raised three findings, all applied: the repeated portal/overlay guard in Dialog/Select/Tooltip became `components/ui/overlay.tsx` (`overlayStyle`, `PortalledProps`); the token-category loops that `theme/vars.ts` and `scripts/build-theme-css.mjs` each maintained became one `scalarTokenGroups` registry in `theme/tokens.ts` that both iterate; and the left menu's duplicated row styling became `rowClasses` / `rowTextClasses`.

`design-token-critic` found no hex literals, palette classes or arbitrary-value classes anywhere outside `theme/tokens.ts` and the two generated files. Its one real finding — untokenized opacity (`opacity-50`, `opacity-90`, `bg-foreground/40`, `bg-muted/60` repeated across nine files) — was fixed by adding the `opacities` token group and replacing every literal. `secrets-critic` reported zero findings: no `.env` exists, `.env.example` holds placeholders only, and git history is clean. The nine provider/storage variables in `.env.example` are intentionally not read yet; phases 2-3 will read them.

### Notes for the next phase

- **Add a route:** create the file under `app/`, then add an entry to `components/shell/nav-items.ts` — the menu, active state and drawer all read from there.
- **Read a token in JS:** `const theme = useTheme()` → `theme.colors.track1`, `theme.radii.md`, `theme.durations.fast`, `theme.avatarPalette`. Use this only where a value must be passed as a prop (SVG fills, React Flow styles, chart colors); everywhere else use a class.
- **Add a token:** edit `theme/tokens.ts`, run `npm run theme:css`. Adding a color key automatically produces `bg-<key>` / `text-<key>` and the CSS variables for both themes. A whole new scalar category is one entry in `scalarTokenGroups` — the CSS generator and the native `vars()` builder both read that registry.
- **Add an overlay component:** reuse `overlayStyle` and `PortalledProps` from `components/ui/overlay.tsx` rather than re-deriving the native/web overlay guard.
- **Add an API route:** `app/api/<name>+api.ts` exporting `GET` / `POST`; call it with `apiFetch<T>("/api/<name>")`. Secrets are read with `process.env.X` inside those files only, and every new variable goes into `.env.example` in the same change.
- **Toasts:** `const { toast } = useToast()` anywhere under the root layout.
