export type ExpirySeverity = "EXPIRED" | "CRITICAL" | "WARNING" | "REGULAR";

export interface ExpiryLot {
  id: string;
  sku: string;
  barcode: string;
  productName: string;
  category: string;
  location: string;
  batchNumber: string;
  expiryDate: string;
  daysRemaining: number;
  quantity: number;
  unit: string;
  totalCost: number;
  severity: ExpirySeverity;
  recommendedAction: string;
}

export interface ExpirySummaryItem {
  severity: ExpirySeverity;
  lotCount: number;
  totalCost: number;
}

export interface ExpiryFilters {
  search: string;
  location: string;
  category: string;
  severity: ExpirySeverity | "ALL";
  page: number;
  pageSize: number;
}

export interface ExpiryListResponse {
  items: ExpiryLot[];
  summary: ExpirySummaryItem[];
  locations: string[];
  categories: string[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}
