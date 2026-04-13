// Typed fetch wrapper for the desktop sync HTTP API.

export interface SyncChange {
  id: string;
  deviceId: string;
  tableName: string;
  rowId: string;
  opType: 'insert' | 'update';
  logicalClock: number;
  payloadJson: string;
  createdAt: string;
}

export interface SyncTombstone {
  id: string;
  deviceId: string;
  tableName: string;
  rowId: string;
  logicalClock: number;
  deletedAt: string;
}

export interface QRPayload {
  desktopDeviceId: string;
  desktopDisplayName: string;
  host: string;
  port: number;
  pairingToken: string;
  expiresAt: string;
  protocolVersion: number;
}

export interface PairingCompleteRequest {
  mobileDeviceId: string;
  pairingToken: string;
  mobileDisplayName: string;
  protocolVersion: number;
}

export interface PairingCompleteResponse {
  desktopDeviceId: string;
  desktopDisplayName: string;
  syncCredential: string;
}

export interface PullPushRequest {
  mobileDeviceId: string;
  desktopDeviceId: string;
  authToken: string;
  requestId: string;
  requestTimestamp: string;
  knownRemoteCursor: number;
  knownAckedLocalCursor: number;
  changes: SyncChange[];
  tombstones: SyncTombstone[];
  protocolVersion: number;
}

export interface PullPushResponse {
  acceptedLocalCursor: number;
  remoteCursor: number;
  requestId: string;
  changes: SyncChange[];
  tombstones: SyncTombstone[];
  serverTime: string;
  conflictsSummary: { table: string; rowId: string; resolution: string }[];
}

export const PROTOCOL_VERSION = 1;

export class SyncClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = 'SyncClientError';
  }
}

async function post<TReq, TRes>(url: string, body: TReq): Promise<TRes> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new SyncClientError(
      `HTTP ${res.status} from ${url}`,
      res.status,
      text,
    );
  }
  return JSON.parse(text) as TRes;
}

export function buildBaseUrl(host: string, port: number): string {
  return `http://${host}:${port}`;
}

export async function completePairing(
  baseUrl: string,
  req: PairingCompleteRequest,
): Promise<PairingCompleteResponse> {
  return post<PairingCompleteRequest, PairingCompleteResponse>(
    `${baseUrl}/pairing/complete`,
    req,
  );
}

export async function pullPush(
  baseUrl: string,
  req: PullPushRequest,
): Promise<PullPushResponse> {
  return post<PullPushRequest, PullPushResponse>(
    `${baseUrl}/sync/pull-push`,
    req,
  );
}
