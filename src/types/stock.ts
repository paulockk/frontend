import type { Batch, Category, Location, Product, Stock } from "./entities";

export type StockStatus = "NORMAL" | "LOW" | "OUT_OF_STOCK";
export type ExpiryWindow = "ALL" | "7" | "15" | "30" | "SAFE";

/** Read model assembled from Stock + Product + Batch + Location + Category. */
export interface StockListItem {
  stock: Stock;
  product: Product;
  batch: Batch;
  location: Location;
  category: Category;
  status: StockStatus;
  daysUntilExpiry: number | null;
}

export interface StockSummary {
  totalUnits: number;
  totalCost: number;
  normalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

export interface StockFilters {
  search: string;
  locationId: string;
  categoryId: string;
  status: StockStatus | "ALL";
  expiry: ExpiryWindow;
  lowStockOnly: boolean;
  page: number;
  pageSize: number;
}

export interface StockListResponse {
  items: StockListItem[];
  summary: StockSummary;
  locations: Location[];
  categories: Category[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}
