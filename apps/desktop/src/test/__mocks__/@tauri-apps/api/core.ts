import { vi } from "vitest";

export const invoke = vi.fn();
export const Channel = vi.fn().mockImplementation(() => ({
  onmessage: null,
}));
