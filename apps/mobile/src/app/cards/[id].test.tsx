import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import CardDetailScreen from './[id]';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCollectionsStore } from '../../store/collectionsStore';
import { db } from '../../db';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../../store/collectionsStore', () => ({
  useCollectionsStore: jest.fn(),
}));

jest.mock('../../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../components/atoms/Badge', () => ({
  Badge: ({ label }: { label: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, `badge:${label}`);
  },
}));

jest.mock('../../components/atoms/Button', () => ({
  Button: ({ label, onPress }: { label: string; onPress: () => void }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return React.createElement(Pressable, { onPress }, React.createElement(Text, null, label));
  },
}));

describe('CardDetailScreen route behavior', () => {
  const back = jest.fn();
  const loadCollections = jest.fn();
  const insertValues = jest.fn().mockResolvedValue(undefined);
  const deleteWhere = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'card-1' });
    (useRouter as jest.Mock).mockReturnValue({ back });
    back.mockReset();
    loadCollections.mockReset();
    insertValues.mockClear();
    deleteWhere.mockClear();

    (useCollectionsStore as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        collections: [
          { id: 'col-1', name: 'Favorites' },
          { id: 'col-2', name: 'Travel' },
        ],
        load: loadCollections,
      }),
    );

    (db.insert as jest.Mock).mockReturnValue({ values: insertValues });
    (db.delete as jest.Mock).mockReturnValue({ where: deleteWhere });
  });

  it('shows card details when card exists', async () => {
    (db.select as jest.Mock).mockImplementation((selection) => {
      if (selection) {
        return {
          from: () => ({
            where: () => Promise.resolve([{ collectionId: 'col-1' }]),
          }),
        };
      }

      return {
        from: () => ({
          where: () =>
            Promise.resolve([
              {
                id: 'card-1',
                headword: 'Makan',
                language: 'en',
                answerText: '[b]to eat[/b]',
                learningStatus: 'learned',
                exampleText: 'I makan nasi lemak.',
                notes: 'Common in SG.',
              },
            ]),
        }),
      };
    });

    const { getByText } = render(<CardDetailScreen />);

    await waitFor(() => expect(getByText('Makan')).toBeTruthy());
    expect(getByText('to eat')).toBeTruthy();
    expect(getByText('I makan nasi lemak.')).toBeTruthy();
    expect(getByText('Common in SG.')).toBeTruthy();
    expect(loadCollections).toHaveBeenCalledTimes(1);
  });

  it('adds collection membership from sheet row press', async () => {
    (db.select as jest.Mock).mockImplementation((selection) => {
      if (selection) {
        return {
          from: () => ({
            where: () => Promise.resolve([{ collectionId: 'col-1' }]),
          }),
        };
      }

      return {
        from: () => ({
          where: () =>
            Promise.resolve([
              {
                id: 'card-1',
                headword: 'Makan',
                language: 'en',
                answerText: 'to eat',
                learningStatus: 'unreviewed',
                exampleText: null,
                notes: null,
              },
            ]),
        }),
      };
    });

    const { getAllByText, getByText } = render(<CardDetailScreen />);
    await waitFor(() => expect(getByText('Makan')).toBeTruthy());

    fireEvent.press(getAllByText('Collections')[0]!);
    fireEvent.press(getByText('Travel'));

    await waitFor(() => expect(insertValues).toHaveBeenCalledTimes(1));
  });
});
