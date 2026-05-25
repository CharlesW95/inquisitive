# Inquisitive — Stretch Features (Post-MVP)

Features planned for after the core MVP is shipped. These are not prioritized relative to each other yet.

---

## Usage Limits + Paid Tiers / Subscriptions

Monetization layer to support ongoing AI API costs and infrastructure.

**Scope:**
- Free tier with a monthly conversation or card limit
- Paid tier(s) with higher or unlimited usage
- In-app subscription via RevenueCat (or similar) + App Store / Play Store billing
- Usage tracking per user in Supabase
- Graceful degradation when limits are hit (prompt to upgrade, not silent failure)

**Open questions:**
- What is the right free tier limit? (e.g. 10 conversations/month, 100 cards)
- Single paid tier vs. multiple?
- How to handle users mid-conversation when they hit a limit?

---

## Streaks

Engagement and retention mechanic to build a daily review habit.

**Scope:**
- Track consecutive days with at least one card reviewed
- Display current streak and longest streak on the home/review screen
- Streak freeze / grace period (e.g. one missed day doesn't break streak)
- Notifications to prompt daily review before streak breaks

**Open questions:**
- Does a conversation session without reviewing cards count toward a streak?
- What timezone logic to use for day boundaries?

---

## Card Review — LLM-Driven Answer Evaluation

Replace the current "show answer / self-grade" flow with AI evaluation of the user's free-text answer.

**Scope:**
- User types their answer to a card prompt
- LLM compares the user's answer to the correct answer and rates it (correct / partially correct / incorrect)
- Feedback shown: what the user got right, what they missed
- FSRS grade derived from LLM evaluation rather than self-report

**Why it matters:** Self-grading is unreliable and gameable. LLM eval makes the review more honest and more useful, and reduces the friction of judging yourself.

**Open questions:**
- How much latency is acceptable in the review flow?
- Should the user be able to override the LLM's grade?
- Cost per review — how does this affect tier pricing?

---

## Learner Profile

A persistent model of what the user knows and how they learn, used to personalize conversations and card generation.

**Scope:**
- Track topics the user has explored across all conversations
- Infer knowledge level per topic from conversation history and review performance
- Surface the profile to the user ("you've covered X hours of philosophy, Y cards retained")
- Use profile as context when starting new conversations (e.g. "don't re-explain Kantian ethics, I know it")

**Open questions:**
- How to represent knowledge level (tags, embeddings, freeform summary)?
- How much of this is shown to the user vs. used silently as context?
- Privacy: users should be able to view and delete their profile

---

## User Preferences — Answer and Card Content

Let users tune how the AI writes answers and generates cards.

**Scope:**
- Preference for answer style: concise vs. detailed, formal vs. conversational
- Preference for card format: single-concept vs. multi-part, example-heavy vs. definition-focused
- Preference for difficulty: beginner-friendly explanations vs. assume domain knowledge
- Stored in user settings and injected into AI prompts as system context

**Open questions:**
- How do preferences interact with the Learner Profile? (Could be unified)
- Explicit settings UI vs. inferred from feedback over time?
