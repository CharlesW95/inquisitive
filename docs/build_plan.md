# Build Plan

A sequence of 8 focused sessions, each independently executable with a clear exit criterion. The critical path is 1 → 2 → 3 → 4 → 5; sessions 6 and 7 can flex in order. Auth is deferred to session 8 — all DB queries use a hardcoded `DEV_USER_ID` constant until then, so wiring real auth at the end requires no schema changes.

---

## Session 1 — Foundation & Design System

**Goal:** App runs with the correct folder structure, design tokens wired, and NativeWind working.

- Install all required deps: `nativewind`, `@supabase/supabase-js`, `@tanstack/react-query`, `zustand`, `ts-fsrs`, `@anthropic-ai/sdk`, `expo-font`
- Delete default Expo template boilerplate; establish the folder structure from `architecture.md` (`app/`, `components/ui/`, `components/domain/`, `lib/ai/`, `lib/db/`, `lib/srs/`, `hooks/`, `constants/`)
- Write `constants/colors.ts`, `constants/typography.ts`, `constants/spacing.ts`, `constants/radius.ts` from design system doc
- Configure NativeWind (`tailwind.config.js`, `babel.config.js`, `global.css`)
- Root `_layout.tsx` with `QueryClientProvider`
- Placeholder tab screens (`index.tsx`, `review.tsx`, `library.tsx`) that just render the screen name
- Fix root `CLAUDE.md` to reflect actual app path (`inquisitive/inquisitive/`, not `mobile/`)

**Exit criteria:** `npx expo start` shows a dark-background app with the tab bar.

---

## Session 2 — Home Screen UI

**Goal:** Full pixel-faithful home screen with all 5 sections, using static/hardcoded data.

- `lib/types.ts` — all shared TypeScript types (mirrors DB schema)
- `components/ui/` primitives: `SectionHeader`, `TopicTag`, `ChatBar`
- `components/domain/`: `ReviewCard`, `ExploreCard`, `ConversationRow`
- `app/(tabs)/index.tsx` — Welcome, Review carousel, Explore grid, Continue list, sticky ChatBar
- ChatBar tap routes to `app/conversation/new.tsx` (empty screen for now)

**Exit criteria:** Home screen renders with hardcoded data; chat bar is visible and tappable.

---

## Session 3 — Conversation Screen + Streaming AI

**Goal:** Users can start and continue text conversations with streaming AI responses saved to Supabase.

- `lib/db/client.ts` — Supabase singleton
- `lib/db/conversations.ts` — CRUD for `conversations` + `messages`; all queries scope by `user_id` using `DEV_USER_ID` constant
- `lib/ai/client.ts` — Anthropic singleton
- `lib/ai/chat.ts` — streaming chat with full conversation history
- `hooks/useConversations.ts` — TanStack Query wrappers
- `app/conversation/new.tsx` — creates conversation, routes to `[id]`
- `app/conversation/[id].tsx` — chat UI: message list, input bar, streaming token-by-token display, saves assistant message on stream complete
- `.env.local` with `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_ANTHROPIC_API_KEY`

**Exit criteria:** Type a message, see streaming AI response, refresh and history persists.

---

## Session 4 — Automatic Card Generation

**Goal:** Cards are generated in the background after each AI response and visible inline in the conversation.

- `lib/ai/card-generation.ts` — prompt + structured output parser for all 4 modalities
- `lib/db/cards.ts` — CRUD for `cards`, `card_schedules` (created alongside each new card), `review_attempts`; all queries scope by `user_id` using `DEV_USER_ID`
- `lib/db/topics.ts` — upsert topics + join tables
- Background trigger: after stream complete, call card generation, save cards + initial FSRS schedule
- `components/domain/GeneratedCard` — inline card chip in conversation (shows count, dismissible)

**Exit criteria:** Finish a conversation exchange; cards appear inline; visible in Supabase dashboard.

---

## Session 5 — Review Screen & FSRS

**Goal:** Due cards surface for review; answering updates the FSRS schedule.

- `lib/srs/scheduler.ts` — `ts-fsrs` wrapper: `getNextSchedule(card, rating)` → next due date
- `hooks/useDueCards.ts` — fetch `card_schedules` where `due <= now()`
- `hooks/useCardReview.ts` — mutation: write `review_attempts`, upsert `card_schedules`
- `app/(tabs)/review.tsx` — "X cards due" CTA, launches review session
- `app/card/[id].tsx` — single card review: all 4 modalities (flashcard self-score, multiple choice, active text input with LLM scoring, teach-me with LLM feedback)

**Exit criteria:** Complete a review session; re-fetch shows updated due dates.

---

## Session 6 — Library Screen

**Goal:** Users can browse all their cards and conversations, organized by topic.

- `app/(tabs)/library.tsx` — two sections: Conversations list + Cards list; topic filter chips at top
- Wire existing hooks/db functions (no new data layer needed)
- Card tap → `app/card/[id].tsx`; conversation tap → `app/conversation/[id].tsx`

**Exit criteria:** Library shows real data from Supabase; topic filter works.

---

## Session 7 — Home Screen Live Data + End-to-End Polish

**Goal:** Home screen shows real data; full user flow works end-to-end.

- Wire home "Review" section to real `useDueCards` count
- Wire "Continue" section to real recent conversations
- Explore section: hardcoded curated topics (personalization is post-MVP)
- End-of-conversation flow: modal/banner inviting user to review newly generated cards
- Loading states, empty states, error toasts throughout

**Exit criteria:** Full user flow from cold launch through conversation → cards → review works without hardcoded data.

---

## Session 8 — Auth Flow

**Goal:** Real user auth replaces the `DEV_USER_ID` stub; app is ready for multiple users.

- `app/(auth)/_layout.tsx` + `app/(auth)/sign-in.tsx` — magic link email input screen
- Root layout wired to `supabase.auth.onAuthStateChange`; redirects to `(auth)/sign-in` when unauthenticated
- Replace all `DEV_USER_ID` usages in `lib/db/` with `session.user.id`
- SQL: `profiles` table with trigger to auto-create on `auth.users` insert; enable RLS on all tables with `user_id = auth.uid()` policies
- Seed script or instructions to migrate dev data to a real user account

**Exit criteria:** Unauthenticated launch → sign-in screen; magic link → home tab; data is user-scoped.
