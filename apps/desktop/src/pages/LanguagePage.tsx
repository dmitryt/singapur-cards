import { useEffect, useState } from "react";
import styled from "styled-components";
import { Button, Input, Message } from "semantic-ui-react";
import PageContainer from "../components/templates/PageContainer";
import { useStore } from "../store";
import type { Language } from "../lib/tauri/commands";

// ── Styled components ─────────────────────────────────────────────────────────

const LanguageRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: none; }
`;

const CodeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 24px;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  flex-shrink: 0;
`;

const LanguageTitle = styled.span`
  flex: 1;
  font-size: ${({ theme }) => theme.fontSizes.md};
`;

const RowActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  align-items: center;
`;

const InlineForm = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  flex: 1;
`;

const ConfirmInline = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const AddForm = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;
`;

// ── Types ─────────────────────────────────────────────────────────────────────

type RowMode = "view" | "edit" | "confirm-delete";

interface RowState {
  mode: RowMode;
  editTitle: string;
  error: string | null;
}

function makeRowState(lang: Language): RowState {
  return { mode: "view", editTitle: lang.title, error: null };
}

// ── LanguagePage ──────────────────────────────────────────────────────────────

function LanguagePage() {
  const {
    languages,
    isLoadingLanguages,
    loadLanguages,
    createLanguage,
    updateLanguage,
    deleteLanguage,
  } = useStore();

  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  // Add form state
  const [addCode, setAddCode] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadLanguages();
  }, [loadLanguages]);

  // Keep rowStates in sync when languages list changes
  useEffect(() => {
    setRowStates((prev) => {
      const next: Record<string, RowState> = {};
      for (const lang of languages) {
        next[lang.code] = prev[lang.code] ?? makeRowState(lang);
      }
      return next;
    });
  }, [languages]);

  const setRowMode = (code: string, mode: RowMode, extraTitle?: string) => {
    setRowStates((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        mode,
        editTitle: extraTitle ?? prev[code]?.editTitle ?? "",
        error: null,
      },
    }));
  };

  const setRowError = (code: string, error: string | null) => {
    setRowStates((prev) => ({
      ...prev,
      [code]: { ...prev[code], error },
    }));
  };

  const handleEditTitle = (code: string, value: string) => {
    setRowStates((prev) => ({
      ...prev,
      [code]: { ...prev[code], editTitle: value },
    }));
  };

  const handleSaveEdit = async (lang: Language) => {
    const title = rowStates[lang.code]?.editTitle.trim() ?? "";
    if (!title) {
      setRowError(lang.code, "Title cannot be empty.");
      return;
    }
    const ok = await updateLanguage(lang.code, title);
    if (ok) {
      await loadLanguages();
      setRowMode(lang.code, "view");
    } else {
      setRowError(lang.code, "Failed to save. Please try again.");
    }
  };

  const handleCancelEdit = (lang: Language) => {
    setRowMode(lang.code, "view", lang.title);
  };

  const handleConfirmDelete = async (code: string) => {
    const result = await deleteLanguage(code);
    if (result.ok) {
      await loadLanguages();
    } else {
      setRowError(code, result.error ?? "Deletion failed.");
      setRowMode(code, "view");
    }
  };

  const handleAddSubmit = async () => {
    const code = addCode.trim();
    const title = addTitle.trim();
    if (!/^[a-z]{2}$/.test(code)) {
      setAddError("Code must be exactly 2 lowercase letters (e.g. \"de\").");
      return;
    }
    if (!title) {
      setAddError("Title cannot be empty.");
      return;
    }
    setAdding(true);
    setAddError(null);
    const ok = await createLanguage(code, title);
    setAdding(false);
    if (ok) {
      setAddCode("");
      setAddTitle("");
      await loadLanguages();
    } else {
      setAddError(`A language with code "${code}" already exists.`);
    }
  };

  return (
    <PageContainer>
      {isLoadingLanguages && languages.length === 0 ? (
        <p>Loading…</p>
      ) : (
        <>
          {languages.map((lang) => {
            const row = rowStates[lang.code] ?? makeRowState(lang);
            const isLast = languages.length === 1;

            if (row.mode === "edit") {
              return (
                <LanguageRow key={lang.code}>
                  <CodeBadge>{lang.code}</CodeBadge>
                  <InlineForm>
                    <Input
                      value={row.editTitle}
                      onChange={(e) => handleEditTitle(lang.code, e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === "Enter") handleSaveEdit(lang);
                        if (e.key === "Escape") handleCancelEdit(lang);
                      }}
                      autoFocus
                      style={{ flex: 1 }}
                    />
                    <Button size="small" primary onClick={() => handleSaveEdit(lang)}>Save</Button>
                    <Button size="small" onClick={() => handleCancelEdit(lang)}>Cancel</Button>
                  </InlineForm>
                  {row.error && <span style={{ color: "red", fontSize: "12px" }}>{row.error}</span>}
                </LanguageRow>
              );
            }

            if (row.mode === "confirm-delete") {
              return (
                <LanguageRow key={lang.code}>
                  <CodeBadge>{lang.code}</CodeBadge>
                  <LanguageTitle>{lang.title}</LanguageTitle>
                  <ConfirmInline>
                    Are you sure?
                    <Button size="small" color="red" onClick={() => handleConfirmDelete(lang.code)}>Confirm</Button>
                    <Button size="small" onClick={() => setRowMode(lang.code, "view")}>Cancel</Button>
                  </ConfirmInline>
                  {row.error && <span style={{ color: "red", fontSize: "12px" }}>{row.error}</span>}
                </LanguageRow>
              );
            }

            return (
              <LanguageRow key={lang.code}>
                <CodeBadge>{lang.code}</CodeBadge>
                <LanguageTitle>{lang.title}</LanguageTitle>
                <RowActions>
                  <Button size="small" basic onClick={() => setRowMode(lang.code, "edit", lang.title)}>
                    Edit
                  </Button>
                  <Button
                    size="small"
                    basic
                    color="red"
                    disabled={isLast}
                    title={isLast ? "Cannot delete the last language" : undefined}
                    onClick={() => !isLast && setRowMode(lang.code, "confirm-delete")}
                  >
                    Delete
                  </Button>
                </RowActions>
                {row.error && <span style={{ color: "red", fontSize: "12px" }}>{row.error}</span>}
              </LanguageRow>
            );
          })}

          <AddForm>
            <Input
              placeholder="Code (e.g. de)"
              value={addCode}
              maxLength={2}
              onChange={(e) => { setAddCode(e.target.value); setAddError(null); }}
              style={{ width: "90px" }}
            />
            <Input
              placeholder="Title (e.g. German)"
              value={addTitle}
              onChange={(e) => { setAddTitle(e.target.value); setAddError(null); }}
              style={{ width: "200px" }}
            />
            <Button primary size="small" loading={adding} onClick={handleAddSubmit}>
              Add Language
            </Button>
            {addError && <Message error size="small" content={addError} />}
          </AddForm>
        </>
      )}
    </PageContainer>
  );
}

export default LanguagePage;
