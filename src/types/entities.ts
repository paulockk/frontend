export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  description: string | null;
  brand: string | null;
  categoryId: string;
  unit: string;
  minimumStock: number | null;
  purchasePrice: number;
  salePrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type LocationType =
  | "MARKET"
  | "VENDING_MACHINE"
  | "WAREHOUSE";

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: string;
  productId: string;
  batchCode: string;
  expirationDate: string | null;
  purchasePrice: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Stock {
  id: string;
  productId: string;
  batchId: string;
  locationId: string;
  quantity: number;
  updatedAt: string;
}

export type StockMovementType =
  | "ENTRY"
  | "EXIT"
  | "TRANSFER"
  | "ADJUSTMENT";

export interface StockMovement {
  id: string;
  productId: string;
  batchId: string;
  quantity: number;
  type: StockMovementType;
  originLocationId: string | null;
  destinationLocationId: string | null;
  reason: string | null;
  userId: string;
  createdAt: string;
}

export type SaleSource =
  | "MANUAL"
  | "SHOPBUD"
  | "VMPAY"
  | "IMPORT";

export interface Sale {
  id: string;
  productId: string;
  batchId: string | null;
  locationId: string;
  quantity: number;
  amount: number;
  source: SaleSource;
  soldAt: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Purchase {
  id: string;
  supplierId: string;
  purchaseDate: string;
  totalAmount: number;
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  batchId: string;
  quantity: number;
  unitPrice: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Settings {
  id: string;
  companyName: string | null;
  expiryWarningDays: number;
  expiryCriticalDays: number;
  lowStockDefaultThreshold: number;
  updatedAt: string;
}

export interface Integration {
  id: string;
  provider: string;
  locationId: string | null;
  status: string;
  lastSyncAt: string | null;
  createdAt: string;
}