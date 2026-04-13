import { create } from 'zustand';
import { eq, isNull, lt, and } from 'drizzle-orm';
import type { SQLiteDatabase } from 'expo-sqlite';
import { db, expoDb } from '../db';
import { syncDevices, syncChanges, syncTombstones, syncCursors, syncState } from '../db/schema';
import {
  getLocalDeviceId,
  saveSyncCredential,
  getSyncCredential,
  deleteSyncCredential,
} from '../lib/deviceIdentity';
import {
  buildBaseUrl,
  completePairing,
  pullPush,
  PROTOCOL_VERSION,
  type PairingCompleteRequest,
  type SyncChange,
  type SyncTombstone,
} from '../lib/syncClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncResult = 'success' | 'failure' | null;

export interface PairedDesktop {
  id: string;
  displayName: string;
  host: string;
  port: number;
  pairedAt: string;
  lastSyncAt: string | null;
}

export interface SyncStatusState {
  lastSyncAt: string | null;
  lastSyncResult: SyncResult;
  lastSyncError: string | null;
}

type SyncStoreState = {
  pairedDesktop: PairedDesktop | null;
  status: SyncStatusState;
  syncing: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  pairWithDesktop: (host: string, port: number, pairingToken: string) => Promise<void>;
  forgetDesktop: () => Promise<void>;
  syncNow: () => Promise<void>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateRequestId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function ensureLocalDevice(deviceId: string): Promise<void> {
  const existing = await db
    .select()
    .from(syncDevices)
    .where(eq(syncDevices.id, deviceId))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(syncDevices).values({
      id: deviceId,
      displayName: 'This device',
      isLocal: true,
      createdAt: new Date().toISOString(),
    });
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSyncStore = create<SyncStoreState>((set, get) => ({
  pairedDesktop: null,
  status: { lastSyncAt: null, lastSyncResult: null, lastSyncError: null },
  syncing: false,
  hydrated: false,

  hydrate: async () => {
    const localId = await getLocalDeviceId();
    await ensureLocalDevice(localId);

    const stateRows = await db.select().from(syncState).limit(1);
    const row = stateRows[0];
    if (!row?.pairedDesktopId) {
      set({ hydrated: true });
      return;
    }

    const deviceRows = await db
      .select()
      .from(syncDevices)
      .where(eq(syncDevices.id, row.pairedDesktopId))
      .limit(1);
    const desktop = deviceRows[0];
    if (!desktop?.host || !desktop.port) {
      set({ hydrated: true });
      return;
    }

    set({
      pairedDesktop: {
        id: desktop.id,
        displayName: desktop.displayName,
        host: desktop.host,
        port: desktop.port,
        pairedAt: desktop.pairedAt ?? desktop.createdAt,
        lastSyncAt: desktop.lastSyncAt ?? null,
      },
      status: {
        lastSyncAt: row.lastSyncAt ?? null,
        lastSyncResult: row.lastSyncResult ?? null,
        lastSyncError: row.lastSyncError ?? null,
      },
      hydrated: true,
    });
  },

  pairWithDesktop: async (host, port, pairingToken) => {
    const localId = await getLocalDeviceId();
    await ensureLocalDevice(localId);

    const baseUrl = buildBaseUrl(host, port);
    const req: PairingCompleteRequest = {
      mobileDeviceId: localId,
      pairingToken,
      mobileDisplayName: 'Mobile',
      protocolVersion: PROTOCOL_VERSION,
    };

    const res = await completePairing(baseUrl, req);
    const now = new Date().toISOString();

    // Upsert desktop peer metadata
    const existing = await db
      .select()
      .from(syncDevices)
      .where(eq(syncDevices.id, res.desktopDeviceId))
      .limit(1);
    if (existing.length > 0) {
      await db
        .update(syncDevices)
        .set({ displayName: res.desktopDisplayName, host, port, pairedAt: now })
        .where(eq(syncDevices.id, res.desktopDeviceId));
    } else {
      await db.insert(syncDevices).values({
        id: res.desktopDeviceId,
        displayName: res.desktopDisplayName,
        host,
        port,
        isLocal: false,
        pairedAt: now,
        createdAt: now,
      });
    }

    // Store long-lived credential securely
    await saveSyncCredential(res.desktopDeviceId, res.syncCredential);

    // Upsert sync_state singleton
    const stateRows = await db.select().from(syncState).limit(1);
    if (stateRows.length > 0) {
      await db
        .update(syncState)
        .set({ pairedDesktopId: res.desktopDeviceId, updatedAt: now })
        .where(eq(syncState.id, 'local'));
    } else {
      await db.insert(syncState).values({
        id: 'local',
        pairedDesktopId: res.desktopDeviceId,
        updatedAt: now,
      });
    }

    // Ensure a cursor row exists for this peer
    const cursorRows = await db
      .select()
      .from(syncCursors)
      .where(eq(syncCursors.peerDeviceId, res.desktopDeviceId))
      .limit(1);
    if (cursorRows.length === 0) {
      await db.insert(syncCursors).values({
        peerDeviceId: res.desktopDeviceId,
        lastRemoteLogicalClock: 0,
        lastAcknowledgedLocalLogicalClock: 0,
        updatedAt: now,
      });
    }

    set({
      pairedDesktop: {
        id: res.desktopDeviceId,
        displayName: res.desktopDisplayName,
        host,
        port,
        pairedAt: now,
        lastSyncAt: null,
      },
      status: { lastSyncAt: null, lastSyncResult: null, lastSyncError: null },
    });
  },

  forgetDesktop: async () => {
    const { pairedDesktop } = get();
    if (!pairedDesktop) return;

    const now = new Date().toISOString();
    await deleteSyncCredential(pairedDesktop.id);
    await db
      .update(syncState)
      .set({ pairedDesktopId: null, updatedAt: now })
      .where(eq(syncState.id, 'local'));

    set({
      pairedDesktop: null,
      status: { lastSyncAt: null, lastSyncResult: null, lastSyncError: null },
    });
  },

  syncNow: async () => {
    const { pairedDesktop, syncing } = get();
    if (!pairedDesktop || syncing) return;

    set({ syncing: true });

    try {
      const localId = await getLocalDeviceId();
      const credential = await getSyncCredential(pairedDesktop.id);
      if (!credential) {
        throw new Error('No sync credential — please re-pair with desktop.');
      }

      // Load cursor
      const cursorRows = await db
        .select()
        .from(syncCursors)
        .where(eq(syncCursors.peerDeviceId, pairedDesktop.id))
        .limit(1);
      const cursor = cursorRows[0] ?? {
        lastRemoteLogicalClock: 0,
        lastAcknowledgedLocalLogicalClock: 0,
      };

      // Collect unsent local changes
      const localChanges = await db
        .select()
        .from(syncChanges)
        .where(and(eq(syncChanges.deviceId, localId), isNull(syncChanges.appliedAt)));

      // Collect unsent local tombstones
      const localTombstones = await db
        .select()
        .from(syncTombstones)
        .where(and(eq(syncTombstones.deviceId, localId), isNull(syncTombstones.requestId)));

      const requestId = generateRequestId();
      const requestTimestamp = new Date().toISOString();
      const baseUrl = buildBaseUrl(pairedDesktop.host, pairedDesktop.port);

      const res = await pullPush(baseUrl, {
        mobileDeviceId: localId,
        desktopDeviceId: pairedDesktop.id,
        authToken: credential,
        requestId,
        requestTimestamp,
        knownRemoteCursor: cursor.lastRemoteLogicalClock,
        knownAckedLocalCursor: cursor.lastAcknowledgedLocalLogicalClock,
        changes: localChanges.map((c) => ({
          id: c.id,
          deviceId: c.deviceId,
          tableName: c.tableName,
          rowId: c.rowId,
          opType: c.opType,
          logicalClock: c.logicalClock,
          payloadJson: c.payloadJson,
          createdAt: c.createdAt,
        })),
        tombstones: localTombstones.map((t) => ({
          id: t.id,
          deviceId: t.deviceId,
          tableName: t.tableName,
          rowId: t.rowId,
          logicalClock: t.logicalClock,
          deletedAt: t.deletedAt,
        })),
        protocolVersion: PROTOCOL_VERSION,
      });

      // Apply remote changes in a transaction
      expoDb.withTransactionSync(() => {
        applyRemoteChanges(expoDb, res.changes, res.tombstones, localId, requestId);
      });

      const now = new Date().toISOString();

      // Advance cursor only after successful apply
      await db
        .update(syncCursors)
        .set({
          lastRemoteLogicalClock: res.remoteCursor,
          lastAcknowledgedLocalLogicalClock: res.acceptedLocalCursor,
          updatedAt: now,
        })
        .where(eq(syncCursors.peerDeviceId, pairedDesktop.id));

      // Mark local changes as acknowledged
      if (res.acceptedLocalCursor > 0) {
        await db
          .update(syncChanges)
          .set({ appliedAt: now })
          .where(and(eq(syncChanges.deviceId, localId), isNull(syncChanges.appliedAt)));

        await db
          .update(syncTombstones)
          .set({ requestId })
          .where(and(eq(syncTombstones.deviceId, localId), isNull(syncTombstones.requestId)));
      }

      // Update desktop last sync time
      await db
        .update(syncDevices)
        .set({ lastSyncAt: now })
        .where(eq(syncDevices.id, pairedDesktop.id));

      // Update sync_state
      await db
        .update(syncState)
        .set({
          lastSyncAt: now,
          lastSyncResult: 'success',
          lastSyncError: null,
          lastRequestId: requestId,
          updatedAt: now,
        })
        .where(eq(syncState.id, 'local'));

      // Purge acknowledged changes older than 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      await db
        .delete(syncChanges)
        .where(
          and(
            eq(syncChanges.deviceId, localId),
            lt(syncChanges.appliedAt!, sevenDaysAgo),
          ),
        );

      set({
        syncing: false,
        pairedDesktop: { ...pairedDesktop, lastSyncAt: now },
        status: { lastSyncAt: now, lastSyncResult: 'success', lastSyncError: null },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const now = new Date().toISOString();

      try {
        await db
          .update(syncState)
          .set({
            lastSyncAt: now,
            lastSyncResult: 'failure',
            lastSyncError: errorMessage,
            updatedAt: now,
          })
          .where(eq(syncState.id, 'local'));
      } catch {
        // best-effort
      }

      set({
        syncing: false,
        status: {
          lastSyncAt: now,
          lastSyncResult: 'failure',
          lastSyncError: errorMessage,
        },
      });
    }
  },
}));

// ---------------------------------------------------------------------------
// Remote change application (runs inside a sync transaction)
// ---------------------------------------------------------------------------

function applyRemoteChanges(
  rawDb: SQLiteDatabase,
  changes: SyncChange[],
  tombstones: SyncTombstone[],
  localDeviceId: string,
  requestId: string,
): void {
  // Apply tombstones first
  for (const tombstone of tombstones) {
    const { tableName, rowId, logicalClock } = tombstone;

    if (tableName === 'collection_memberships') {
      const [collectionId, cardId] = rowId.split(':');
      rawDb.runSync(
        `DELETE FROM collection_memberships WHERE collection_id = ? AND card_id = ?`,
        [collectionId, cardId],
      );
    } else {
      // Only delete if tombstone clock >= latest local change clock for this row
      const local = rawDb.getFirstSync<{ lc: number }>(
        `SELECT COALESCE(MAX(logical_clock), 0) AS lc FROM sync_changes WHERE table_name = ? AND row_id = ?`,
        [tableName, rowId],
      );
      if (logicalClock >= (local?.lc ?? 0)) {
        rawDb.runSync(`DELETE FROM ${tableName} WHERE id = ?`, [rowId]);
      }
    }

    rawDb.runSync(
      `INSERT OR IGNORE INTO sync_tombstones (id, device_id, table_name, row_id, logical_clock, request_id, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tombstone.id, tombstone.deviceId, tableName, rowId, logicalClock, requestId, tombstone.deletedAt],
    );
  }

  // Apply changes
  for (const change of changes) {
    const { tableName, rowId, logicalClock, opType, payloadJson } = change;

    // Skip if a tombstone already removed this row with equal or higher clock
    const tomb = rawDb.getFirstSync<{ lc: number }>(
      `SELECT COALESCE(MAX(logical_clock), 0) AS lc FROM sync_tombstones WHERE table_name = ? AND row_id = ?`,
      [tableName, rowId],
    );
    if (tomb && tomb.lc >= logicalClock) continue;

    const payload = JSON.parse(payloadJson) as Record<string, unknown>;

    const s = (v: unknown) => (v ?? null) as string | null;

    if (tableName === 'review_events') {
      rawDb.runSync(
        `INSERT OR IGNORE INTO review_events (id, card_id, result, reviewed_at) VALUES (?, ?, ?, ?)`,
        [s(payload.id), s(payload.card_id), s(payload.result), s(payload.reviewed_at)],
      );
    } else if (tableName === 'collection_memberships') {
      rawDb.runSync(
        `INSERT OR IGNORE INTO collection_memberships (collection_id, card_id, created_at) VALUES (?, ?, ?)`,
        [s(payload.collection_id), s(payload.card_id), s(payload.created_at)],
      );
    } else {
      // LWW by logical_clock; tie-break by device_id string comparison
      const existing = rawDb.getFirstSync<{ lc: number }>(
        `SELECT COALESCE(MAX(logical_clock), 0) AS lc FROM sync_changes WHERE table_name = ? AND row_id = ? AND device_id = ?`,
        [tableName, rowId, localDeviceId],
      );
      const localClock = existing?.lc ?? 0;

      const shouldApply =
        logicalClock > localClock ||
        (logicalClock === localClock && change.deviceId > localDeviceId);

      if (shouldApply) {
        upsertRow(rawDb, tableName, payload);
      }
    }

    // Record received change for cursor tracking and future cleanup
    rawDb.runSync(
      `INSERT OR IGNORE INTO sync_changes
         (id, device_id, table_name, row_id, op_type, logical_clock, payload_json, request_id, applied_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
      [change.id, change.deviceId, tableName, rowId, opType, logicalClock, payloadJson, requestId, change.createdAt],
    );
  }
}

function upsertRow(
  rawDb: SQLiteDatabase,
  tableName: string,
  payload: Record<string, unknown>,
): void {
  const columns = Object.keys(payload);
  const placeholders = columns.map(() => '?').join(', ');
  const updates = columns
    .filter((c) => c !== 'id')
    .map((c) => `${c} = excluded.${c}`)
    .join(', ');
  const values = columns.map((c) => payload[c] ?? null) as (string | number | null)[];

  rawDb.runSync(
    `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${updates}`,
    values,
  );
}
