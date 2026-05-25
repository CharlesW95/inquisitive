# Build Plan

A sequence of 10 focused sessions, each independently executable with a clear exit criterion. The critical path is 1 → 2 → 3 → 4 → 5 → 6 → 7; sessions 8 and 9 can flex in order. Auth is deferred to session 10 — all DB queries use a hardcoded `DEV_USER_ID` constant until then, so wiring real auth at the end requires no schema changes.

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

## Session 4 — Home Screen Live Conversations + Paginated Message Loading

**Goal:** The home screen "Continue" section loads real conversations from Supabase; returning to a long conversation loads only recent messages first and lazy-loads older ones as the user scrolls up.

**Context:** `useConversations`, `useMessages`, and `getMessages` were all created in Session 3. `app/conversation/[id].tsx` already calls `useMessages(id)` on mount, so navigating back to an existing conversation already restores its history. The gaps are (a) the home screen still uses hardcoded rows, and (b) `getMessages` is an unbounded `SELECT *` — no limit, no cursor — which loads the full message history in one shot regardless of length.

#### Home screen wiring

- `app/(tabs)/index.tsx` — replace hardcoded Continue rows with `useConversations()` (already exported from `hooks/useConversations.ts`); take the 5 most recent by `updated_at` desc; show a loading skeleton while fetching and an empty state ("No conversations yet — start one below") when the list is empty
- Tapping a row navigates to `app/conversation/[id].tsx`
- Card counts in Continue rows and the conversation nav bar are hardcoded to `0` for now — wired to real data in Session 5 once the cards table exists

#### Paginated message loading

- `lib/db/conversations.ts` — add `getMessagePage(conversationId, limit, beforeCursor?)`: fetches `limit` messages with `created_at < beforeCursor` (or the most recent `limit` if no cursor), ordered `created_at DESC`, then reverses to ascending order before returning. Page size: **30 messages** (≈ 15 exchanges).
- `hooks/useConversations.ts` — replace `useMessages` with `usePagedMessages(conversationId)`:
  - Initial fetch: calls `getMessagePage(id, 30)` — the 30 most recent messages
  - Exposes `loadOlderMessages()` action and `hasMore: boolean` (set to false when a page returns fewer than 30 items)
  - Prepends older pages to the message list; after prepend, restores scroll position so the view does not jump (measure content height before prepend, adjust `scrollTo` offset after)
- `app/conversation/[id].tsx`:
  - Replace `useMessages` with `usePagedMessages`
  - Add `onScroll` handler: when `contentOffset.y` drops below 200px from the top and `hasMore` is true and not already fetching, call `loadOlderMessages()`
  - Show a small activity indicator pinned to the top of the message list while an older page is loading
  - On initial load, scroll to bottom as before

**Exit criteria:** Create a conversation with 40+ messages (or seed Supabase directly); navigate away and back; only the 30 most recent load initially; scrolling to the top loads the older batch without the view jumping; the home screen Continue section shows real conversations and tapping one reopens it.

---

## Session 5 — Automatic Card Generation

**Goal:** Cards are generated silently in the background after each AI response; card counts are wired throughout the app. Card visibility and editing are deferred to Session 6.

#### Card generation approach

Use a single **Haiku 4.5** call per exchange — cheap, fast, and sufficient for extraction. The model self-gates: if the exchange contains nothing card-worthy it returns an empty array; otherwise it returns 1–2 cards. No separate "should I generate?" pre-check needed.

**Generation trigger:** Fire inside the `onComplete` callback in `streamChatResponse` (same place the assistant message is inserted), immediately after the AI response finishes. Skip generation entirely if the AI response is under ~100 tokens — those are clarifying/acknowledgment turns with no learnable content.

**Generation context:** Pass only the **latest user message + AI response** plus the conversation title. Do not pass full message history — scoping tightly avoids redundant cards, keeps costs flat, and ensures each card maps to a specific exchange.

**Prompt shape:**

> *You are a learning assistant creating flashcards from a conversation exchange.*
>
> *Given this exchange from a conversation titled '{title}', generate 0–2 flashcards worth adding to a spaced repetition deck.*
>
> *Guidelines for the **front** (the question):*
> *- Ask about causes, mechanisms, significance, or deeper "why/how" — not surface facts like dates or names*
> *- Frame it so answering requires genuine understanding, not recall of a single word*
>
> *Guidelines for the **back** (the answer):*
> *- Be concise and direct — no padding or restatement of the question*
> *- Use bullet points when listing multiple contributing factors or steps*
> *- Weave in specific names, dates, or facts only where they add concrete meaning*
>
> *Set `modality` to `"basic"` for most cards. Use `"quiz"` only when the concept lends itself to a specific right/wrong answer. If nothing in this exchange merits a standalone card, return an empty array.*
>
> *Existing cards for this conversation — avoid generating near-duplicates:*
> *{existingCardFronts — one bullet per front, omit section if none yet}*
>
> *Return JSON only: an array of `{ front, back, modality }` objects, or `[]`.*

Return schema: `Array<{ front: string; back: string; modality: 'basic' | 'quiz' }>`. Save nothing and skip incrementing the count when the array is empty.

#### Implementation tasks

- `lib/ai/card-generation.ts` — Haiku 4.5 call with the prompt above; JSON parse + validate response; export `generateCardsForExchange(title, userMessage, aiResponse, existingCardFronts: string[]): Promise<CardDraft[]>`
- `lib/db/cards.ts` — CRUD for `cards`, `card_schedules` (created alongside each new card), `review_attempts`; all queries scope by `user_id` using `DEV_USER_ID`
- `lib/db/topics.ts` — upsert topics + join tables
- Background trigger in `app/conversation/[id].tsx` — in `streamChatResponse`'s `onComplete`, skip if AI response is short, otherwise call `generateCardsForExchange`, save cards + initial FSRS schedule, then invalidate card count query
- **Wire card counts** — now that the `cards` table exists, update `getConversations` in `lib/db/conversations.ts` to use `.select('*, cards(count)')` (PostgREST embedded count); add `card_count: number` to the `Conversation` type in `lib/types.ts` (derived at query time, not stored); update `ConversationRow` on the home screen and the nav bar in `app/conversation/[id].tsx` to display the real count

**Exit criteria:** Finish a conversation exchange; cards are visible in Supabase dashboard; card count in the conversation nav bar and home screen Continue rows increments correctly. No card UI in the conversation yet.

---

## Session 6 — In-Conversation Card Review & Editing

**Goal:** Users can see, edit, and delete the cards generated from a conversation without leaving it.

- **Card list panel** — tapping the stack icon in the conversation nav bar opens a bottom sheet (or slide-over) listing all cards for this conversation; each row shows the card front, modality badge, and edit/delete actions
- `hooks/useConversationCards.ts` — TanStack Query wrapper for fetching all cards linked to a conversation, ordered by `created_at`
- `components/domain/CardRow` — single row in the card list: front text (truncated), modality badge (`BASIC` / `QUIZ`), edit icon, delete icon
- `components/domain/CardEditSheet` — bottom sheet with two text inputs (front / back), save and cancel actions; updates the card in Supabase on save and invalidates the card list query
- Delete action: confirm-on-press (single tap deletes with undo toast, or two-tap confirm — pick one and stay consistent); removes card from `cards` table, decrements count
- Card count in the nav bar updates reactively as cards are added, edited, or deleted

**Exit criteria:** After a conversation exchange generates cards, tapping the nav bar icon shows the card list; a card can be edited and saved; a card can be deleted; the nav bar count stays in sync.

---

## Session 7 — Review Screen & FSRS

**Goal:** Due cards surface for review; answering updates the FSRS schedule.

- `lib/srs/scheduler.ts` — `ts-fsrs` wrapper: `getNextSchedule(card, rating)` → next due date
- `hooks/useDueCards.ts` — fetch `card_schedules` where `due <= now()`
- `hooks/useCardReview.ts` — mutation: write `review_attempts`, upsert `card_schedules`
- `app/(tabs)/review.tsx` — "X cards due" CTA, launches review session
- `app/card/[id].tsx` — single card review: all 4 modalities (flashcard self-score, multiple choice, active text input with LLM scoring, teach-me with LLM feedback)

**Exit criteria:** Complete a review session; re-fetch shows updated due dates.

---

## Session 8 — Library Screen

**Goal:** Users can browse all their cards and conversations, organized by topic.

- `app/(tabs)/library.tsx` — two sections: Conversations list + Cards list; topic filter chips at top
- Wire existing hooks/db functions (no new data layer needed)
- Card tap → `app/card/[id].tsx`; conversation tap → `app/conversation/[id].tsx`

**Exit criteria:** Library shows real data from Supabase; topic filter works.

---

## Session 9 — Home Screen Live Data + End-to-End Polish

**Goal:** Home screen shows real data for all remaining sections; full user flow works end-to-end.

- Wire home "Review" section to real `useDueCards` count
- Explore section: hardcoded curated topics (personalization is post-MVP)
- End-of-conversation flow: modal/banner inviting user to review newly generated cards
- Loading states, empty states, error toasts throughout

**Exit criteria:** Full user flow from cold launch through conversation → cards → review works without hardcoded data.

---

## Session 10 — Auth Flow

**Goal:** Real user auth replaces the `DEV_USER_ID` stub; app is ready for multiple users.

- `app/(auth)/_layout.tsx` + `app/(auth)/sign-in.tsx` — magic link email input screen
- Root layout wired to `supabase.auth.onAuthStateChange`; redirects to `(auth)/sign-in` when unauthenticated
- Replace all `DEV_USER_ID` usages in `lib/db/` with `session.user.id`
- SQL: `profiles` table with trigger to auto-create on `auth.users` insert; enable RLS on all tables with `user_id = auth.uid()` policies
- Seed script or instructions to migrate dev data to a real user account

**Exit criteria:** Unauthenticated launch → sign-in screen; magic link → home tab; data is user-scoped.
