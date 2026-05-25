# Build Plan

A sequence of 11 focused sessions, each independently executable with a clear exit criterion. The critical path is 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8; sessions 9 and 10 can flex in order. Auth is deferred to session 11 — all DB queries use a hardcoded `DEV_USER_ID` constant until then, so wiring real auth at the end requires no schema changes.

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

## Session 6 — Card List, Create & Edit

**Goal:** Users can view, create, edit, and delete cards linked to a conversation via a dedicated card list screen and card form screen.

#### Routing changes

Rename `app/conversation/[id].tsx` → `app/conversation/[id]/index.tsx` (no logic changes — Expo Router treats these identically). This enables sibling routes under the same dynamic segment.

New screens:
- `app/conversation/[id]/cards.tsx` — card list screen
- `app/card/new.tsx` — create card form (receives `conversationId` as a search param)
- `app/card/[id]/edit.tsx` — edit card form (receives `cardId` in path; `app/card/[id]/index.tsx` reserved for Session 7 review)

#### Data layer

- `lib/db/cards.ts` — add `getConversationCards(conversationId)`, `createCard(conversationId, userId, front, back, modality)`, `updateCard(cardId, front, back)`, `deleteCard(cardId)`; `createCard` also inserts a default `card_schedules` row (FSRS new-card defaults)
- `hooks/useConversationCards.ts` — TanStack Query wrapper around `getConversationCards`, ordered `created_at` asc; invalidated after create, update, or delete

#### Card list screen — `app/conversation/[id]/cards.tsx`

**Nav bar:** back chevron (left) | `"{N} Cards"` title (center, updates reactively) | no right element

**With cards (ScrollView):** 16px horizontal padding, 12px vertical padding, 12px gap between cards.

Each card item — `colors.surface` background, 12px border radius, 16px padding:
- Front text: `PlayfairDisplay-Bold`, ~17px, `colors.textPrimary` (white), full text shown (no truncation), flex: 1, right-padded to avoid overlap with menu icon
- `···` menu icon: top-right, `colors.textMuted`; tapping opens a small inline popover (dark surface, 8px radius) anchored below the icon with two rows:
  - `✏️ Edit` — navigates to `app/card/[id]/edit.tsx`
  - `🗑️ Delete` — opens the delete confirmation modal (see below)
- Thin horizontal rule (~1px, `colors.border`) between front and back
- Back text: `PlayfairDisplay`, ~15px, `colors.textSecondary` (muted), full text shown

**Empty state (0 cards):** vertically and horizontally centered between nav bar and bottom button:
- Stack/layers icon (`square.stack`) in a circular `colors.accentSubtle` badge (~60px)
- `"No cards yet"` — `PlayfairDisplay-Bold`, ~22px, `colors.textPrimary`
- `"As you have a conversation, cards will automatically be created here. You can also create your own cards."` — Inter, ~14px, `colors.textSecondary`, centered, max-width 260px

**Bottom button (both states):** `"＋ New card"` — full width minus 32px horizontal margin, 52px tall, `colors.accent` (yellow) background, `colors.background` text, Inter-SemiBold, pill radius (26px), pinned above safe area; navigates to `app/card/new.tsx?conversationId={id}`

#### Delete confirmation modal

Native-style `Modal` over a semi-transparent dark overlay. Centered dialog — `colors.surface` background, 16px radius, 280px wide, 24px padding:
- Title: `"Are you sure?"` — `PlayfairDisplay-Bold`, ~20px, `colors.textPrimary`, centered
- Subtitle: `"This action cannot be undone."` — Inter, ~14px, `colors.textSecondary`, centered, 8px below title
- Thin horizontal rule below subtitle
- Two buttons side-by-side, separated by a vertical rule:
  - Left: `"Cancel"` — Inter-SemiBold, `colors.textPrimary`
  - Right: `"Yes"` — Inter-SemiBold, `#E05252` (red/destructive)
- `"Yes"` calls `deleteCard`, invalidates card list query, dismisses modal

#### Create card screen — `app/card/new.tsx`

**Nav bar:** back chevron (left) | `"New card"` (center) | `"✓ Save"` (right, `colors.accent`, disabled/muted when either field is empty)

**Body (no scroll needed for MVP):**
- **QUESTION section:**
  - Label: `"QUESTION"` — Inter, 11px, uppercase, letter-spaced, `colors.accent`
  - `TextInput`: placeholder `"What's the question on the front of the card?"` — `PlayfairDisplay`, ~20px, `colors.textPrimary`, multiline, no border, auto-expands; **max 200 characters**
  - Character counter shown below the input only when ≥ 160 characters typed (e.g. `"180 / 200"`), Inter 11px, `colors.textMuted`; turns `#E05252` at the limit
  - Thin horizontal rule below
- **ANSWER section:**
  - Label: `"ANSWER"` — Inter, 11px, uppercase, letter-spaced, `colors.textMuted`
  - `TextInput`: placeholder `"What's the answer or explanation?"` — `PlayfairDisplay`, ~17px, `colors.textPrimary`, multiline, no border, auto-expands; **max 500 characters**
  - Character counter shown below the input only when ≥ 400 characters typed (e.g. `"420 / 500"`), same style as above

Tapping `"✓ Save"` calls `createCard` with the `conversationId` param, then navigates back to the card list; card list query is invalidated so the new card appears immediately.

#### Edit card screen — `app/card/[id]/edit.tsx`

Identical layout to Create card, with these differences:
- Nav title: `"Edit card"`
- Fields pre-populated with the card's existing `front` and `back`
- Below the answer input, ~24px gap: `"🗑️ Delete this card"` — trash icon + Inter ~13px `colors.textMuted` text, tappable; opens the same delete confirmation modal; on confirm, deletes card, navigates back to card list
- `"✓ Save"` calls `updateCard`, then navigates back to card list; card list query invalidated

**Exit criteria:** Tapping the nav bar stack icon from a conversation opens the card list; card count in the title matches the nav bar count; a new card can be created and appears in the list; a card can be edited and the change persists; deleting a card via either the `···` menu or the edit screen shows the confirmation modal, removes the card from the list, and decrements the nav bar count in the conversation screen.

---

## Session 7 — Chat UI Redesign + Keep Exploring

**Goal:** Redesign the conversation screen so AI responses feel like editorial prose, not chat bubbles; add a "Keep Exploring" follow-up suggestions panel after the latest AI response.

#### Visual treatment

- **User messages** — keep the existing bubble style (rounded pill, `colors.surface` background, right-aligned)
- **AI responses** — remove the bubble entirely; render text full-width in `PlayfairDisplay` serif font, left-aligned, floating in space. Timestamp stays below the text in the same muted style. No background, no border, no radius.
- Padding/spacing between messages should feel generous — treat AI responses as editorial prose, not chat items

#### Keep Exploring panel

Appears below the **most recent AI response only** (not on historical messages). Rendered as part of the message list, directly after that message.

**Layout:**
- Thin horizontal rule, then `"KEEP EXPLORING"` label — Inter, 11px, uppercase, letter-spaced, `colors.accent` (gold/yellow)
- 3 numbered follow-up question rows (01, 02, 03); each row: number in `colors.textMuted`, question text in `colors.textPrimary`, `↗` arrow icon on the right; thin horizontal rules between rows
- Tapping a row pre-fills the chat input with that question (user can edit before sending)

**Data generation — separate Haiku 4.5 call (Option B):**

Fire a **Haiku 4.5** call inside the same `onComplete` callback used for card generation, immediately after the main stream finishes. This mirrors the established card-generation pattern: cheap, async, non-blocking. The main chat prompt is left untouched — the two concerns stay fully decoupled and independently tunable.

Prompt shape:
> *Given this conversation exchange, suggest 3 short follow-up questions the user might want to ask next to deepen their understanding. Questions should feel genuinely curious — not generic. Return JSON only: `["question 1", "question 2", "question 3"]`.*

~~Store suggestions transiently in component state.~~ **Addendum:** Suggestions are persisted locally via a Zustand store (`src/stores/suggestionsStore.ts`) backed by AsyncStorage, keyed by `conversationId`. They survive navigation and app restarts; they are cleared when the user sends a new message. While suggestions are loading, show 3 grey placeholder rows with a subtle shimmer.

#### Main chat prompt updates

Update the system prompt in `lib/ai/chat.ts` with three additions:

1. **Markdown output** — instruct the model to respond in Markdown. The UI will render it (see implementation tasks below).
2. **Conciseness + structure** — instruct the model to prefer brevity and to use structural elements (bold headers, bullet lists, tables) where they improve clarity over running prose.
3. **No trailing question** — explicitly instruct the model not to end its response with a question. Follow-up prompts are handled by the Keep Exploring panel; a question at the end of the prose would duplicate and undercut that feature.

Concrete additions to the system prompt:
> *Respond in Markdown. Use bold headers, bullet lists, and tables when they improve clarity — prefer structure over long prose. Be concise: say what needs to be said, nothing more. Do not end your response with a question.*

#### Implementation tasks

- Update the system prompt in `lib/ai/chat.ts` with the three additions above
- Update `app/conversation/[id]/index.tsx`:
  - Change AI message rendering: remove bubble container, render Markdown via a lightweight library (`react-native-markdown-display`); apply `PlayfairDisplay` serif as the base body font in the Markdown style map; full-width layout
  - After the last AI message in the `FlatList`, render `<KeepExploring>` component if suggestions are available (or loading)
  - In `onComplete`, fire `generateFollowUpQuestions(title, userMessage, aiResponse)` in parallel with card generation; store result in `useState`
- `lib/ai/suggestions.ts` — Haiku 4.5 call; export `generateFollowUpQuestions(title, userMessage, aiResponse): Promise<string[]>`
- `components/domain/KeepExploring.tsx` — panel component; accepts `questions: string[] | null` (null = loading state); calls `onSelect(question)` prop when a row is tapped
- Reset suggestions to `null` whenever the user sends a new message (so old suggestions disappear while new ones load)

**Exit criteria:** AI responses render in serif font with no bubble; the Keep Exploring panel appears below the latest AI response with 3 tappable suggestions; tapping one pre-fills the input; sending a new message clears the panel until the next response completes.

---

## Session 8 — Review Screen & FSRS

**Goal:** Due cards surface for review; answering updates the FSRS schedule.

- `lib/srs/scheduler.ts` — `ts-fsrs` wrapper: `getNextSchedule(card, rating)` → next due date
- `hooks/useDueCards.ts` — fetch `card_schedules` where `due <= now()`
- `hooks/useCardReview.ts` — mutation: write `review_attempts`, upsert `card_schedules`
- `app/(tabs)/review.tsx` — "X cards due" CTA, launches review session
- `app/card/[id].tsx` — single card review: all 4 modalities (flashcard self-score, multiple choice, active text input with LLM scoring, teach-me with LLM feedback)

**Exit criteria:** Complete a review session; re-fetch shows updated due dates.

---

## Session 9 — Library Screen

**Goal:** Users can browse all their cards and conversations, organized by topic.

- `app/(tabs)/library.tsx` — two sections: Conversations list + Cards list; topic filter chips at top
- Wire existing hooks/db functions (no new data layer needed)
- Card tap → `app/card/[id].tsx`; conversation tap → `app/conversation/[id].tsx`

**Exit criteria:** Library shows real data from Supabase; topic filter works.

---

## Session 10 — Home Screen Live Data + End-to-End Polish

**Goal:** Home screen shows real data for all remaining sections; full user flow works end-to-end.

- Wire home "Review" section to real `useDueCards` count
- Explore section: hardcoded curated topics (personalization is post-MVP)
- End-of-conversation flow: modal/banner inviting user to review newly generated cards
- Loading states, empty states, error toasts throughout

**Exit criteria:** Full user flow from cold launch through conversation → cards → review works without hardcoded data.

---

## Session 11 — Auth Flow

**Goal:** Real user auth replaces the `DEV_USER_ID` stub; app is ready for multiple users.

- `app/(auth)/_layout.tsx` + `app/(auth)/sign-in.tsx` — magic link email input screen
- Root layout wired to `supabase.auth.onAuthStateChange`; redirects to `(auth)/sign-in` when unauthenticated
- Replace all `DEV_USER_ID` usages in `lib/db/` with `session.user.id`
- SQL: `profiles` table with trigger to auto-create on `auth.users` insert; enable RLS on all tables with `user_id = auth.uid()` policies
- Seed script or instructions to migrate dev data to a real user account

**Exit criteria:** Unauthenticated launch → sign-in screen; magic link → home tab; data is user-scoped.
