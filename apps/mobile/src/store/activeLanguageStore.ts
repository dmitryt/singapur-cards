import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { appMeta, languages } from '../db/schema';

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
    const requestedLang =
      row.value && row.value.length > 0 ? row.value : DEFAULT_ACTIVE_LANGUAGE;

    const requestedExists = await db
      .select({ code: languages.code })
      .from(languages)
      .where(eq(languages.code, requestedLang))
      .limit(1);

    let resolvedLang = requestedLang;
    if (!requestedExists[0]) {
      const firstLanguage = await db
        .select({ code: languages.code })
        .from(languages)
        .limit(1);
      if (firstLanguage[0]?.code) {
        resolvedLang = firstLanguage[0].code;
      }
    }

    if (resolvedLang !== row.value) {
      await db
        .update(appMeta)
        .set({ value: resolvedLang })
        .where(eq(appMeta.key, ACTIVE_LEARNING_LANGUAGE_KEY));
    }

    set({ language: resolvedLang, hydrated: true });
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
