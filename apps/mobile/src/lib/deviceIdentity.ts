import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'sync_local_device_id';

function generateUUID(): string {
  // RFC 4122 v4 UUID using Math.random (sufficient for device identity)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cachedDeviceId: string | null = null;

/** Returns the stable local device UUID, creating it on first call. */
export async function getLocalDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }

  const id = generateUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  cachedDeviceId = id;
  return id;
}

const SYNC_CREDENTIAL_PREFIX = 'sync_credential_';

/** Stores the long-lived sync credential for a paired desktop. */
export async function saveSyncCredential(desktopDeviceId: string, credential: string): Promise<void> {
  await SecureStore.setItemAsync(`${SYNC_CREDENTIAL_PREFIX}${desktopDeviceId}`, credential);
}

/** Retrieves the long-lived sync credential for a paired desktop. */
export async function getSyncCredential(desktopDeviceId: string): Promise<string | null> {
  return SecureStore.getItemAsync(`${SYNC_CREDENTIAL_PREFIX}${desktopDeviceId}`);
}

/** Removes the long-lived sync credential for a desktop (on forget/unpair). */
export async function deleteSyncCredential(desktopDeviceId: string): Promise<void> {
  await SecureStore.deleteItemAsync(`${SYNC_CREDENTIAL_PREFIX}${desktopDeviceId}`);
}
