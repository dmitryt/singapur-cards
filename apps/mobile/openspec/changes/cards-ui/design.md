## Context

The app is a blank slate — a placeholder home screen and a complete SQLite schema via Drizzle ORM. No components, hooks, or navigation beyond the root `<Slot />` exist yet. This change introduces the entire UI layer for cards: navigation structure, component library scaffold, data hooks, and three screens.

The desktop app (`apps/desktop`) has a complete reference implementation. The mobile version does not replicate it — it targets a touch-first phone UI.

## Goals / Non-Goals

**Goals:**
- Cards list screen with collection filter chip bar
- Card detail screen
- Review session (flip interaction, learned / not_learned result recording)
- Atomic Design component hierarchy as the scalable pattern for future UI work
- Thin data hooks (`useCards`, `useCollections`, `useReviewSession`) as the boundary between UI and Drizzle

**Non-Goals:**
- Create / edit / delete cards (future change)
- Tab bar navigation (future change — stack only for now)
- Offline sync, pagination, or virtualized lists (premature at current data sizes)
- Animations beyond basic RN primitives

## Decisions

### Atomic Design for `src/components/`
**Decision:** `atoms/` → `molecules/` → `organisms/`. No `templates/` or `pages/` — screens live in `app/` per Expo Router convention.

**Rationale:** Establishes a reusable component vocabulary now, before multiple features exist. Cost is low with a small initial set; benefit compounds as new screens are added.

**Alternative:** Flat `components/` folder — rejected because it becomes unnavigable quickly and makes reuse harder to discover.

### Hooks in `src/hooks/` as the data boundary
**Decision:** All Drizzle queries live in custom hooks (`useCards`, `useCollections`, `useReviewSession`). Screen components receive data and callbacks as props or consume hooks — they never import `db` directly.

**Rationale:** Keeps screens testable, keeps query logic co-located by feature, and prevents Drizzle leaking into presentational components.

### Review session deck ordering
**Decision:** Deck order: `unreviewed` first, then `not_learned`, then `learned` — matching the core-flows spec. Order within each group is insertion order (no shuffle for now).

**Alternative:** Random shuffle — deferred; the spec doesn't require it yet.

### Learning status update strategy
**Decision:** On each review result, write two things atomically:
1. Insert a `review_events` row
2. Update `cards.learning_status` and `cards.last_reviewed_at`

**Rationale:** `review_events` is the audit log; `cards.learning_status` is the denormalized fast-read state used by the list screen. Keeping both in sync at write time avoids a join on every list render.

### Collection filter as in-memory UI state
**Decision:** Collections are fetched once on mount. The active collection filter is React state; filtered cards are re-queried when the filter changes.

**Rationale:** Collection count is small; a separate query per filter change is cheap and simpler than client-side filtering over a potentially large card set.

### No FlatList virtualization
**Decision:** Use `FlatList` (RN built-in) for the card list. No third-party virtualized list.

**Rationale:** Adequate for hundreds of cards. If performance becomes an issue, `FlashList` can replace `FlatList` in the organism without touching any other component.

## Risks / Trade-offs

- **Flip animation** — basic `rotateY` transform via `Animated` API. May look rough on older devices. → Mitigation: keep it simple; replace with Reanimated later if needed.
- **`learning_status` denormalization** — if a review event is written but the card update fails, they drift. → Mitigation: wrap both writes in a Drizzle transaction.
- **No empty-state designs specified** — empty list and empty review deck need UI. → Use a simple centered message; can be refined later.

## Migration Plan

No data migration needed. All changes are additive new files. Existing `app/index.tsx` is replaced (it's a placeholder).
