import { apiFetch } from "./api";
import { getStockMock } from "./mocks/stock.mock";
import type { StockFilters, StockListResponse } from "../types/stock";
import type { Batch, Category, Location, Product, Stock } from "../types/entities";

const USE_MOCK = false;
type ApiLot = {
  batchId: string; productId: string; sku: string; productName: string;
  categoryId: string | null; category: string | null; locationId: string; location: string;
  batchNumber: string | null; expiryDate: string | null; daysRemaining: number | null;
  quantity: string; unit: string;
  severity: "EXPIRED" | "CRITICAL" | "WARNING" | "REGULAR";
};
type ApiLocation = { id: string; name: string; address: string | null; type: Location["type"]; status: "ACTIVE" | "MAINTENANCE"; createdAt: string; updatedAt: string };
type ApiCategory = { id: string; name: string; createdAt: string; updatedAt: string };
type LowStockItem = { productId: string; locationId: string; quantity: string };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mapLot(lot: ApiLot, lowStock: LowStockItem[], locations: Location[], categories: Category[]) {
  const category = categories.find((item) => item.id === lot.categoryId)
    ?? { id: lot.categoryId ?? "uncategorized", name: lot.category ?? "Sem categoria", createdAt: "", updatedAt: "" };
  const location = locations.find((item) => item.id === lot.locationId)
    ?? { id: lot.locationId, name: lot.location, type: "WAREHOUSE" as const, description: null, isActive: true, createdAt: "", updatedAt: "" };
  const isLow = lowStock.some((item) => item.productId === lot.productId && item.locationId === lot.locationId);
  const quantity = Number(lot.quantity);
  const product: Product = {
    id: lot.productId, barcode: lot.sku, name: lot.productName, description: null, brand: null,
    categoryId: lot.categoryId ?? "uncategorized", unit: lot.unit, minimumStock: null,
    purchasePrice: 0, salePrice: 0, isActive: true, createdAt: "", updatedAt: "",
  };
  const batch: Batch = {
    id: lot.batchId, productId: lot.productId, batchCode: lot.batchNumber ?? "—",
    expirationDate: lot.expiryDate, purchasePrice: null, createdAt: "", updatedAt: "",
  };
  const stock: Stock = { id: lot.batchId, productId: lot.productId, batchId: lot.batchId, locationId: lot.locationId, quantity, updatedAt: "" };
  return {
    stock, product, batch, location, category,
    status: quantity <= 0 ? "OUT_OF_STOCK" as const : isLow ? "LOW" as const : "NORMAL" as const,
    daysUntilExpiry: lot.daysRemaining,
  };
}

function queryString(filters: StockFilters): string {
  const query = new URLSearchParams();
  query.set("page", "1");
  query.set("pageSize", "100");
  if (filters.search.trim()) query.set("search", filters.search.trim());
  if (isUuid(filters.locationId)) query.set("locationId", filters.locationId);
  return query.toString();
}
export const stockService = {
  async list(filters: StockFilters): Promise<StockListResponse> {
    if (USE_MOCK) return getStockMock(filters);
    const query = queryString(filters);
    const [firstPage, locationResult, categoryResult, alertResult] = await Promise.all([
      apiFetch<{ items: ApiLot[]; pagination: { totalPages: number } }>(`/stock/lots?${query}`),
      apiFetch<{ items: ApiLocation[] }>("/locations?page=1&pageSize=100"),
      apiFetch<{ items: ApiCategory[] }>("/categories?page=1&pageSize=100"),
      apiFetch<{ lowStock: { items: LowStockItem[] } }>("/stock/alerts?limit=100"),
    ]);
    const otherPages = await Promise.all(Array.from(
      { length: Math.max(0, firstPage.pagination.totalPages - 1) },
      (_, index) => apiFetch<{ items: ApiLot[] }>(`/stock/lots?${query.replace("page=1", `page=${index + 2}`)}`),
    ));
    const locations: Location[] = locationResult.items.map((item) => ({
      id: item.id, name: item.name, type: item.type, description: item.address,
      isActive: item.status === "ACTIVE", createdAt: item.createdAt, updatedAt: item.updatedAt,
    }));
    const categories: Category[] = categoryResult.items;
    const mapped = [firstPage, ...otherPages].flatMap((page) => page.items)
      .map((lot) => mapLot(lot, alertResult.lowStock.items, locations, categories))
      .filter((item) => filters.categoryId === "ALL" || item.category.id === filters.categoryId)
      .filter((item) => filters.status === "ALL" || item.status === filters.status)
      .filter((item) => !filters.lowStockOnly || item.status !== "NORMAL")
      .filter((item) => filters.expiry === "ALL"
        || (filters.expiry === "SAFE" ? item.daysUntilExpiry !== null && item.daysUntilExpiry > 30
          : item.daysUntilExpiry !== null && item.daysUntilExpiry >= 0 && item.daysUntilExpiry <= Number(filters.expiry)));
    const start = (filters.page - 1) * filters.pageSize;
    return {
      items: mapped.slice(start, start + filters.pageSize),
      summary: {
        totalUnits: mapped.reduce((sum, item) => sum + item.stock.quantity, 0),
        totalCost: 0,
        normalProducts: mapped.filter((item) => item.status === "NORMAL").length,
        lowStockProducts: mapped.filter((item) => item.status === "LOW").length,
        outOfStockProducts: mapped.filter((item) => item.status === "OUT_OF_STOCK").length,
      },
      locations,
      categories,
      pagination: { page: filters.page, pageSize: filters.pageSize, totalItems: mapped.length, totalPages: Math.max(1, Math.ceil(mapped.length / filters.pageSize)) },
    };
  },
};
