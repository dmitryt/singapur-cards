import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { appMeta } from '../db/schema';

export const ACTIVE_LEARNING_LANGUAGE_KEY = 'active_learning_language';
export const DEFAULT_ACTIVE_LANGUAGE = 'en';

type ActiveLanguageState = {
  language: string;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setLanguage: (code: string) => Promise<void>;
};

export const useActiveLanguageStore = create<ActiveLanguageState>((set) => ({
  language: DEFAULT_ACTIVE_LANGUAGE,
  hydrated: false,

  hydrate: async () => {
    const rows = await db
      .select()
      .from(appMeta)
      .where(eq(appMeta.key, ACTIVE_LEARNING_LANGUAGE_KEY))
      .limit(1);
    const row = rows[0];
    if (!row) {
      await db.insert(appMeta).values({
        key: ACTIVE_LEARNING_LANGUAGE_KEY,
        value: DEFAULT_ACTIVE_LANGUAGE,
      });
      set({ language: DEFAULT_ACTIVE_LANGUAGE, hydrated: true });
      return;
    }
    const lang =
      row.value && row.value.length > 0 ? row.value : DEFAULT_ACTIVE_LANGUAGE;
    if (lang !== row.value) {
      await db
        .update(appMeta)
        .set({ value: lang })
        .where(eq(appMeta.key, ACTIVE_LEARNING_LANGUAGE_KEY));
    }
    set({ language: lang, hydrated: true });
  },

  setLanguage: async (code: string) => {
    const rows = await db
      .select()
      .from(appMeta)
      .where(eq(appMeta.key, ACTIVE_LEARNING_LANGUAGE_KEY))
      .limit(1);
    if (rows[0]) {
      await db
        .update(appMeta)
        .set({ value: code })
        .where(eq(appMeta.key, ACTIVE_LEARNING_LANGUAGE_KEY));
    } else {
      await db.insert(appMeta).values({
        key: ACTIVE_LEARNING_LANGUAGE_KEY,
        value: code,
      });
    }
    set({ language: code });
  },
}));
