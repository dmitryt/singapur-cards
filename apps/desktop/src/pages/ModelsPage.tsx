import { useEffect, useState, useCallback } from "react";
import styled from "styled-components";
import { Button, Dropdown, Form, Input, Message, Modal } from "semantic-ui-react";
import PageContainer from "../components/templates/PageContainer";
import { listCustomModels, addCustomModel, deleteCustomModel, type SavedModelItem } from "../lib/tauri/commands";
import { isDuplicateCustomModel } from "../features/chat/customModelsStorage";
import { SUPPORTED_PROVIDERS } from "../features/chat/constants";

// ── Styles ────────────────────────────────────────────────────────────────────

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
  margin: 0;
`;

const ProviderRow = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  max-width: 280px;
`;

const ModelTable = styled.table`
  width: 100%;
  max-width: 700px;
  border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left;
  padding: 6px 10px;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Td = styled.td`
  padding: 8px 10px;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border ?? "#eee"};
`;

const EmptyState = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_NAME_LENGTH = 256;
const MAX_TITLE_LENGTH = 128;

const DEFAULT_PROVIDER = SUPPORTED_PROVIDERS[0].value;

// ── Component ─────────────────────────────────────────────────────────────────

function ModelsPage() {
  const [models, setModels] = useState<SavedModelItem[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>(DEFAULT_PROVIDER);

  // Add modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCustomModels().then((r) => {
      if (cancelled) return;
      setModels(r.ok && Array.isArray(r.data) ? r.data : []);
    });
    return () => { cancelled = true; };
  }, []);

  const filteredModels = models.filter((m) => m.provider === selectedProvider);

  function openAddModal() {
    setAddName("");
    setAddTitle("");
    setAddError(null);
    setAddModalOpen(true);
  }

  const handleSave = useCallback(async () => {
    const name = addName.trim();
    const title = addTitle.trim();

    if (!name) { setAddError("Model identifier is required."); return; }
    if (!title) { setAddError("Display label is required."); return; }
    if (name.length > MAX_NAME_LENGTH) { setAddError(`Identifier must be at most ${MAX_NAME_LENGTH} characters.`); return; }
    if (title.length > MAX_TITLE_LENGTH) { setAddError(`Display label must be at most ${MAX_TITLE_LENGTH} characters.`); return; }
    if (isDuplicateCustomModel(name, models)) { setAddError("A saved model with this identifier already exists."); return; }

    setAddError(null);
    setAddSaving(true);
    try {
      const r = await addCustomModel({ name, title, provider: selectedProvider });
      if (r.ok) {
        setModels((prev) => [...prev, r.data]);
        setAddModalOpen(false);
      } else {
        setAddError(r.message);
      }
    } catch (e) {
      setAddError(typeof e === "string" ? e : e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setAddSaving(false);
    }
  }, [addName, addTitle, models, selectedProvider]);

  const handleDelete = useCallback(async (name: string) => {
    setDeleteError(null);
    const r = await deleteCustomModel(name);
    if (r.ok) {
      setModels((prev) => prev.filter((m) => m.name !== name));
    } else {
      setDeleteError(r.message);
    }
  }, []);

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Models</PageTitle>
        <Button primary size="small" onClick={openAddModal}>
          Add model
        </Button>
      </PageHeader>

      <ProviderRow>
        <Dropdown
          fluid
          selection
          label="Provider"
          options={[...SUPPORTED_PROVIDERS]}
          value={selectedProvider}
          onChange={(_e, { value }) => setSelectedProvider(value as string)}
        />
      </ProviderRow>

      {deleteError && (
        <Message negative style={{ maxWidth: 700 }}>
          <p>{deleteError}</p>
        </Message>
      )}

      {filteredModels.length === 0 ? (
        <EmptyState>No models saved for this provider yet.</EmptyState>
      ) : (
        <ModelTable>
          <thead>
            <tr>
              <Th>Identifier</Th>
              <Th>Display label</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filteredModels.map((m) => (
              <tr key={m.name}>
                <Td style={{ fontFamily: "monospace" }}>{m.name}</Td>
                <Td>{m.title}</Td>
                <Td style={{ width: 80 }}>
                  <Button
                    size="mini"
                    negative
                    data-testid="custom-model-delete"
                    onClick={() => handleDelete(m.name)}
                  >
                    Delete
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </ModelTable>
      )}

      {/* ── Add model modal ── */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        size="small"
        data-testid="custom-model-modal"
      >
        <Modal.Header>Add custom model</Modal.Header>
        <Modal.Content>
          {addError && (
            <Message negative>
              <p>{addError}</p>
            </Message>
          )}
          <Form>
            <Form.Field>
              <label htmlFor="model-name">Model identifier</label>
              <Input
                id="model-name"
                aria-label="Model identifier"
                placeholder="e.g. provider/model-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                maxLength={MAX_NAME_LENGTH}
              />
            </Form.Field>
            <Form.Field>
              <label htmlFor="model-title">Display label</label>
              <Input
                id="model-title"
                aria-label="Display label"
                placeholder="e.g. My Custom Model"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                maxLength={MAX_TITLE_LENGTH}
              />
            </Form.Field>
            <Form.Field>
              <label htmlFor="model-provider">Provider</label>
              <Input
                id="model-provider"
                aria-label="Provider"
                value={SUPPORTED_PROVIDERS.find((p) => p.value === selectedProvider)?.text ?? selectedProvider}
                disabled
              />
            </Form.Field>
          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={() => setAddModalOpen(false)} disabled={addSaving}>
            Cancel
          </Button>
          <Button
            primary
            data-testid="custom-model-save"
            onClick={handleSave}
            loading={addSaving}
            disabled={addSaving}
          >
            Save
          </Button>
        </Modal.Actions>
      </Modal>
    </PageContainer>
  );
}

export default ModelsPage;
