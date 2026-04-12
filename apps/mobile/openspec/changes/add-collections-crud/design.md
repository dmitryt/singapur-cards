## Context

The app uses `expo-router` with a single `<Slot>` root layout. The `collections` table, `collectionMemberships` table, and a read-only `collectionsStore` already exist. Navigation is flat — no groups, no tabs, no drawer. The card-list screen already shows collection filter chips driven by `cardsListFilterStore` and `collectionsStore`.

## Goals / Non-Goals

**Goals:**
- Persistent icon-rail sidebar visible on top-level screens (Cards, Collections)
- Full CRUD on collections: list, create, rename, delete
- Sidebar automatically hidden on sub-screens (card detail, review, settings)
- Manage card-collection membership from the card detail screen

**Non-Goals:**
- Collection descriptions or icons
- Reordering collections

## Decisions

### Sidebar layout: custom `(main)` route group with a hamburger drawer

Use a `src/app/(main)/_layout.tsx` route group with a pass-through `<Slot />`. Top-level screens (`index.tsx` → cards, `collections.tsx`) move inside `(main)/`. Each top-level screen renders a `<NavMenu>` hamburger button in its header; sub-screens do not.

**Why not expo-router Tabs?** Tabs render a horizontal tab bar and the API for rendering it vertically is fragile.

**Why a drawer instead of a persistent rail?** A slide-in animated drawer (`NavMenu`) was chosen over a persistent icon rail because it takes no permanent horizontal space, which matters on narrow phone screens. The drawer is triggered by a hamburger icon in the screen header and slides in over the content with a dimmed overlay.

**Why a route group?** Grouping top-level screens under `(main)` provides a natural boundary. Sub-screens (card detail at `cards/[id].tsx`, `review.tsx`) stay outside the group and do not render the `NavMenu`.

### Navigation between Cards and Collections

`NavMenu` (`src/components/molecules/NavMenu.tsx`) uses `expo-router`'s `usePathname` to determine the active item and highlights it. Navigation calls `router.push('/')` for Cards and `router.push('/collections')` for Collections, then closes the drawer.

### Collections store: extend with mutating actions

Extend `collectionsStore` (Zustand) with `create`, `rename`, and `remove` actions. Each action writes to the DB via Drizzle then updates the in-memory array — optimistic update, roll back on error. IDs generated client-side with `uuid`.

**Why optimistic updates?** SQLite writes are synchronous via expo-sqlite; failures are rare and typically fatal. Optimistic updates keep the UI instant.

### Collections list UI

Single screen: `FlatList` of collection rows. Each row shows the name and a context menu (long-press or `...` icon) with Rename and Delete options. A floating `+` FAB creates a new collection via an inline text prompt (Alert.prompt on iOS, custom modal on Android).

**Why Alert.prompt for create/rename?** Avoids a full modal screen for a single text field. Already used elsewhere in React Native patterns. Falls back to a custom bottom-sheet modal on Android (Alert.prompt is iOS-only).

### Card-collection membership: toggle from card detail screen

The card detail screen (`src/app/cards/[id].tsx`) gains a "Collections" section at the bottom. It shows all available collections (from `collectionsStore`) with a checkmark next to each the card already belongs to. Tapping a row inserts or deletes a row in `collection_memberships`.

**Why from card detail?** Cards are the primary object — the user navigates to a specific card and decides which collections it fits into. This avoids building a separate collection-detail browse/search flow (unnecessary complexity for now).

**Membership state: local component state, not a store.** Memberships for a single card are loaded once when the detail screen mounts (`SELECT collection_id FROM collection_memberships WHERE card_id = ?`) and held in `useState<Set<string>>`. Mutations update both the DB and local state immediately. No global store needed — the card detail is ephemeral.

**Why not a store?** Memberships per-card are only needed on the detail screen. A global memberships store would need invalidation logic when collections are renamed or deleted. Local state is simpler and correct.

**Impact on card-list filter chips:** When a user adds a card to a collection, the collection chip in the card list already filters correctly because the DB is the source of truth — `useCards` queries the DB with the active `collectionId`. No additional invalidation needed.

## Risks / Trade-offs

- **Drawer instead of persistent rail** → Navigation is hidden behind a tap rather than always visible. Acceptable for a phone-first layout where horizontal space is scarce.
- **Route group reorganization** → Moving `index.tsx` into `(main)/` changes the URL structure only in development; expo-router resolves `/` to `(main)/index` transparently.
- **collectionsStore `loaded` flag** → Currently guards against re-loading, which is correct for read-only use. With mutations the store must stay authoritative — all writes go through the store, never direct DB calls from screens.

## Migration Plan

1. Create `src/app/(main)/` group with sidebar layout
2. Move `src/app/index.tsx` → `src/app/(main)/index.tsx`
3. Add `src/app/(main)/collections.tsx`
4. Add `SidebarRail` component
5. Extend `collectionsStore` with mutating actions
6. Add Collections section to `src/app/cards/[id].tsx` with membership toggle logic
7. No DB migration required — `collections` and `collection_memberships` tables already exist
