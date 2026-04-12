## 1. Data Hooks

- [x] 1.1 Create `src/hooks/useCards.ts` — query all cards via Drizzle; accept optional `collectionId` param to filter via `collection_memberships` join
- [x] 1.2 Create `src/hooks/useCollections.ts` — query all collections
- [x] 1.3 Create `src/hooks/useReviewSession.ts` — build ordered deck (unreviewed → not_learned → learned) for a given collection scope; expose `current`, `flip()`, `record(result)`, `isDone`; write review event + card status update in a single Drizzle transaction

## 2. Atoms

- [x] 2.1 Create `src/components/atoms/Badge.tsx` — small colored pill label (used for language code and learning status)
- [x] 2.2 Create `src/components/atoms/Chip.tsx` — tappable filter chip with active/inactive visual state
- [x] 2.3 Create `src/components/atoms/Button.tsx` — primary/secondary button with disabled state

## 3. Molecules

- [x] 3.1 Create `src/components/molecules/CardListItem.tsx` — single row: headword, language Badge, learning status Badge; accepts `onPress`
- [x] 3.2 Create `src/components/molecules/CollectionFilterBar.tsx` — horizontal ScrollView of Chips ("All" + one per collection); exposes `activeId` and `onSelect`
- [x] 3.3 Create `src/components/molecules/FlipCard.tsx` — front face (headword + language badge) / back face (answer + example); flip triggered by tap or button; uses `Animated.Value` rotateY

## 4. Organisms

- [x] 4.1 Create `src/components/organisms/CardList.tsx` — FlatList of CardListItems; accepts cards array and `onCardPress`; shows empty state when array is empty
- [x] 4.2 Create `src/components/organisms/ReviewCard.tsx` — wraps FlipCard; shows "Show Answer" button on front; shows "Learned" / "Not Learned" buttons on back; emits result on button press

## 5. Screens

- [x] 5.1 Replace `app/index.tsx` with cards list screen — uses `useCards`, `useCollections`; renders CollectionFilterBar + CardList + "Start Review" Button; passes active collection filter to review route via query param
- [x] 5.2 Create `app/cards/[id].tsx` — card detail screen; fetches single card by ID from Drizzle; displays headword, language, answer, example, notes, learning status; back navigation via Expo Router
- [x] 5.3 Create `app/review.tsx` — review session screen; uses `useReviewSession` (collection scoped via `collectionId` query param); renders ReviewCard; shows completion view when `isDone` is true with card count summary and "Back to Cards" button
