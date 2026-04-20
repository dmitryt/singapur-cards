import { useSyncStore } from './syncStore';
import { db } from '../db';
import {
  deleteSyncCredential,
  getLocalDeviceId,
  getSyncCredential,
  saveSyncCredential,
} from '../lib/deviceIdentity';
import { SyncClientError, completePairing, pullPush } from '../lib/syncClient';

jest.mock('../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  expoDb: {
    withTransactionAsync: jest.fn(),
  },
}));

jest.mock('../lib/deviceIdentity', () => ({
  getLocalDeviceId: jest.fn(),
  saveSyncCredential: jest.fn(),
  getSyncCredential: jest.fn(),
  deleteSyncCredential: jest.fn(),
}));

jest.mock('../lib/syncClient', () => {
  class MockSyncClientError extends Error {
    status?: number;
    body?: string;
    code?: string;

    constructor(message: string, status?: number, body?: string, code?: string) {
      super(message);
      this.name = 'SyncClientError';
      this.status = status;
      this.body = body;
      this.code = code;
    }
  }

  return {
    PROTOCOL_VERSION: 1,
    SyncClientError: MockSyncClientError,
    buildBaseUrl: jest.fn((host: string, port: number) => `http://${host}:${port}`),
    completePairing: jest.fn(),
    forgetPairing: jest.fn(),
    pullPush: jest.fn(),
  };
});

function selectFromResult(rows: unknown[]) {
  return {
    from: () => ({
      limit: () => Promise.resolve(rows),
      where: () => ({
        limit: () => Promise.resolve(rows),
      }),
    }),
  };
}

function whereResult(rows: unknown[]) {
  return {
    from: () => ({
      where: () => Promise.resolve(rows),
    }),
  };
}

describe('useSyncStore', () => {
  beforeEach(() => {
    useSyncStore.setState({
      pairedDesktop: null,
      status: { lastSyncAt: null, lastSyncResult: null, lastSyncError: null },
      firstSuccessfulSyncAt: null,
      syncing: false,
      hydrated: false,
    });
    (getLocalDeviceId as jest.Mock).mockReset();
    (getSyncCredential as jest.Mock).mockReset();
    (saveSyncCredential as jest.Mock).mockReset();
    (deleteSyncCredential as jest.Mock).mockReset();
    (completePairing as jest.Mock).mockReset();
    (pullPush as jest.Mock).mockReset();
    (db.select as jest.Mock).mockReset();
    (db.insert as jest.Mock).mockReset();
    (db.update as jest.Mock).mockReset();
    (db.delete as jest.Mock).mockReset();
  });

  it('syncNow is a no-op without a paired desktop', async () => {
    await useSyncStore.getState().syncNow();
    expect(getLocalDeviceId).not.toHaveBeenCalled();
  });

  it('forgetDesktop is a no-op without a paired desktop', async () => {
    await useSyncStore.getState().forgetDesktop();
    expect(getLocalDeviceId).not.toHaveBeenCalled();
  });

  it('syncNow records failure when credential is missing', async () => {
    (db.select as jest.Mock)
      .mockReturnValueOnce(selectFromResult([]))
      .mockReturnValueOnce(whereResult([]))
      .mockReturnValueOnce(whereResult([]));

    const where = jest.fn().mockResolvedValue(undefined);
    const set = jest.fn(() => ({ where }));
    (db.update as jest.Mock).mockReturnValue({ set });
    (getLocalDeviceId as jest.Mock).mockResolvedValue('mobile-1');
    (getSyncCredential as jest.Mock).mockResolvedValue(null);

    useSyncStore.setState({
      pairedDesktop: {
        id: 'desktop-1',
        displayName: 'Desktop',
        host: '127.0.0.1',
        port: 8787,
        pairedAt: '2026-01-01T00:00:00.000Z',
        lastSyncAt: null,
      },
      syncing: false,
    });

    await useSyncStore.getState().syncNow();

    const next = useSyncStore.getState();
    expect(next.syncing).toBe(false);
    expect(next.status.lastSyncResult).toBe('failure');
    expect(next.status.lastSyncError).toContain('No sync credential');
    expect(where).toHaveBeenCalledTimes(1);
  });

  it('pairWithDesktop replaces prior desktop trust session', async () => {
    (getLocalDeviceId as jest.Mock).mockResolvedValue('mobile-1');
    (completePairing as jest.Mock).mockResolvedValue({
      desktopDeviceId: 'desktop-new',
      desktopDisplayName: 'New Desktop',
      syncCredential: 'cred-new',
    });

    (db.select as jest.Mock)
      .mockReturnValueOnce(selectFromResult([]))
      .mockReturnValueOnce(selectFromResult([{ pairedDesktopId: 'desktop-old' }]))
      .mockReturnValueOnce(selectFromResult([]))
      .mockReturnValueOnce(selectFromResult([{ id: 'local' }]))
      .mockReturnValueOnce(selectFromResult([]));

    const insertValues = jest.fn().mockResolvedValue(undefined);
    (db.insert as jest.Mock).mockReturnValue({ values: insertValues });

    const deleteWhere = jest.fn().mockResolvedValue(undefined);
    (db.delete as jest.Mock).mockReturnValue({ where: deleteWhere });

    const updateWhere = jest.fn().mockResolvedValue(undefined);
    const updateSet = jest.fn(() => ({ where: updateWhere }));
    (db.update as jest.Mock).mockReturnValue({ set: updateSet });

    await useSyncStore.getState().pairWithDesktop('192.168.1.2', 47821, '123456');

    expect(deleteSyncCredential).toHaveBeenCalledWith('desktop-old');
    expect(saveSyncCredential).toHaveBeenCalledWith('desktop-new', 'cred-new');
    expect(useSyncStore.getState().pairedDesktop?.id).toBe('desktop-new');
    expect(deleteWhere).toHaveBeenCalledTimes(2);
  });

  it('syncNow handles pairing revoked by clearing local pairing state', async () => {
    (getLocalDeviceId as jest.Mock).mockResolvedValue('mobile-1');
    (getSyncCredential as jest.Mock).mockResolvedValue('cred-1');
    (pullPush as jest.Mock).mockRejectedValue(
      new SyncClientError('revoked', 401, '{"code":"PAIRING_REVOKED"}', 'PAIRING_REVOKED'),
    );

    (db.select as jest.Mock)
      .mockReturnValueOnce(selectFromResult([]))
      .mockReturnValueOnce(whereResult([]))
      .mockReturnValueOnce(whereResult([]));

    const deleteWhere = jest.fn().mockResolvedValue(undefined);
    (db.delete as jest.Mock).mockReturnValue({ where: deleteWhere });

    const updateWhere = jest.fn().mockResolvedValue(undefined);
    const updateSet = jest.fn(() => ({ where: updateWhere }));
    (db.update as jest.Mock).mockReturnValue({ set: updateSet });

    useSyncStore.setState({
      pairedDesktop: {
        id: 'desktop-1',
        displayName: 'Desktop',
        host: '127.0.0.1',
        port: 8787,
        pairedAt: '2026-01-01T00:00:00.000Z',
        lastSyncAt: null,
      },
      syncing: false,
    });

    await useSyncStore.getState().syncNow();

    const next = useSyncStore.getState();
    expect(next.pairedDesktop).toBeNull();
    expect(next.status.lastSyncResult).toBe('failure');
    expect(next.status.lastSyncError).toContain('removed pairing');
    expect(deleteSyncCredential).toHaveBeenCalledWith('desktop-1');
    expect(deleteWhere).toHaveBeenCalledTimes(2);
    expect(updateWhere).toHaveBeenCalledTimes(1);
  });
});
