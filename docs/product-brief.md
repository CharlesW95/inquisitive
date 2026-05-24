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
- Where these tools _are_ used (e.g. Anki for language learning), they work extremely well.

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

| Principle | Description |
|---|---|
| **Rewarding curiosity** | Learners learn best when they actively shape what they study — freeform questioning is the ideal mechanism |
| **Active recall** | Understanding and retention peak when learners are forced to actively engage with content (teach-back, recall exercises) |
| **Linkage** | Knowledge compounds when new concepts are linked to existing ones — the more links, the stronger the understanding |
| **Multiple perspectives** | For subjective topics, exposure to competing viewpoints deepens understanding |

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

The home screen is divided into four sections:

**1. Welcome Message**
- Personalized greeting
- Brief summary of learning activity (e.g. cards due, recent topics)

**2. Review**
- Shows cards currently due for review (spaced repetition schedule)
- CTA to launch integrated review session

**3. Explore**
- Entry point to start a new conversation on any topic
- Personalized topic suggestions based on previous conversations and interests

**4. Continue**
- List of recent/in-progress conversations the user can return to
- Quick-launch back into a previous conversation thread

**5. Chat Bar**
- Persistent input bar at the bottom of the screen, styled like the Claude iOS app
- Tapping it launches a new conversation with the typed text as the opening message
- Always visible — the fastest path to starting a new exploration

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

- [ ] Should card generation be fully automatic, or should users be able to highlight text to manually create cards? (**Current lean: automatic, with edit/delete**)
- [ ] Should auto-generated cards be in the review stack by default, or require user confirmation? (**Current lean: auto-include, allow deletion**)
- [ ] How should cards link to each other beyond shared topics? (e.g. explicit card-to-card references)
- [ ] Voice input for conversations — defer to post-MVP

---

## Out of Scope (MVP)

- Voice-first conversations
- Learner Profile / personalized topic recommendations
- Multiple perspectives feature
- Knowledge graph / explicit card linkage beyond tags
