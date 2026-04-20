import {
  SyncClientError,
  buildBaseUrl,
  completePairing,
  forgetPairing,
  pullPush,
} from './syncClient';

describe('syncClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('buildBaseUrl normalizes host input', () => {
    expect(buildBaseUrl(' http://192.168.1.5/ ', 8787)).toBe('http://192.168.1.5:8787');
    expect(buildBaseUrl('[::1]', 8787)).toBe('http://::1:8787');
  });

  it('completePairing posts and returns parsed json', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          desktopDeviceId: 'desktop-1',
          desktopDisplayName: 'Desktop',
          syncCredential: 'cred',
        }),
    });

    const result = await completePairing('http://localhost:47821', {
      mobileDeviceId: 'mobile-1',
      pairingToken: '123456',
      mobileDisplayName: 'Mobile',
      protocolVersion: 1,
    });

    expect(result.desktopDeviceId).toBe('desktop-1');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('pullPush throws SyncClientError with parsed code on error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ code: 'PAIRING_REVOKED' }),
    });

    await expect(
      pullPush('http://localhost:47821', {
        mobileDeviceId: 'm',
        desktopDeviceId: 'd',
        authToken: 't',
        requestId: 'r',
        requestTimestamp: new Date().toISOString(),
        knownRemoteCursor: 0,
        knownAckedLocalCursor: 0,
        changes: [],
        tombstones: [],
        protocolVersion: 1,
      }),
    ).rejects.toMatchObject<Partial<SyncClientError>>({
      name: 'SyncClientError',
      status: 401,
      code: 'PAIRING_REVOKED',
    });
  });

  it('forgetPairing surfaces network failure as SyncClientError', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));

    await expect(
      forgetPairing('http://localhost:47821', {
        mobileDeviceId: 'm',
        authToken: 't',
        protocolVersion: 1,
      }),
    ).rejects.toThrow(SyncClientError);
  });
});
