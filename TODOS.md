# LingoForge TODOs

## Phase 2: Adaptive AI Lesson Generation
**Priority:** High
**Status:** Blocked on Phase 1 (per-word tracking)

Feed WordPerformance data into AI lesson prompts so lessons adapt to each user's weak spots. The hook point is `buildLessonPrompt()` in `server/services/promptBuilder.ts` — add the user's weak word ranks to the system prompt. The client sends weak word ranks with the lesson request, and the AI emphasizes those words in generated exercises.

**Why:** Phase 1 collects per-word data. Without Phase 2, that data is informational only — the lesson experience doesn't change. This is what delivers the "Duolingo but smarter" promise.

**Depends on:** Phase 1 per-word tracking complete and tested.

---

## Loosen Unlock System — Parallel Skill Progression
**Priority:** Medium
**Status:** Blocked on Phase 1 + Phase 2

Currently users must complete ALL 16 reading levels (80 lessons, ~10+ hours) before writing unlocks. With per-word tracking, unlock writing once the user demonstrates word mastery through reading — not just level completion.

**Where:** `isSectionUnlocked()` in `src/lib/persistence.ts:89-99`. Currently checks `getCompletedLevelCount() >= TOTAL_LEVELS`. Change to check WordPerformance mastery threshold instead.

**Why:** Faster time-to-value. Users experience all 3 skill types sooner, increasing engagement.

**Depends on:** Phase 1 (word tracking data exists) + Phase 2 (adaptive generation) ideally.

---

## Full SM-2 Spaced Repetition Algorithm
**Priority:** Low
**Status:** Blocked on Phase 1

Replace the basic fixed-interval SRS (hard=1d, moderate=3d, easy=7d) with the SM-2 algorithm. SM-2 adjusts ease factor based on history — words you consistently get right get exponentially longer intervals, words you keep missing get shorter ones.

**Where:** WordPerformance model already has `easeFactor`, `interval`, and `nextReview` fields (SRS-ready). Just implement the SM-2 update logic (~30 lines) in the `recordWordPerformance()` function.

**Why:** Industry-standard algorithm (Anki uses it). Better review scheduling = better long-term retention. Users won't notice until weeks in, but the data quality improvement compounds.

**Depends on:** Phase 1 (this plan).
