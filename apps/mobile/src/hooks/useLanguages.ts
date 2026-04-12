import { useEffect, useState } from 'react';
import { asc } from 'drizzle-orm';
import { db } from '../db';
import { languages } from '../db/schema';

export type LanguageRow = { code: string; title: string };

export function useLanguages() {
  const [rows, setRows] = useState<LanguageRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await db
        .select({ code: languages.code, title: languages.title })
        .from(languages)
        .orderBy(asc(languages.code));
      if (!cancelled) setRows(result);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return rows;
}
