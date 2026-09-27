import { apiFetch } from "./api";
import { getExpiryMock } from "./mocks/expiry.mock";
import type { ExpiryFilters, ExpiryListResponse } from "../types/expiry";

const USE_MOCK = true;
const queryString = (filters: ExpiryFilters) => new URLSearchParams(Object.entries(filters).map(([key, value]) => [key, String(value)])).toString();

export const expiryService = {
  async list(filters: ExpiryFilters): Promise<ExpiryListResponse> {
    if (USE_MOCK) return getExpiryMock(filters);
    return apiFetch<ExpiryListResponse>(`/expiry?${queryString(filters)}`);
  },
  async writeOff(lotId: string): Promise<void> {
    if (USE_MOCK) return;
    await apiFetch<void>(`/expiry/${lotId}/write-off`, { method: "POST" });
  },
  async runFifo(): Promise<void> {
    if (USE_MOCK) return;
    await apiFetch<void>("/expiry/fifo", { method: "POST" });
  },
  async transferFifo(lotId: string): Promise<void> {
    if (USE_MOCK) return;
    await apiFetch<void>(`/expiry/${lotId}/transfer-fifo`, { method: "POST" });
  },
};
