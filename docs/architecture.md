# Architecture

## Tech Stack

### Expo (Managed Workflow)
Managed workflow gives us OTA updates, simplified native config, and EAS Build for App Store deploys without touching Xcode or Android Studio. Eject only if a required native module forces it.

### Expo Router
File-based routing that mirrors Next.js conventions. Route groups `(tabs)` for bottom nav, dynamic segments `[id]` for conversation/card screens. Layout files `_layout.tsx` handle shared UI and auth guards.

### Supabase
- **PostgreSQL** for all persistent data (conversations, messages, cards)
- **Auth** for user identity (email/magic link for MVP)
- **Row-level security (RLS)** enabled on all tables — users can only read/write their own data
- **Realtime** available if we want live card sync across devices later

### Anthropic API (Direct, MVP)
The API key is stored in `.env.local` as `EXPO_PUBLIC_ANTHROPIC_API_KEY`. This is acceptable for MVP/personal use but **must move to an owned backend before public launch** — a client-side API key is visible to anyone who inspects network traffic.

Use streaming responses (`stream: true`) for the chat experience so messages render token-by-token.

Default model: `claude-sonnet-4-6` for all AI calls.

### NativeWind
Tailwind CSS utility classes for React Native. Configured via `tailwind.config.js` + `babel.config.js`. Use the `className` prop on all components.

### TanStack Query
Handles all async server state: fetching, caching, background refetch, optimistic updates. Every Supabase query is wrapped in a `useQuery` or `useMutation` hook in `hooks/`.

### ts-fsrs
Implementation of the FSRS spaced repetition algorithm (successor to SM-2). Handles scheduling next review dates based on user's recall rating. All SRS logic lives in `lib/srs/`.

---

## Database Schema

### `profiles`
1:1 with `auth.users`. Created automatically on user sign-up.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, FK → auth.users |
| `timezone` | text | For scheduling review notifications at sensible hours |
| `notifications_enabled` | bool | Default true |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `topics`
Per-user, normalized. Two-level hierarchy (domain → subtopic) enforced in application code — not the schema.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users |
| `parent_id` | uuid | FK → topics (nullable) — null = top-level domain |
| `name` | text | AI-normalized, title case (e.g. "Roman Empire") |
| `slug` | text | Lowercase hyphenated (e.g. "roman-empire") |
| `created_at` | timestamptz | |

Unique constraint on `(user_id, parent_id, slug)` — allows "Military" to exist independently under different parent domains.

### `conversations`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users |
| `title` | text | AI-generated from first message |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `conversation_topics`
| Column | Type | Notes |
|---|---|---|
| `conversation_id` | uuid | FK → conversations |
| `topic_id` | uuid | FK → topics |

Primary key on `(conversation_id, topic_id)`.

### `messages`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `conversation_id` | uuid | FK → conversations |
| `role` | text | `user` \| `assistant` |
| `content` | text | |
| `created_at` | timestamptz | |

### `cards`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users |
| `conversation_id` | uuid | FK → conversations (nullable) |
| `source_message_id` | uuid | FK → messages (nullable) — the message that triggered card generation |
| `prompt` | text | Question / front of card |
| `answer` | text | Canonical correct answer text for all modalities |
| `modality` | text | `flashcard` \| `multiple_choice` \| `active` \| `teach_me` |
| `metadata` | jsonb | Modality-specific extras only — e.g. distractor choices for `multiple_choice`, rubric for `teach_me` |
| `deleted_at` | timestamptz | Soft delete — null means active |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `card_topics`
| Column | Type | Notes |
|---|---|---|
| `card_id` | uuid | FK → cards |
| `topic_id` | uuid | FK → topics |

Primary key on `(card_id, topic_id)`.

### `card_schedules` (FSRS state)
One row per card. Created when a card is generated; updated on every review. `user_id` is intentional denormalization — avoids joining to `cards` on the hot "fetch due cards" query.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `card_id` | uuid | FK → cards |
| `user_id` | uuid | FK → auth.users |
| `due` | timestamptz | Next scheduled review date |
| `stability` | float | FSRS stability value |
| `difficulty` | float | FSRS difficulty value |
| `scheduled_days` | int | Interval (days) scheduled at last review |
| `reps` | int | Total review count |
| `lapses` | int | Times forgotten |
| `state` | int | FSRS state enum |
| `last_review` | timestamptz | |

Unique constraint on `(card_id, user_id)`.

### `review_attempts`
Append-only. One row written per card review. Never updated.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `card_id` | uuid | FK → cards |
| `user_id` | uuid | FK → auth.users |
| `rating` | int | FSRS input: 1=Again, 2=Hard, 3=Good, 4=Easy |
| `answer_content` | text | What the user typed or said (nullable — not applicable for self-score modality) |
| `llm_score` | float | AI score for active/teach_me modalities (nullable) |
| `answered_at` | timestamptz | |

---

## Folder Structure (Detailed)

```
inquisitive/
├── app/
│   ├── _layout.tsx               # Root layout — auth guard, providers
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── sign-in.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Bottom tab bar
│   │   ├── index.tsx             # Home screen
│   │   ├── review.tsx            # Integrated review (due cards)
│   │   └── library.tsx           # All cards + conversations
│   ├── conversation/
│   │   ├── new.tsx               # Start new conversation
│   │   └── [id].tsx              # Existing conversation
│   └── card/
│       └── [id].tsx              # Single card review
│
├── components/
│   ├── ui/                       # Generic primitives (Button, Input, Card, etc.)
│   └── domain/                   # App-specific (ConvoMessage, ActiveCard, ReviewCard, etc.)
│
├── hooks/
│   ├── useConversations.ts
│   ├── useCards.ts
│   ├── useDueCards.ts
│   └── useCardReview.ts
│
├── lib/
│   ├── ai/
│   │   ├── client.ts             # Anthropic client singleton
│   │   ├── chat.ts               # Streaming chat completion
│   │   └── card-generation.ts    # Prompt + parser for auto-generating cards
│   ├── db/
│   │   ├── client.ts             # Supabase client singleton
│   │   ├── conversations.ts      # CRUD for conversations + messages
│   │   ├── cards.ts              # CRUD for cards + card_schedules + review_attempts
│   │   └── topics.ts             # CRUD for topics + join tables
│   ├── srs/
│   │   └── scheduler.ts          # FSRS scheduling helpers wrapping ts-fsrs
│   └── types.ts                  # All shared TypeScript types
│
├── constants/
│   ├── colors.ts
│   └── typography.ts
│
├── docs/
│   ├── product-brief.md
│   ├── architecture.md           # This file
│   └── features/
│
├── CLAUDE.md
├── .env.local                    # Never committed
├── app.json
├── tailwind.config.js
└── tsconfig.json
```

---

## Data Flow

### Chat message
```
User types message
  → hooks/useConversations (optimistic insert to messages table)
  → lib/ai/chat.ts (streaming call to Anthropic)
  → tokens stream into UI
  → on stream complete: save assistant message to Supabase
  → lib/ai/card-generation.ts runs in background → new cards saved to Supabase
```

### Card review
```
hooks/useDueCards fetches cards where card_schedules.due <= now()
  → User answers card
  → lib/srs/scheduler.ts computes next due date via FSRS
  → lib/db/cards.ts upserts card_schedules row
  → lib/db/cards.ts inserts review_attempts row
```

---

## Environment Variables

```
# .env.local
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_ANTHROPIC_API_KEY=       # MVP only — move to backend before launch
```

---

## Known Constraints & Future Migration

- **Anthropic API key on client**: Acceptable for MVP/personal use. Before any public launch, introduce a lightweight backend (e.g. Supabase Edge Functions or a simple Express server) to proxy AI calls.
- **Card generation latency**: Auto-generating cards after each assistant message adds latency. Consider debouncing — generate cards only after the user has been idle in the conversation for N seconds, or only when the conversation ends.
- **Offline support**: Not in scope for MVP. TanStack Query provides basic caching but there is no offline-first write queue.
