import { useEffect, useState } from "react";
import styled from "styled-components";
import { Button, Input, Confirm, Message, Form } from "semantic-ui-react";
import PageContainer from "../components/templates/PageContainer";
import { useStore } from "../store";

const CollectionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: ${({ theme }) => theme.colors.surface};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const CollectionInfo = styled.div`
  .name { font-weight: 600; }
  .count { font-size: ${({ theme }) => theme.fontSizes.sm}; color: ${({ theme }) => theme.colors.textSecondary}; }
`;

const CollectionActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  align-items: center;
`;

function CollectionsPage() {
  const { collections, loadCollections, createCollection, renameCollection, deleteCollection } = useStore();
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  return (
    <PageContainer>
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
      ) : collections.map(coll => (
        <CollectionRow key={coll.id}>
          {editId === coll.id ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter") handleRenameConfirm();
                if (e.key === "Escape") { setEditId(null); setEditName(""); }
              }}
              autoFocus
            />
          ) : (
            <CollectionInfo>
              <div className="name">{coll.name}</div>
              <div className="count">{coll.cardCount} {coll.cardCount === 1 ? "card" : "cards"}</div>
            </CollectionInfo>
          )}
          <CollectionActions>
            {editId === coll.id ? (
              <>
                <Button size="mini" primary onClick={handleRenameConfirm}>Save</Button>
                <Button size="mini" onClick={() => { setEditId(null); setEditName(""); }}>Cancel</Button>
              </>
            ) : (
              <>
                <Button size="mini" icon="edit" onClick={() => { setEditId(coll.id); setEditName(coll.name); }} />
                <Button size="mini" icon="trash" color="red" basic onClick={() => setDeleteId(coll.id)} />
              </>
            )}
          </CollectionActions>
        </CollectionRow>
      ))}

      <Confirm
        open={deleteId !== null}
        header="Delete collection?"
        content="The collection will be deleted. Cards in this collection will remain in your library."
        confirmButton={{ content: "Delete", color: "red" } as object}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
      />
    </PageContainer>
  );
}

export default CollectionsPage;
