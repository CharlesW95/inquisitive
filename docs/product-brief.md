# Inquisitive — Product Brief

## Vision

An AI-native mobile app that rethinks the learning experience by helping users learn through curiosity-driven conversation, then retain what they've learned through active recall and spaced repetition.

---

## Problem

Learning new concepts (especially in the humanities — history, philosophy, etc.) breaks down into two sub-problems:

**1. Finding relevant, interesting content**

- LLMs have largely solved this: you can now have tailored conversations with AI about any topic at any depth.

**2. Retaining and actively using new knowledge**

- This remains unsolved. Knowledge from conversations fades within weeks.
- Proven retention methods exist — active recall, spaced repetition, teaching back — but they require too much friction to use consistently.
- Where these tools *are* used (e.g. Anki for language learning), they work extremely well.

The gap: there is no product that combines the delight of open-ended AI conversation with a seamless, low-friction retention layer.

---

## Solution

Inquisitive combines:

- **Freeform AI conversation** — learn anything, follow your curiosity, go as deep as you want
- **Automatic Active Cards** — AI generates flashcards and recall prompts as the conversation unfolds
- **Spaced Repetition Reviews** — cards surface at the right time to maximize long-term retention

---

## Core Learning Principles

These principles should guide every product decision:


| Principle                 | Description                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Rewarding curiosity**   | Learners learn best when they actively shape what they study — freeform questioning is the ideal mechanism               |
| **Active recall**         | Understanding and retention peak when learners are forced to actively engage with content (teach-back, recall exercises) |
| **Linkage**               | Knowledge compounds when new concepts are linked to existing ones — the more links, the stronger the understanding       |
| **Multiple perspectives** | For subjective topics, exposure to competing viewpoints deepens understanding                                            |


---

## User Flow (MVP)

1. **Start a conversation** on any topic (e.g. "Founding of the Roman Empire")
  - Choose from personalized suggested topics, or start freeform
  - Text-based for MVP; voice-first as a later iteration
2. **Follow your curiosity** — ask follow-up questions in any direction
  - Roman military, structure of government, economy, notable emperors, etc.
  - AI suggests questions and new directions when helpful
3. **Active Cards are generated automatically** in the background as the conversation evolves
  - Cards are added to the user's review stack by default; users can delete unwanted ones
  - Card modalities:
    - **Flashcard** — question front, answer back (with optional image)
    - **Multiple choice** — question with 4 options
    - **Active Flashcard** — user types/speaks answer, LLM scores it
    - **Teach Me** — user explains concept to a beginner; gets personalized feedback
4. **End of conversation** — user is invited to review newly generated cards
5. **Spaced repetition notifications** — app surfaces cards for review at optimal intervals over time
6. **Learner Profile** builds up over time, personalizing topic recommendations and understanding learning patterns

---

## MVP Feature List

### Home Screen

The home screen is a `ScrollView` with a sticky `ChatBar` pinned above the home indicator. Sections flow top-to-bottom with consistent horizontal padding (16px). Background is the app's darkest surface (`colors.background`).

---

#### Top Navigation Bar

Sits above the scroll content (not inside it). Three elements in a single row:

- **Left:** App name "INQUISITIVE" — uppercase, small caps style, muted foreground color, body-small size
- **Right (icon group):** Flame icon + streak count ("12") side-by-side, then a settings gear icon with ~16px gap between the two

---

#### Section 1 — Greeting

No section header. Two lines of text:

- **Line 1:** `Good morning, {first_name}.` — large display font, bold, white. Greeting word is time-based: "Good morning" (5am–11:59am), "Good afternoon" (12pm–4:59pm), "Good evening" (5pm–4:59am). Period included.
- **Line 2:** `What are you curious about today?` — body font, muted foreground color

---

#### Section 2 — Review

**Section header row** (title left, link right):
- Left: `Review` — section title style (large, bold, white)
- Below title: `Engage with knowledge you've explored to deepen your understanding` — body-small, muted
- Right (vertically centered with title): `SEE ALL ›` — uppercase, accent color, tappable; navigates to the full Review tab

**Card carousel:** Horizontal `ScrollView`, `pagingEnabled: false`, no scroll indicator. Cards have ~12px gap between them. First card aligns to left padding; right edge of last card bleeds to hint at scroll.

**Review card anatomy** (each card is ~70% of screen width, fixed height ~160px, dark elevated surface `colors.surface`):
- **Top row:** Modality label on left + due label on right
  - Modality label: e.g., `QUIZ`, `ACTIVE RECALL`, `FLASHCARD`, `TEACH ME` — uppercase, body-small, muted
  - Due label: `DUE TODAY` or `DUE IN 2 DAYS` etc. — uppercase, body-small, muted
- **Topic tag:** e.g., `STOIC PHILOSOPHY` — uppercase, body-small, accent/brand color (gold), ~4px below top row
- **Prompt text:** The card's question or prompt — large bold, white, 2–3 lines, truncated with `…`. This is the dominant visual element.
- **Bottom accent:** Thin horizontal line (~1px) in accent color, full card width, at card bottom

Tapping a card navigates to `app/card/[id].tsx` to begin review.

---

#### Section 3 — Explore

**Section header** (no right-side link):
- `Explore` — section title style
- `Discover new knowledge by starting new threads` — body-small, muted

**Topic grid:** 2-column grid with ~12px gap. Each cell is a topic card (equal width, fixed height ~140px, dark elevated surface).

**Explore card anatomy:**
- **Top row:** Topic category label on left + diagonal arrow icon (↗) on right
  - Category: e.g., `PHILOSOPHY OF MIND`, `HISTORY` — uppercase, body-small, accent color
  - Arrow: small icon, muted, indicates "starts new conversation"
- **Title:** e.g., `Theories of Consciousness` — large bold, white, 2 lines max
- **Description:** e.g., `What is consciousness, and why does it exist?` — body-small, muted, 2 lines max, truncated

Tapping a card navigates to `app/conversation/new.tsx` pre-seeded with the topic title as the opening prompt.

For MVP, Explore cards are hardcoded — a static list of 6–8 curated topics covering a variety of domains (philosophy, history, science, etc.).

---

#### Section 4 — Continue

**Section header** (no right-side link):
- `Continue` — section title style
- `Deepen your exploration by continuing existing threads` — body-small, muted

**Conversation list:** Vertical stack of rows, no dividers, ~4px gap between rows.

**Conversation row anatomy** (full width, ~64px tall):
- **Left column (flex: 1):**
  - Conversation title — body-large, bold, white, single line, truncated with `…`
  - Preview snippet — body-small, muted, single line, truncated with `…` (first user message or AI summary)
- **Right column (fixed width, right-aligned):**
  - Relative timestamp — body-small, muted, uppercase (e.g., `2 HOURS AGO`, `1 DAY AGO`)
  - Card count — body-small, muted, uppercase (e.g., `12 CARDS`, `8 CARDS`)

Tapping a row navigates to `app/conversation/[id].tsx`. Show the 5 most recent conversations, sorted by `updated_at` descending.

---

#### Section 5 — Chat Bar (sticky)

Pinned to the bottom of the screen, above the home indicator (safe area). Does not scroll with content.

- Container: full-width, ~52px tall pill/rounded-rect, dark surface color with slight elevation, 16px horizontal margin from screen edges
- **Left icon:** Paperclip/attachment icon, muted color
- **Center:** Placeholder text `What are you curious about?` — body, muted, flex: 1
- **Right icon:** Microphone icon, muted color

Tapping anywhere in the bar navigates to `app/conversation/new.tsx` and focuses the keyboard immediately. For MVP, the attachment and microphone icons are non-functional (visual only).

### Conversation Screen

- Open-ended chat with AI
- Cards auto-generated in background during conversation
- Inline card view/edit as conversation progresses
- Launch convo-specific review from within conversation
- Conversations never "end" — always resumable; cards remain linked to source conversation

### Review Screen

- **Integrated Review** — all due cards across all topics (spaced repetition schedule)
- **Topic-specific Review**
- **Conversation-specific Review**

### Single Card Review

- View prompt
- Two answer modes:
  - Open-ended (voice or text) with LLM scoring
  - View answer + self-score
- Edit card
- Delete card

---

## Open Design Decisions

- Should card generation be fully automatic, or should users be able to highlight text to manually create cards? (**Current lean: automatic, with edit/delete**)
- Should auto-generated cards be in the review stack by default, or require user confirmation? (**Current lean: auto-include, allow deletion**)
- How should cards link to each other beyond shared topics? (e.g. explicit card-to-card references)
- Voice input for conversations — defer to post-MVP

---

## Out of Scope (MVP)

- Voice-first conversations
- Learner Profile / personalized topic recommendations
- Multiple perspectives feature
- Knowledge graph / explicit card linkage beyond tags

