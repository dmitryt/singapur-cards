## Why

The mobile app has a complete database schema but no UI — users cannot view, filter, or study their cards on the device. This change delivers the first real screens: a card list with collection filtering and a review session flow (flip card, record result).

## What Changes

- New cards list screen at `/` showing all cards, filterable by collection
- New card detail screen at `/cards/[id]` showing full card content
- New review session screen at `/review` — ordered deck (unreviewed → not_learned → learned), flip interaction, mark learned / not learned
- Drizzle-powered data layer: hooks for querying cards, collections, and writing review results + learning status
- Atomic Design component hierarchy under `src/components/` (atoms → molecules → organisms)
- Expo Router stack navigator wired up with the new screens

## Capabilities

### New Capabilities

- `card-list`: Browse all cards with optional collection filter; shows headword, language badge, and learning status
- `card-detail`: Full card view — headword, answer, example, notes, language, current status
- `review-session`: Ordered study flow — flip card to reveal answer, record learned / not_learned result, persist learning status and review event

### Modified Capabilities

_(none — no existing spec requirements change)_

## Impact

- `app/index.tsx` — replaced with cards list screen
- `app/cards/[id].tsx` — new file
- `app/review.tsx` — new file
- `src/components/` — new directory tree (atoms, molecules, organisms)
- `src/hooks/` — new: `useCards`, `useCollections`, `useReviewSession`
- `src/db/` — no schema changes; read/write via existing Drizzle schema
