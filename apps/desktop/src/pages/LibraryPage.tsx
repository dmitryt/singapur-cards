import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Button, Loader, Dropdown, Confirm, Form, Input, TextArea, Message, Modal, Label, Icon } from "semantic-ui-react";
import { useStore } from "../store";
import type { CardListItem, CardDetail } from "../lib/tauri/commands";
import * as commands from "../lib/tauri/commands";
import { dslToHtml } from "@/lib/dslToHtml";

const FilterBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const CardGrid = styled.div`
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  align-content: start;
`;


const flipIn = keyframes`
  from { transform: rotateY(90deg); opacity: 0; }
  to { transform: rotateY(0deg); opacity: 1; }
`;

const CardActions = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  display: none;
  gap: 4px;
  z-index: 1;
`;

const CardTile = styled.div<{ status: string }>`
  position: relative;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ status, theme }) => theme.colors.learningStatus[status as keyof typeof theme.colors.learningStatus] ?? "#ffffff"};
  cursor: pointer;
  height: 160px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md};
  text-align: center;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  transition: box-shadow 0.15s ease;
  overflow: hidden;

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.md};
  }

  &:hover ${CardActions} {
    display: flex;
  }
`;

const ActionBtn = styled.button`
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  width: 28px;
  height: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  &:hover {
    background: #fff;
    border-color: #aaa;
  }

  i {
    margin: 0 !important;
  }
`;

const CardContent = styled.div`
  animation: ${flipIn} 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
`;

const Headword = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 600;
`;

const CardBack = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
`;

const statusOptions = [
  { key: "all", value: "", text: "All statuses" },
  { key: "unreviewed", value: "unreviewed", text: "Unreviewed" },
  { key: "not_learned", value: "not_learned", text: "Not learned" },
  { key: "learned", value: "learned", text: "Learned" },
];

function LibraryPage() {
  const { cards, isLoadingCards, loadCards, updateCard, deleteCard, collections, loadCollections } = useStore();
  const [statusFilter, setStatusFilter] = useState("");
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [editingCard, setEditingCard] = useState<CardDetail | null>(null);
  const [editForm, setEditForm] = useState({ headword: "", answerText: "", exampleText: "", notes: "", collectionIds: [] as string[] });
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCards(undefined, statusFilter as "unreviewed" | "learned" | "not_learned" | undefined || undefined);
  }, [loadCards, statusFilter]);

  useEffect(() => {
    if (collections.length === 0) loadCollections();
  }, []);

  const handleFlip = (cardId: string) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const handleEditClick = async (e: React.MouseEvent, card: CardListItem) => {
    e.stopPropagation();
    const result = await commands.getCard(card.id);
    if (result.ok) {
      setEditingCard(result.data);
      setEditForm({
        headword: result.data.headword,
        answerText: result.data.answerText,
        exampleText: result.data.exampleText ?? "",
        notes: result.data.notes ?? "",
        collectionIds: result.data.collectionIds,
      });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    setDeleteCardId(cardId);
  };

  const handleSave = async () => {
    if (!editingCard) return;
    setSaving(true);
    await updateCard({
      cardId: editingCard.id,
      language: editingCard.language,
      headword: editForm.headword,
      answerText: editForm.answerText,
      exampleText: editForm.exampleText || undefined,
      notes: editForm.notes || undefined,
      collectionIds: editForm.collectionIds,
    });
    setSaving(false);
    setEditingCard(null);
    await loadCards();
  };

  const handleDelete = async () => {
    if (!deleteCardId) return;
    await deleteCard(deleteCardId);
    setFlippedCards(prev => {
      const next = new Set(prev);
      next.delete(deleteCardId);
      return next;
    });
    setDeleteCardId(null);
  };

  const collectionMap = Object.fromEntries(collections.map(c => [c.id, c.name]));

  if (isLoadingCards && cards.length === 0) {
    return <Loader active inline="centered" />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100% - 60px)", overflow: "hidden" }}>
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

      {cards.length === 0 ? (
        <Message info>
          <Message.Header>No cards yet</Message.Header>
          <p>Search for words and save them as cards from the headword detail page.</p>
        </Message>
      ) : (
        <CardGrid>
          {cards.map(card => {
            const isFlipped = flippedCards.has(card.id);
            return (
              <CardTile
                key={card.id}
                status={card.learningStatus}
                onClick={() => handleFlip(card.id)}
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleFlip(card.id)}
              >
                <CardActions>
                  <ActionBtn onClick={(e) => handleEditClick(e, card)} title="Edit">
                    <Icon name="edit outline" />
                  </ActionBtn>
                  <ActionBtn onClick={(e) => handleDeleteClick(e, card.id)} title="Delete">
                    <Icon name="trash alternate outline" />
                  </ActionBtn>
                </CardActions>
                <CardContent key={String(isFlipped)}>
                  {!isFlipped ? (
                    <>
                      <Headword>{card.headword}</Headword>
                      {card.collectionIds.length > 0 && (
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "center" }}>
                          {card.collectionIds.map(cid =>
                            collectionMap[cid] ? (
                              <Label key={cid} size="mini" basic>{collectionMap[cid]}</Label>
                            ) : null
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <CardBack dangerouslySetInnerHTML={{ __html: dslToHtml(card.answerText) }} />
                  )}
                </CardContent>
              </CardTile>
            );
          })}
        </CardGrid>
      )}

      <Modal open={editingCard !== null} onClose={() => setEditingCard(null)} size="small">
        <Modal.Header>Edit Card</Modal.Header>
        <Modal.Content>
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
            <Form.Field>
              <label>Collections</label>
              <Dropdown
                multiple
                selection
                fluid
                options={collections.map(c => ({ key: c.id, value: c.id, text: c.name }))}
                value={editForm.collectionIds}
                onChange={(_, d) => setEditForm(f => ({ ...f, collectionIds: d.value as string[] }))}
                disabled={collections.length === 0}
                placeholder={collections.length === 0 ? "No collections available" : "Select collections"}
              />
            </Form.Field>
          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={() => setEditingCard(null)}>Cancel</Button>
          <Button primary loading={saving} onClick={handleSave}>Save</Button>
        </Modal.Actions>
      </Modal>

      <Confirm
        open={deleteCardId !== null}
        header="Delete card?"
        content="This will permanently delete this card. This action cannot be undone."
        confirmButton={{ content: "Delete", color: "red" } as object}
        onCancel={() => setDeleteCardId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default LibraryPage;
