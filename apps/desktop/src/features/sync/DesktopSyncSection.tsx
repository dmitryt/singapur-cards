import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Confirm, Icon } from "semantic-ui-react";
import {
  syncStartPairing,
  syncGetPairedDevices,
  syncForgetDevice,
  type PairingModeInfo,
  type PairedDevice,
} from "../../lib/tauri/commands";

// ── Types ─────────────────────────────────────────────────────────────────────

type SyncView =
  | { kind: "idle"; expiredNotice?: boolean }
  | { kind: "pairing"; info: PairingModeInfo; secondsRemaining: number }
  | { kind: "paired"; devices: PairedDevice[] }
  | { kind: "error"; message: string };

// ── Styled components ─────────────────────────────────────────────────────────

const Section = styled.div`
  max-width: 400px;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Button = styled.button<{ $variant?: "danger" | "primary" }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  background-color: ${({ $variant, theme }) =>
    $variant === "danger" ? "#e74c3c" : theme.colors.primary ?? "#4a90e2"};
  color: white;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    opacity: 0.85;
  }
`;

const StatusText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: ${({ theme }) => theme.spacing.xs} 0 0;
`;

const PairingBox = styled.div`
  background: ${({ theme }) => theme.colors.background ?? "#f5f5f5"};
  border-radius: 6px;
  padding: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const CodeRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin: ${({ theme }) => theme.spacing.sm} 0;
`;

const CodeText = styled.span`
  font-family: monospace;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0.25em;
  color: ${({ theme }) => theme.colors.text ?? "#333"};
`;

const AddressRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin: ${({ theme }) => theme.spacing.xs} 0;
`;

const AddressText = styled.span`
  font-family: monospace;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text ?? "#333"};
`;

const CopyIconButton = styled.button`
  background: transparent;
  border: none;
  padding: 0 2px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1;
  &:hover {
    color: ${({ theme }) => theme.colors.text ?? "#333"};
  }
`;

const CopiedText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs ?? theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const DeviceRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.sm} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border ?? "#eee"};
  &:last-child {
    border-bottom: none;
  }
`;

const DeviceInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const DeviceName = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text ?? "#333"};
`;

const DeviceSync = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs ?? theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// ── CopyIcon component ────────────────────────────────────────────────────────

function CopyIcon({ text, title }: { text: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleClick() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setCopied(false);
      timeoutRef.current = null;
    }, 3000);
  }

  return (
    <>
      <CopyIconButton onClick={handleClick} title={title ?? "Copy"}>
        <Icon name={copied ? "check" : "copy outline"} style={{ margin: 0 }} />
      </CopyIconButton>
      {copied && <CopiedText>Copied!</CopiedText>}
    </>
  );
}

// ── DesktopSyncSection component ──────────────────────────────────────────────

export function DesktopSyncSection() {
  const [view, setView] = useState<SyncView>({ kind: "idle" });
  const [forgetDeviceId, setForgetDeviceId] = useState<string | null>(null);

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearAllIntervals() {
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (pollingIntervalRef.current !== null) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }

  // On mount: load paired devices to determine initial view
  useEffect(() => {
    syncGetPairedDevices().then((result) => {
      if (!result.ok) {
        setView({ kind: "error", message: result.message });
      } else if (result.data.length >= 1) {
        setView({ kind: "paired", devices: result.data });
      } else {
        setView({ kind: "idle" });
      }
    });

    return () => {
      clearAllIntervals();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Idle view ────────────────────────────────────────────────────────────────

  async function handleStartPairing() {
    clearAllIntervals();

    const result = await syncStartPairing();
    if (!result.ok) {
      setView({ kind: "error", message: result.message });
      return;
    }

    const info = result.data;
    const secondsRemaining = Math.ceil(
      (new Date(info.expiresAt).getTime() - Date.now()) / 1000
    );

    const preResult = await syncGetPairedDevices();
    const preCount = preResult.ok ? preResult.data.length : 0;

    setView({ kind: "pairing", info, secondsRemaining });

    // 1s countdown interval
    countdownIntervalRef.current = setInterval(() => {
      const remaining = Math.ceil(
        (new Date(info.expiresAt).getTime() - Date.now()) / 1000
      );
      if (remaining <= 0) {
        clearAllIntervals();
        setView({ kind: "idle", expiredNotice: true });
      } else {
        setView((prev) =>
          prev.kind === "pairing" ? { ...prev, secondsRemaining: remaining } : prev
        );
      }
    }, 1000);

    // 2s polling interval
    pollingIntervalRef.current = setInterval(async () => {
      const pollResult = await syncGetPairedDevices();
      if (pollResult.ok && pollResult.data.length > preCount) {
        clearAllIntervals();
        setView({ kind: "paired", devices: pollResult.data });
      }
    }, 2000);
  }

  // ── Forget device ────────────────────────────────────────────────────────────

  async function handleForgetConfirm() {
    if (!forgetDeviceId) return;
    const id = forgetDeviceId;
    setForgetDeviceId(null);

    await syncForgetDevice(id);

    const result = await syncGetPairedDevices();
    if (!result.ok) {
      setView({ kind: "error", message: result.message });
    } else if (result.data.length === 0) {
      setView({ kind: "idle" });
    } else {
      setView({ kind: "paired", devices: result.data });
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Section>
      <Label>Desktop Sync</Label>

      {view.kind === "idle" && (
        <>
          {view.expiredNotice && (
            <StatusText style={{ color: "#c0392b", marginBottom: "8px" }}>
              Session expired. Start a new pairing session.
            </StatusText>
          )}
          <StatusText>Pair a mobile device to sync your flashcards.</StatusText>
          <Button style={{ marginTop: "8px" }} onClick={handleStartPairing}>
            Start Pairing
          </Button>
        </>
      )}

      {view.kind === "pairing" && (
        <PairingBox>
          <StatusText>
            <strong>{view.info.displayName}</strong>
          </StatusText>
          <AddressRow>
            <AddressText>{view.info.host}:{view.info.port}</AddressText>
            <CopyIcon text={`${view.info.host}:${view.info.port}`} title="Copy address" />
          </AddressRow>
          <StatusText>Enter this code on your mobile device:</StatusText>
          <CodeRow>
            <CodeText>{view.info.code}</CodeText>
            <CopyIcon text={view.info.code} title="Copy code" />
          </CodeRow>
          <StatusText>Expires in {view.secondsRemaining} s</StatusText>
        </PairingBox>
      )}

      {view.kind === "paired" && (
        <>
          {view.devices.length === 0 ? (
            <StatusText>No paired devices.</StatusText>
          ) : (
            view.devices.map((device) => (
              <DeviceRow key={device.id}>
                <DeviceInfo>
                  <DeviceName>{device.displayName}</DeviceName>
                  <DeviceSync>
                    {device.lastSyncAt
                      ? new Date(device.lastSyncAt).toLocaleString()
                      : "Never synced"}
                  </DeviceSync>
                </DeviceInfo>
                <Button $variant="danger" onClick={() => setForgetDeviceId(device.id)}>
                  Forget
                </Button>
              </DeviceRow>
            ))
          )}
        </>
      )}

      {view.kind === "error" && (
        <StatusText style={{ color: "#c0392b" }}>
          Desktop sync is unavailable. The sync server may not have started correctly.
        </StatusText>
      )}

      <Confirm
        open={forgetDeviceId !== null}
        header="Forget device?"
        content="This will remove the paired device. You will need to pair again to re-connect."
        confirmButton={{ content: "Forget", color: "red" } as object}
        onCancel={() => setForgetDeviceId(null)}
        onConfirm={handleForgetConfirm}
      />
    </Section>
  );
}

export default DesktopSyncSection;
