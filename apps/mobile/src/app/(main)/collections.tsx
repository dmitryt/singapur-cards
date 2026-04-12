import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCollectionsStore, type Collection } from '../../store/collectionsStore';
import { NavMenu } from '../../components/molecules/NavMenu';
import { COLORS } from '../../theme';

type PromptMode = { type: 'create' } | { type: 'rename'; id: string; currentName: string };

export default function CollectionsScreen() {
  const collections = useCollectionsStore((s) => s.collections);
  const load = useCollectionsStore((s) => s.load);
  const createCollection = useCollectionsStore((s) => s.create);
  const renameCollection = useCollectionsStore((s) => s.rename);
  const removeCollection = useCollectionsStore((s) => s.remove);

  const [promptMode, setPromptMode] = useState<PromptMode | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setInputValue('');
    setInputError('');
    setPromptMode({ type: 'create' });
  }

  function openRename(collection: Collection) {
    setInputValue(collection.name);
    setInputError('');
    setPromptMode({ type: 'rename', id: collection.id, currentName: collection.name });
  }

  function validateName(name: string, currentId?: string): string | null {
    const trimmed = name.trim();
    if (!trimmed) return 'Name cannot be empty';
    const duplicate = collections.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== currentId,
    );
    if (duplicate) return 'A collection with this name already exists';
    return null;
  }

  async function handleConfirm() {
    if (!promptMode) return;
    const trimmed = inputValue.trim();
    const currentId = promptMode.type === 'rename' ? promptMode.id : undefined;
    const error = validateName(trimmed, currentId);
    if (error) {
      setInputError(error);
      return;
    }
    try {
      if (promptMode.type === 'create') {
        await createCollection(trimmed);
      } else {
        await renameCollection(promptMode.id, trimmed);
      }
      setPromptMode(null);
    } catch (e: unknown) {
      setInputError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  function handleDelete(collection: Collection) {
    Alert.alert(
      'Delete Collection',
      `Are you sure you want to delete "${collection.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeCollection(collection.id),
        },
      ],
    );
  }

  function showContextMenu(collection: Collection) {
    Alert.alert(collection.name, undefined, [
      { text: 'Rename', onPress: () => openRename(collection) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(collection) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function renderItem({ item }: { item: Collection }) {
    return (
      <View style={styles.row}>
        <Text style={styles.rowName}>{item.name}</Text>
        <TouchableOpacity
          onPress={() => showContextMenu(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`Options for ${item.name}`}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  }

  const promptTitle = promptMode?.type === 'create' ? 'New Collection' : 'Rename Collection';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <NavMenu />
        <Text style={styles.title}>Collections</Text>
        <TouchableOpacity
          onPress={openCreate}
          style={styles.addButton}
          accessibilityLabel="Add collection"
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={collections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={collections.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No collections yet. Tap + to create one.</Text>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <Modal
        visible={promptMode !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPromptMode(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{promptTitle}</Text>
            <TextInput
              style={[styles.input, inputError ? styles.inputError : null]}
              value={inputValue}
              onChangeText={(v) => {
                setInputValue(v);
                setInputError('');
              }}
              placeholder="Collection name"
              placeholderTextColor={COLORS.textSecondary}
              autoFocus
              onSubmitEditing={handleConfirm}
              returnKeyType="done"
            />
            {inputError ? <Text style={styles.errorText}>{inputError}</Text> : null}
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogBtn, styles.dialogBtnCancel]}
                onPress={() => setPromptMode(null)}
              >
                <Text style={styles.dialogBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dialogBtn, styles.dialogBtnConfirm]} onPress={handleConfirm}>
                <Text style={styles.dialogBtnConfirmText}>
                  {promptMode?.type === 'create' ? 'Create' : 'Rename'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  addButton: {
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
  },
  rowName: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginLeft: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    width: '80%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  inputError: {
    borderColor: '#db2828',
  },
  errorText: {
    fontSize: 13,
    color: '#db2828',
    marginTop: 6,
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  dialogBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dialogBtnCancel: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dialogBtnCancelText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  dialogBtnConfirm: {
    backgroundColor: COLORS.primary,
  },
  dialogBtnConfirmText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
});
