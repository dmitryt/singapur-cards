## Why

The app has no way for users to manage collections — they exist in the database but are invisible and uneditable. Adding collections CRUD and a sidebar navigation gives users meaningful control over how they organize their cards and provides a scalable navigation shell for future top-level sections.

## What Changes

- Add a **Collections list screen** showing all collections with options to create, rename, and delete each one
- Add a **persistent icon-rail sidebar** on the left edge of all top-level screens (Cards, Collections), hidden on detail/sub-screens (card detail, review session)
- Add a **Collections section on the card detail screen** where users can see and toggle which collections a card belongs to
- The existing card-list collection filter chips continue to work — they will reflect collections managed via the new CRUD screen

## Capabilities

### New Capabilities
- `collections-crud`: Full CRUD for collections — list all collections, create a new collection with a name, rename an existing collection, and delete a collection (with confirmation). Uses the existing `collections` table.
- `sidebar-navigation`: Persistent icon-only rail on the left side of the screen, visible only on top-level screens (Cards list, Collections list). Icons navigate between the two top-level sections. Hidden automatically when the user navigates into card detail, review session, or any sub-screen.
- `card-collection-membership`: From the card detail screen, users can see which collections a card belongs to and toggle membership in any collection. Uses the existing `collection_memberships` join table.

### Modified Capabilities

## Impact

- `src/app/_layout.tsx` — root layout will gain a sidebar navigation shell wrapping top-level routes
- `src/app/collections/` — new route group for the collections list screen
- `src/db/` — queries for collections CRUD (select all, insert, update name, delete) and membership toggle (insert/delete in `collection_memberships`)
- `src/store/` — collections state management (list, optimistic updates)
- `src/app/cards/[id].tsx` — new Collections section for viewing and toggling collection membership
- No schema migration needed — `collections` and `collection_memberships` tables already exist
