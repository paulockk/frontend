import { apiFetch } from "./api";

import type { DashboardResponse } from "../types/dashboard";

type DashboardApiSummary = {
  activeProducts: number;
  activeLocations: number;
  lowStockItems: number;
  criticalExpiryLots: number;
};
type ExpiryAlert = {
  batchId: string; productId: string; sku: string; productName: string;
  locationId: string; location: string; batchNumber: string | null;
  expiryDate: string; daysRemaining: number; quantity: string; unit: string;
  severity: "EXPIRED" | "CRITICAL" | "WARNING";
};
type DashboardApiMovement = {
  id: string; productId: string; productName: string; sku: string;
  type: "ENTRY" | "EXIT" | "TRANSFER"; sourceLocation: string | null;
  destinationLocation: string | null; quantity: string; performedBy: string;
  createdAt: string;
};
type ApiLocation = { id: string; name: string; type: "MARKET" | "VENDING_MACHINE" | "WAREHOUSE" };

export const dashboardService = {
  async getDashboard(): Promise<DashboardResponse> {
    const [summary, alerts, movements, locationResult] = await Promise.all([
      apiFetch<DashboardApiSummary>("/dashboard/summary"),
      apiFetch<{ expiration: { items: ExpiryAlert[] } }>("/stock/alerts?limit=100"),
      apiFetch<{ items: DashboardApiMovement[] }>("/stock/movements?page=1&pageSize=100"),
      apiFetch<{ items: ApiLocation[] }>("/locations?page=1&pageSize=100"),
    ]);

    return {
      summary: {
        totalProducts: summary.activeProducts,
        totalLocations: summary.activeLocations,
        criticalExpiryLots: summary.criticalExpiryLots,
        criticalExpiryValue: 0,
        lowStockProducts: summary.lowStockItems,
        weeklySalesQuantity: 0,
        weeklySalesAmount: 0,
      },
      expiringLots: alerts.expiration.items.map((lot) => ({
        id: lot.batchId,
        productId: lot.productId,
        productName: lot.productName,
        barcode: lot.sku,
        batchId: lot.batchId,
        batchCode: lot.batchNumber ?? "—",
        locationId: lot.locationId,
        locationName: lot.location,
        expirationDate: lot.expiryDate,
        daysRemaining: lot.daysRemaining,
        quantity: Number(lot.quantity),
        unit: lot.unit,
        status: lot.severity,
      })),
      locations: locationResult.items.map((location) => ({
        id: location.id,
        name: location.name,
        type: location.type,
        skuCount: 0,
        totalUnits: 0,
        capacityPercent: 0,
        criticalExpiryCount: alerts.expiration.items.filter((lot) => lot.locationId === location.id && lot.severity !== "WARNING").length,
      })),
      recentMovements: movements.items.map((movement) => ({
        id: movement.id,
        productId: movement.productId,
        productName: movement.productName,
        barcode: movement.sku,
        type: movement.type,
        origin: movement.sourceLocation,
        destination: movement.destinationLocation,
        quantity: Number(movement.quantity),
        userId: movement.performedBy,
        userName: movement.performedBy,
        createdAt: movement.createdAt,
      })),
    };
  },
};
