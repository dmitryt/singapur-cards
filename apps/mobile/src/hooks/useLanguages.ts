import { useEffect, useState } from 'react';
import { asc, eq } from 'drizzle-orm';
import { db } from '../db';
import { languages } from '../db/schema';

export type LanguageRow = { code: string; title: string };
type AddLanguageResult = { ok: true; code: string } | { ok: false; message: string };
type RemoveLanguageResult =
  | { ok: true; removedCode: string; rows: LanguageRow[] }
  | { ok: false; message: string };

export function useLanguages() {
  const [rows, setRows] = useState<LanguageRow[]>([]);

  async function refresh() {
    const result = await db
      .select({ code: languages.code, title: languages.title })
      .from(languages)
      .orderBy(asc(languages.code));
    setRows(result);
  }

  async function addLanguage(codeInput: string, titleInput: string): Promise<AddLanguageResult> {
    const code = codeInput.trim().toLowerCase();
    const title = titleInput.trim();

    if (!/^[a-z]{2}$/.test(code)) {
      return { ok: false, message: 'Language code must be 2 letters (example: de).' };
    }
    if (title.length === 0) {
      return { ok: false, message: 'Language title is required.' };
    }

    const existing = await db
      .select({ code: languages.code })
      .from(languages)
      .where(eq(languages.code, code))
      .limit(1);
    if (existing[0]) {
      return { ok: false, message: `Language ${code.toUpperCase()} already exists.` };
    }

    await db.insert(languages).values({
      code,
      title,
      createdAt: new Date().toISOString(),
    });

    await refresh();
    return { ok: true, code };
  }

  async function removeLanguage(code: string): Promise<RemoveLanguageResult> {
    const existingRows = await db
      .select({ code: languages.code, title: languages.title })
      .from(languages)
      .orderBy(asc(languages.code));

    if (existingRows.length <= 1) {
      return { ok: false, message: 'At least one language must remain.' };
    }

    const exists = existingRows.some((row) => row.code === code);
    if (!exists) {
      return { ok: false, message: 'Language not found.' };
    }

    await db.delete(languages).where(eq(languages.code, code));

    const updatedRows = await db
      .select({ code: languages.code, title: languages.title })
      .from(languages)
      .orderBy(asc(languages.code));
    setRows(updatedRows);

    return { ok: true, removedCode: code, rows: updatedRows };
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await db
        .select({ code: languages.code, title: languages.title })
        .from(languages)
        .orderBy(asc(languages.code));
      if (!cancelled) {
        setRows(result);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { rows, addLanguage, removeLanguage, refresh };
}
