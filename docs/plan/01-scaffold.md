# Phase 1 — Scaffold, theme, shell

## Goal
A runnable Expo app with the left menu, theme system, fonts, UI kit, and a working API route. No puzzle logic yet.

## Checklist
- [ ] `npx create-expo-app` (SDK 57, TypeScript, Expo Router). Remove template screens.
- [ ] NativeWind 4 + Tailwind config wired to CSS variables. `web.output: "server"` so `app/api/**+api.ts` routes run.
- [ ] `theme/tokens.ts` scroll theme; `theme/global.css`; `theme/index.ts` with `vars()` + `useTheme()`.
- [ ] Fonts via `@expo-google-fonts/cinzel` and `@expo-google-fonts/cormorant-garamond`, loaded in `app/_layout.tsx`; Tailwind `font-display` / `font-body`.
- [ ] `components/ui/`: Button, Card, Input, Textarea, Select, Switch, Badge, Dialog, Tabs, Progress, Tooltip, Slider, Label, Separator, Toast. Variants via `class-variance-authority`.
- [ ] `components/shell/`: LeftMenu (Characters, Puzzles ▸ Trolley / Prisoner's Dilemma / Adventure, Logs), PageHeader, GreekKey ornament, Scroll surface.
- [ ] Routes: `/characters`, `/puzzles/trolley`, `/puzzles/prisoners-dilemma`, `/puzzles/adventure`, `/logs` with placeholder content. `/` redirects to `/characters`.
- [ ] `app/api/health+api.ts` returns `{ ok: true }`; a `lib/client/api.ts` fetch helper; the Characters placeholder screen shows the health result.
- [ ] `.env.example` gains every variable the app will read (see architecture) with comments. `data/` added to `.gitignore`.
- [ ] Scripts: `dev` (`expo start --web`), `typecheck`, `lint`.
- [ ] `npm run typecheck` passes. App boots with `npm run dev`.

## Done
_(fill in on completion)_
