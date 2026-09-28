import type { ReactNode } from "react";

export interface DashboardKpi {
  id: string;
  title: string;
  value: string;
  subtext: string;
  change?: string;
  trend?: "up" | "down" | "neutral" | "danger";
  icon: ReactNode;
}

export interface DashboardExpiringLot {
  id: string;

  productId: string;
  productName: string;
  barcode: string;

  batchId: string;
  batchCode: string;

  locationId: string;
  locationName: string;

  expirationDate: string | null;
  daysRemaining: number;

  quantity: number;
  unit: string;

  status: "EXPIRED" | "CRITICAL" | "WARNING";
}

export interface DashboardLocation {
  id: string;
  name: string;
  type: "MARKET" | "VENDING_MACHINE" | "WAREHOUSE";

  skuCount: number;
  totalUnits: number;

  capacityPercent: number;

  criticalExpiryCount: number;
}

export interface DashboardMovement {
  id: string;

  productId: string;
  productName: string;
  barcode: string;

  type:
    | "ENTRY"
    | "EXIT"
    | "TRANSFER"
    | "ADJUSTMENT";

  origin: string | null;
  destination: string | null;

  quantity: number;

  userId: string;
  userName: string;

  createdAt: string;
}

export interface DashboardSummary {
  totalProducts: number;
  totalLocations: number;

  criticalExpiryLots: number;
  criticalExpiryValue: number;

  lowStockProducts: number;

  weeklySalesQuantity: number;
  weeklySalesAmount: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;

  expiringLots: DashboardExpiringLot[];

  locations: DashboardLocation[];

  recentMovements: DashboardMovement[];

  salesInsights?: {
    bestSellers: { productName: string; quantity: number }[];
    slowMovers: { productName: string; quantity: number }[];
    locationSales: { locationName: string; amount: number }[];
    weeklyTrend: { label: string; quantity: number }[];
    byLocation?: {
      locationName: string;
      bestSellers: { productName: string; quantity: number }[];
      slowMovers: { productName: string; quantity: number }[];
      weeklyTrend: { label: string; quantity: number }[];
    }[];
  };
  locationSummaries?: { locationName: string; summary: DashboardSummary }[];

  integrations?: {
    id: string;
    provider: string;
    locationId: string | null;
    status: string;
    lastSyncAt: string | null;
  }[];
}
