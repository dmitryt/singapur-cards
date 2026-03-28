import { Fragment, useEffect, useState } from "react";
import styled from "styled-components";
import { Button, Input, Confirm, Message, Form, Accordion, Icon, Label, Loader } from "semantic-ui-react";
import { useStore } from "../store";
import type { CardListItem } from "../lib/tauri/commands";
import * as commands from "../lib/tauri/commands";

const CollectionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  flex: 1;
`;

const CollectionActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  align-items: center;
  margin-left: ${({ theme }) => theme.spacing.sm};
`;

const StyledAccordionTitle = styled(Accordion.Title)`
  display: flex;
  align-items: center;
  width: 100%;
`;

const StyledAccordionContent = styled(Accordion.Content)`
  &&&& {
    padding-bottom: 10px;
    padding-top: 0;
  }
`;

const statusBackground: Record<string, string> = {
  learned: "#d4edda",
  not_learned: "#f8d7da",
  unreviewed: "#e2e3e5",
};

const CardLabelWrapper = styled.div`
  position: relative;
  display: inline-flex;

  .detach-btn {
    display: none;
    position: absolute;
    top: -6px;
    right: -6px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #666;
    border: none;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    padding: 0;
    z-index: 1;

    i {
      margin: 0 !important;
      font-size: 9px !important;
      color: white;
    }
  }

  &:hover .detach-btn {
    display: flex;
  }
`;

function CollectionsPage() {
  const { collections, loadCollections, createCollection, renameCollection, deleteCollection, updateCard } = useStore();
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [collectionCards, setCollectionCards] = useState<Record<string, CardListItem[]>>({});
  const [loadingCollectionId, setLoadingCollectionId] = useState<string | null>(null);
  const [detachTarget, setDetachTarget] = useState<{ card: CardListItem; collectionId: string } | null>(null);
  const [detaching, setDetaching] = useState(false);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await createCollection({ name: newName.trim(), description: newDesc.trim() || undefined });
    setNewName("");
    setNewDesc("");
    setCreating(false);
  };

  const handleRenameConfirm = async () => {
    if (!editId || !editName.trim()) return;
    await renameCollection(editId, editName.trim());
    setEditId(null);
    setEditName("");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    await deleteCollection(deleteId);
    setDeleteId(null);
  };

  const handleTitleClick = async (index: number, collectionId: string) => {
    if (activeIndex === index) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex(index);
    if (!collectionCards[collectionId]) {
      setLoadingCollectionId(collectionId);
      const result = await commands.listCards(collectionId);
      if (result.ok) {
        setCollectionCards(prev => ({ ...prev, [collectionId]: result.data }));
      }
      setLoadingCollectionId(null);
    }
  };

  const handleDetach = async () => {
    if (!detachTarget) return;
    setDetaching(true);
    const result = await commands.getCard(detachTarget.card.id);
    if (result.ok) {
      const card = result.data;
      await updateCard({
        cardId: card.id,
        language: card.language,
        headword: card.headword,
        answerText: card.answerText,
        exampleText: card.exampleText,
        notes: card.notes,
        collectionIds: card.collectionIds.filter(id => id !== detachTarget.collectionId),
      });
      setCollectionCards(prev => ({
        ...prev,
        [detachTarget.collectionId]: prev[detachTarget.collectionId].filter(c => c.id !== detachTarget.card.id),
      }));
    }
    setDetaching(false);
    setDetachTarget(null);
  };

  return (
    <>
      <h2 style={{ margin: "0 0 16px" }}>Collections</h2>

      <Form style={{ marginBottom: "24px" }}>
        <Form.Group>
          <Form.Field width={8}>
            <Input
              placeholder="New collection name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleCreate()}
            />
          </Form.Field>
          <Form.Field width={6}>
            <Input
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </Form.Field>
          <Form.Field>
            <Button primary onClick={handleCreate} loading={creating} disabled={!newName.trim()}>
              Create
            </Button>
          </Form.Field>
        </Form.Group>
      </Form>

      {collections.length === 0 ? (
        <Message info>
          <Message.Header>No collections yet</Message.Header>
          <p>Create a collection to organize your study cards.</p>
        </Message>
      ) : (
        <Accordion exclusive styled fluid>
          {collections.map((coll, i) => (
            <Fragment key={coll.id}>
              <StyledAccordionTitle active={activeIndex === i} index={i} onClick={() => handleTitleClick(i, coll.id)} style={{ cursor: "pointer" }}>
                <Icon name="dropdown" />
                <CollectionInfo>
                  <span style={{ fontWeight: 600 }}>{coll.name}</span>
                  <span style={{ fontSize: "13px", color: "#666" }}>
                    ({coll.cardCount})
                  </span>
                </CollectionInfo>
                <CollectionActions>
                  {editId === coll.id ? (
                    <>
                      <Input
                        size="mini"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent) => {
                          if (e.key === "Enter") handleRenameConfirm();
                          if (e.key === "Escape") { setEditId(null); setEditName(""); }
                        }}
                        autoFocus
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      />
                      <Button size="mini" primary onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleRenameConfirm(); }}>Save</Button>
                      <Button size="mini" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEditId(null); setEditName(""); }}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <Button size="mini" icon="edit" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEditId(coll.id); setEditName(coll.name); }} />
                      <Button size="mini" icon="trash" color="red" basic onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDeleteId(coll.id); }} />
                    </>
                  )}
                </CollectionActions>
              </StyledAccordionTitle>
              <StyledAccordionContent active={activeIndex === i}>
                {loadingCollectionId === coll.id ? (
                  <Loader active inline="centered" size="small" style={{ margin: "12px 0" }} />
                ) : (collectionCards[coll.id] ?? []).length === 0 ? (
                  <p style={{ color: "#666", fontSize: "14px", margin: "8px 0" }}>No cards in this collection.</p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "8px 0" }}>
                    {(collectionCards[coll.id] ?? []).map(card => (
                      <CardLabelWrapper key={card.id}>
                        <Label style={{ background: statusBackground[card.learningStatus] ?? "#e2e3e5" }}>
                          {card.headword}
                        </Label>
                        <button
                          className="detach-btn"
                          title="Detach from collection"
                          onClick={() => setDetachTarget({ card, collectionId: coll.id })}
                        >
                          <Icon name="times" />
                        </button>
                      </CardLabelWrapper>
                    ))}
                  </div>
                )}
              </StyledAccordionContent>
            </Fragment>
          ))}
        </Accordion>
      )}

      <Confirm
        open={detachTarget !== null}
        header="Detach card?"
        content={`Remove "${detachTarget?.card.headword}" from this collection? The card will remain in your library.`}
        confirmButton={{ content: "Detach", color: "orange", loading: detaching } as object}
        onCancel={() => setDetachTarget(null)}
        onConfirm={handleDetach}
      />

      <Confirm
        open={deleteId !== null}
        header="Delete collection?"
        content="The collection will be deleted. Cards in this collection will remain in your library."
        confirmButton={{ content: "Delete", color: "red" } as object}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}

export default CollectionsPage;
