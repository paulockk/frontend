import { apiFetch } from "./api";
import { getStockMock } from "./mocks/stock.mock";
import type { StockFilters, StockListResponse } from "../types/stock";

// Flip to false when the backend endpoint is available.
const USE_MOCK = true;
function queryString(filters: StockFilters): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) query.set(key, String(value));
  return query.toString();
}
export const stockService = {
  async list(filters: StockFilters): Promise<StockListResponse> {
    if (USE_MOCK) return getStockMock(filters);
    return apiFetch<StockListResponse>(`/stock?${queryString(filters)}`);
  },
};
