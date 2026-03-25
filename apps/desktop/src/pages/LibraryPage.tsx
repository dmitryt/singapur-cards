import { useEffect, useState } from "react";
import styled from "styled-components";
import { Button, Loader, Dropdown, Confirm, Form, Input, TextArea, Message } from "semantic-ui-react";
import PageContainer from "../components/templates/PageContainer";
import { useStore } from "../store";
import type { CardListItem } from "../lib/tauri/commands";

const LibraryLayout = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  height: 100%;
  overflow: hidden;
`;

const CardGrid = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const CardTile = styled.div<{ selected?: boolean }>`
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme, selected }) =>
    selected ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: ${({ theme }) => theme.colors.surface};
  cursor: pointer;
  transition: border-color 0.15s ease;
  &:hover { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const CardHeadword = styled.div`
  font-weight: 600;
  margin-bottom: 2px;
`;

const CardPreview = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StatusBadge = styled.span<{ status: string }>`
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  background: ${({ status }) =>
    status === "learned" ? "#d4edda" :
    status === "not_learned" ? "#f8d7da" :
    "#e2e3e5"};
  color: ${({ status }) =>
    status === "learned" ? "#155724" :
    status === "not_learned" ? "#721c24" :
    "#383d41"};
`;

const DetailPanel = styled.div`
  width: 380px;
  flex-shrink: 0;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
`;

const FilterBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const statusOptions = [
  { key: "all", value: "", text: "All statuses" },
  { key: "unreviewed", value: "unreviewed", text: "Unreviewed" },
  { key: "not_learned", value: "not_learned", text: "Not learned" },
  { key: "learned", value: "learned", text: "Learned" },
];

function LibraryPage() {
  const { cards, activeCard, isLoadingCards, loadCards, getCard, updateCard, deleteCard } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [editForm, setEditForm] = useState({ headword: "", answerText: "", exampleText: "", notes: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCards(undefined, statusFilter as "unreviewed" | "learned" | "not_learned" | undefined || undefined);
  }, [loadCards, statusFilter]);

  const handleSelect = async (card: CardListItem) => {
    setSelectedId(card.id);
    await getCard(card.id);
  };

  useEffect(() => {
    if (activeCard) {
      setEditForm({
        headword: activeCard.headword,
        answerText: activeCard.answerText,
        exampleText: activeCard.exampleText ?? "",
        notes: activeCard.notes ?? "",
      });
    }
  }, [activeCard]);

  const handleSave = async () => {
    if (!activeCard) return;
    setSaving(true);
    await updateCard({
      cardId: activeCard.id,
      language: activeCard.language,
      headword: editForm.headword,
      answerText: editForm.answerText,
      exampleText: editForm.exampleText || undefined,
      notes: editForm.notes || undefined,
      collectionIds: activeCard.collectionIds,
    });
    setSaving(false);
    await loadCards();
  };

  const handleDelete = async () => {
    if (!activeCard) return;
    await deleteCard(activeCard.id);
    setSelectedId(null);
    setConfirmDelete(false);
  };

  if (isLoadingCards && cards.length === 0) {
    return <PageContainer><Loader active inline="centered" /></PageContainer>;
  }

  return (
    <PageContainer as="div" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <h2 style={{ margin: "0 0 12px" }}>Library</h2>
      <FilterBar>
        <Dropdown
          selection
          options={statusOptions}
          value={statusFilter}
          onChange={(_, d) => setStatusFilter(String(d.value ?? ""))}
          placeholder="Filter by status"
        />
      </FilterBar>

      <LibraryLayout>
        <CardGrid>
          {cards.length === 0 ? (
            <Message info>
              <Message.Header>No cards yet</Message.Header>
              <p>Search for words and save them as cards from the headword detail page.</p>
            </Message>
          ) : cards.map(card => (
            <CardTile
              key={card.id}
              selected={card.id === selectedId}
              onClick={() => handleSelect(card)}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleSelect(card)}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <CardHeadword>{card.headword}</CardHeadword>
                <StatusBadge status={card.learningStatus}>{card.learningStatus}</StatusBadge>
              </div>
              <CardPreview>{card.answerText}</CardPreview>
            </CardTile>
          ))}
        </CardGrid>

        {activeCard && selectedId && (
          <DetailPanel>
            <h3 style={{ margin: "0 0 12px" }}>{activeCard.language} — {activeCard.headword}</h3>
            <Form>
              <Form.Field>
                <label>Headword</label>
                <Input
                  value={editForm.headword}
                  onChange={(e) => setEditForm(f => ({ ...f, headword: e.target.value }))}
                />
              </Form.Field>
              <Form.Field>
                <label>Answer / Definition</label>
                <TextArea
                  value={editForm.answerText}
                  onChange={(e) => setEditForm(f => ({ ...f, answerText: e.target.value }))}
                  rows={4}
                />
              </Form.Field>
              <Form.Field>
                <label>Example</label>
                <Input
                  value={editForm.exampleText}
                  onChange={(e) => setEditForm(f => ({ ...f, exampleText: e.target.value }))}
                />
              </Form.Field>
              <Form.Field>
                <label>Notes</label>
                <Input
                  value={editForm.notes}
                  onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                />
              </Form.Field>
              <div style={{ display: "flex", gap: "8px", justifyContent: "space-between" }}>
                <Button primary size="small" onClick={handleSave} loading={saving}>Save</Button>
                <Button size="small" color="red" basic onClick={() => setConfirmDelete(true)}>Delete</Button>
              </div>
            </Form>
          </DetailPanel>
        )}
      </LibraryLayout>

      <Confirm
        open={confirmDelete}
        header="Delete card?"
        content="This will permanently delete this card. This action cannot be undone."
        confirmButton={{ content: "Delete", color: "red" } as object}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </PageContainer>
  );
}

export default LibraryPage;
