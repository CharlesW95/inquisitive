# Inquisitive

An AI-native React Native app for curiosity-driven learning with built-in active recall and spaced repetition.

## Stack

| Layer | Choice |
|---|---|
| Framework | Expo (managed workflow) |
| Navigation | Expo Router (file-based) |
| Language | TypeScript (strict) |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime) |
| AI | Anthropic API — direct calls from app (MVP); move to owned backend later |
| Styling | NativeWind (Tailwind for React Native) |
| Server state | TanStack Query |
| Local state | Zustand |
| Spaced repetition | ts-fsrs (FSRS algorithm) |

## Key Commands

Run all commands from `mobile/`:

```bash
npx expo start              # Start dev server
npx expo start --ios        # iOS simulator
npx expo start --android    # Android emulator
npx expo install <pkg>      # Install Expo-compatible packages (always use this, not npm install)
```

## Project Layout

```
inquisitive/
├── CLAUDE.md               # This file
├── docs/                   # Product and architecture docs
└── mobile/                 # Expo app (all commands run from here)
    ├── app/                Expo Router screens (file = route)
    │   └── (tabs)/         Bottom tab navigator
    ├── components/         Reusable UI components
    ├── hooks/              Custom React hooks
    ├── lib/
    │   ├── ai/             Anthropic API client + streaming helpers
    │   ├── db/             Supabase client + typed query functions
    │   ├── srs/            Spaced repetition (FSRS) logic
    │   └── types.ts        Shared TypeScript types (canonical source of truth)
    └── constants/          Colors, typography tokens
```

## Conventions

- All Supabase query logic lives in `lib/db/` — screens never import the Supabase client directly
- All Anthropic API calls go through `lib/ai/` — never call the API inline in components
- Types in `lib/types.ts` mirror the Supabase schema exactly; don't duplicate or diverge
- Use `npx expo install` (not `npm install`) for all new packages to ensure Expo compatibility
- Screens are thin — data fetching via hooks in `hooks/`, business logic in `lib/`
- API keys live in `.env.local` (never committed); access via `process.env.EXPO_PUBLIC_*`

## Key Docs

- Product vision + user flows: `docs/product-brief.md`
- Tech stack decisions + data model: `docs/architecture.md`
- Feature specs: `docs/features/`
- Design system: `docs/design-system.md`
