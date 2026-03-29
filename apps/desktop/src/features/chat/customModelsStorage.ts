import type { SavedModel } from "./customModelsTypes";

// ── Normalize helpers ─────────────────────────────────────────────────────────

/** Normalize a model identifier for comparison: trim + lowercase. */
export function normalizeModelName(name: string): string {
  return name.trim().toLowerCase();
}

/** Check if a name collides with any saved custom model (case-insensitive, trimmed). */
export function isDuplicateCustomModel(name: string, existing: SavedModel[]): boolean {
  const n = normalizeModelName(name);
  return existing.some((m) => normalizeModelName(m.name) === n);
}

// ── Ordering ──────────────────────────────────────────────────────────────────

export type ModelOption = {
  key: string;
  value: string;
  text: string;
};
