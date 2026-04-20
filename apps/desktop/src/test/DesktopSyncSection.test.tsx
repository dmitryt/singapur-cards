import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { theme } from "../theme/theme";
import { DesktopSyncSection } from "../features/sync/DesktopSyncSection";
import type { PairedDevice, PairedDevicesSnapshot } from "../lib/tauri/commands";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  Channel: vi.fn().mockImplementation(() => ({ onmessage: null })),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

function renderSection() {
  return render(
    <ThemeProvider theme={theme}>
      <DesktopSyncSection />
    </ThemeProvider>
  );
}

const mockDevice = {
  id: "device-1",
  displayName: "My iPhone",
  pairedAt: "2026-04-01T10:00:00Z",
  lastSyncAt: "2026-04-10T08:30:00Z",
};

const mockPairingInfo = {
  host: "192.168.1.42",
  port: 8765,
  code: "042817",
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  displayName: "Desktop",
};

const emptyDevices: PairedDevicesSnapshot = { devices: [], firstSuccessfulSyncAt: null };

function snapshot(
  devices: PairedDevice[],
  firstSuccessfulSyncAt: string | null = null,
): PairedDevicesSnapshot {
  return { devices, firstSuccessfulSyncAt };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DesktopSyncSection — on-mount states", () => {
  it("renders idle state when no paired devices", async () => {
    mockInvoke.mockResolvedValueOnce(emptyDevices); // sync_get_paired_devices
    renderSection();
    await waitFor(() => {
      expect(screen.getByText(/Pair a mobile device/i)).toBeTruthy();
      expect(screen.getByText("Start Pairing")).toBeTruthy();
    });
  });

  it("renders paired state when devices exist", async () => {
    mockInvoke.mockResolvedValueOnce(snapshot([mockDevice])); // sync_get_paired_devices
    renderSection();
    await waitFor(() => {
      expect(screen.getByText("My iPhone")).toBeTruthy();
      expect(screen.getByText("Forget")).toBeTruthy();
      expect(screen.queryByText("Pair Another Device")).toBeNull();
    });
  });

  it("renders error state when command fails", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Sync server not initialized")); // sync_get_paired_devices
    renderSection();
    await waitFor(() => {
      expect(screen.getByText(/sync is unavailable/i)).toBeTruthy();
    });
  });

  it("shows 'Never synced' for device with null lastSyncAt", async () => {
    mockInvoke.mockResolvedValueOnce(snapshot([{ ...mockDevice, lastSyncAt: null }]));
    renderSection();
    await waitFor(() => {
      expect(screen.getByText("Never synced")).toBeTruthy();
    });
  });
});

describe("DesktopSyncSection — Start Pairing flow", () => {
  it("transitions to pairing view and shows code + countdown", async () => {
    mockInvoke
      .mockResolvedValueOnce(emptyDevices) // on-mount: sync_get_paired_devices
      .mockResolvedValueOnce(mockPairingInfo) // sync_start_pairing
      .mockResolvedValueOnce(emptyDevices); // pre-pairing device count

    renderSection();
    await waitFor(() => screen.getByText("Start Pairing"));
    fireEvent.click(screen.getByText("Start Pairing"));

    await waitFor(() => {
      expect(screen.getByText("042817")).toBeTruthy();
      expect(screen.getByText(/Expires in/i)).toBeTruthy();
      expect(screen.getByText(/192\.168\.1\.42:8765/)).toBeTruthy();
    });
  });
});

describe("DesktopSyncSection — Forget flow", () => {
  it("removes device after Forget confirmation", async () => {
    mockInvoke
      .mockResolvedValueOnce(snapshot([mockDevice])) // on-mount
      .mockResolvedValueOnce(undefined) // sync_forget_device
      .mockResolvedValueOnce(emptyDevices); // re-fetch after forget

    renderSection();
    await waitFor(() => screen.getByText("Forget"));
    fireEvent.click(screen.getByText("Forget"));

    // Confirm dialog should appear
    await waitFor(() => {
      expect(screen.getByText("Forget device?")).toBeTruthy();
    });

    // Click the red confirm button
    const confirmButtons = screen.getAllByText("Forget");
    const confirmBtn = confirmButtons[confirmButtons.length - 1];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/Pair a mobile device/i)).toBeTruthy();
    });
  });
});
