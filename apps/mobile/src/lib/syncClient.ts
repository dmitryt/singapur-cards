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

export interface PairingForgetRequest {
  mobileDeviceId: string;
  authToken: string;
  protocolVersion: number;
}

export interface PairingForgetResponse {
  ok: boolean;
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
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'SyncClientError';
  }
}

function normalizeHost(host: string): string {
  let normalized = host.trim();
  normalized = normalized.replace(/^https?:\/\//i, '');
  normalized = normalized.replace(/\/+$/, '');
  // Accept bracketed IPv6 input like [::1]
  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    normalized = normalized.slice(1, -1);
  }
  return normalized;
}

async function post<TReq, TRes>(url: string, body: TReq): Promise<TRes> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new SyncClientError(`Network request failed for ${url}: ${reason}`);
  }
  const text = await res.text();
  if (!res.ok) {
    let errorCode: string | undefined;
    try {
      const parsed = JSON.parse(text) as { code?: unknown };
      if (typeof parsed.code === 'string') {
        errorCode = parsed.code;
      }
    } catch {
      // keep undefined for plain-text / non-JSON error payloads
    }
    throw new SyncClientError(
      `HTTP ${res.status} from ${url}`,
      res.status,
      text,
      errorCode,
    );
  }
  return JSON.parse(text) as TRes;
}

export function buildBaseUrl(host: string, port: number): string {
  return `http://${normalizeHost(host)}:${port}`;
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

export async function forgetPairing(
  baseUrl: string,
  req: PairingForgetRequest,
): Promise<PairingForgetResponse> {
  return post<PairingForgetRequest, PairingForgetResponse>(
    `${baseUrl}/pairing/forget`,
    req,
  );
}
