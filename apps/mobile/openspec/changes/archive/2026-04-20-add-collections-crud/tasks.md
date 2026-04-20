## 1. Route Group & Sidebar Layout

- [x] 1.1 Create `src/app/(main)/` route group directory
- [x] 1.2 Move `src/app/index.tsx` to `src/app/(main)/index.tsx`
- [x] 1.3 Create `src/app/(main)/_layout.tsx` as a pass-through `<Slot />` (navigation handled by `NavMenu` in each screen's header)
- [x] 1.4 Verify root `src/app/_layout.tsx` still wraps everything correctly with `GestureHandlerRootView` and `SafeAreaProvider`

## 2. NavMenu Component

- [x] 2.1 Create `src/components/molecules/NavMenu.tsx` — hamburger button that opens a slide-in animated drawer
- [x] 2.2 Use `usePathname` to derive the active section and visually distinguish the active nav item
- [x] 2.3 Wire up `router.push('/')` for Cards and `router.push('/collections')` for Collections; close drawer after navigation
- [x] 2.4 Style the drawer: fixed width (240 pt), full height, `COLORS.surface` background, right border and drop shadow

## 3. Collections Store — Mutations

- [x] 3.1 Add `create(name: string): Promise<void>` action to `collectionsStore` — generates a UUID, inserts via Drizzle, updates in-memory array
- [x] 3.2 Add `rename(id: string, name: string): Promise<void>` action — updates DB and in-memory array
- [x] 3.3 Add `remove(id: string): Promise<void>` action — deletes from DB and removes from in-memory array
- [x] 3.4 Ensure all three actions set `loaded: true` and handle errors by reverting optimistic state

## 4. Collections Screen

- [x] 4.1 Create `src/app/(main)/collections.tsx` — calls `collectionsStore.load()` on mount
- [x] 4.2 Render a `FlatList` of collection rows, each showing the collection name
- [x] 4.3 Add empty state message when the list is empty
- [x] 4.4 Add a `...` context menu (or long-press) on each row exposing Rename and Delete actions
- [x] 4.5 Implement delete flow: show `Alert.alert` confirmation, call `collectionsStore.remove` on confirm
- [x] 4.6 Implement rename flow: show an input prompt (cross-platform modal), pre-fill current name, call `collectionsStore.rename` on confirm
- [x] 4.7 Add a FAB or header `+` button for creating a new collection
- [x] 4.8 Implement create flow: show an input prompt, call `collectionsStore.create` on confirm; show error if name is empty or duplicate

## 5. Card-Collection Membership (Card Detail Screen)

- [x] 5.1 On mount of `src/app/cards/[id].tsx`, query `collection_memberships WHERE card_id = ?` and store result as a `Set<string>` of collection IDs in local state
- [x] 5.2 Ensure `collectionsStore.load()` is also called on mount so the full collections list is available
- [x] 5.3 Add a "Collections" section below the existing card content rendering a row per collection
- [x] 5.4 Show a checkmark (or filled vs. outline icon) on each row based on whether its ID is in the membership set
- [x] 5.5 On row tap: if already a member, `DELETE FROM collection_memberships WHERE collection_id = ? AND card_id = ?` and remove from local set; if not a member, `INSERT INTO collection_memberships` and add to local set
- [x] 5.6 Show an empty-state message in the Collections section when `collectionsStore.collections` is empty

## 7. Validation

- [x] 7.1 Validate that empty/whitespace names are rejected in create and rename flows
- [x] 7.2 Validate that duplicate names (case-insensitive check against current store state) are rejected in create and rename flows
