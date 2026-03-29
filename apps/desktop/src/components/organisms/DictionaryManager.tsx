import { useEffect, useState } from "react";
import styled from "styled-components";
import { Button, Progress, Message, Confirm, Modal, Form, Dropdown, Input } from "semantic-ui-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useStore } from "../../store";

const ManagerContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
`;

const DictList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const DictItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.sm} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: none; }
`;

const DictInfo = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  .name { font-weight: 600; }
  .meta { color: ${({ theme }) => theme.colors.textSecondary}; }
`;

function DictionaryManager() {
  const {
    dictionaries, importStatus, importProgress, importError,
    loadDictionaries, importDictionary, removeDictionary,
    languages, loadLanguages,
  } = useStore();

  const languageOptions = languages.map((l) => ({ key: l.code, value: l.title, text: l.title }));

  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importForm, setImportForm] = useState({ langFrom: "", langTo: "", displayName: "" });

  useEffect(() => {
    loadDictionaries();
    loadLanguages();
  }, [loadDictionaries, loadLanguages]);

  const handleImportClick = async () => {
    setImportModalOpen(true);
  };

  const handleImportConfirm = async () => {
    const filePath = await open({
      filters: [{ name: "DSL Dictionary", extensions: ["dsl", "DSL"] }],
      multiple: false,
    });
    if (!filePath) return;
    setImportModalOpen(false);

    await importDictionary({
      filePath: filePath as string,
      languageFrom: importForm.langFrom,
      languageTo: importForm.langTo,
      displayName: importForm.displayName || undefined,
    });
    setImportForm({ langFrom: "", langTo: "", displayName: "" });
  };

  const importPercent = importProgress
    ? importProgress.totalEstimate
      ? Math.round((importProgress.processedEntries / importProgress.totalEstimate) * 100)
      : null
    : null;

  return (
    <ManagerContainer>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <strong>Dictionaries</strong>
        <Button
          primary
          size="small"
          icon="upload"
          content="Import DSL"
          onClick={handleImportClick}
          disabled={importStatus === "importing"}
        />
      </div>

      {importStatus === "importing" && (
        <Progress
          percent={importPercent ?? undefined}
          indicating={importPercent === null}
          progress={importPercent !== null}
          label={`${importProgress?.phase ?? "importing"}...`}
          size="small"
        />
      )}

      {importStatus === "error" && (
        <Message negative size="small">
          <p>{importError}</p>
        </Message>
      )}

      {dictionaries.length === 0 ? (
        <p style={{ color: "#999", fontSize: "13px" }}>No dictionaries imported yet.</p>
      ) : (
        <DictList>
          {dictionaries.map((d) => (
            <DictItem key={d.id}>
              <DictInfo>
                <div className="name">{d.name}</div>
                <div className="meta">
                  {d.languageFrom} → {d.languageTo} · {d.entryCount.toLocaleString()} entries · {d.importStatus}
                </div>
              </DictInfo>
              <Button
                size="mini"
                icon="trash"
                color="red"
                basic
                onClick={() => setRemoveConfirmId(d.id)}
                aria-label={`Remove ${d.name}`}
              />
            </DictItem>
          ))}
        </DictList>
      )}

      <Confirm
        open={removeConfirmId !== null}
        header="Remove dictionary?"
        content="This will permanently delete this dictionary and all its entries. Your saved cards will not be affected."
        confirmButton={{ content: "Remove", color: "red" } as object}
        onCancel={() => setRemoveConfirmId(null)}
        onConfirm={() => {
          if (removeConfirmId) removeDictionary(removeConfirmId);
          setRemoveConfirmId(null);
        }}
      />

      <Modal open={importModalOpen} onClose={() => setImportModalOpen(false)} size="small">
        <Modal.Header>Import DSL Dictionary</Modal.Header>
        <Modal.Content>
          <Form>
            <Form.Field required>
              <label>Source language (language you search in)</label>
              <Dropdown
                placeholder="Select language"
                fluid
                selection
                options={languageOptions}
                value={importForm.langFrom}
                onChange={(_e, { value }) => setImportForm(f => ({ ...f, langFrom: value as string }))}
              />
            </Form.Field>
            <Form.Field required>
              <label>Target language (language of definitions)</label>
              <Dropdown
                placeholder="Select language"
                fluid
                selection
                options={languageOptions}
                value={importForm.langTo}
                onChange={(_e, { value }) => setImportForm(f => ({ ...f, langTo: value as string }))}
              />
            </Form.Field>
            <Form.Field>
              <label>Display name (optional)</label>
              <Input
                placeholder="Leave blank to use filename"
                value={importForm.displayName}
                onChange={(e) => setImportForm(f => ({ ...f, displayName: e.target.value }))}
              />
            </Form.Field>
          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={() => setImportModalOpen(false)}>Cancel</Button>
          <Button
            primary
            disabled={!importForm.langFrom || !importForm.langTo}
            onClick={handleImportConfirm}
          >
            Select file...
          </Button>
        </Modal.Actions>
      </Modal>
    </ManagerContainer>
  );
}

export default DictionaryManager;
