import { apiFetch } from "./api";
import { operationsService } from "./operations.service";

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
    const [summary, alerts, movements, locationResult, products, sales] = await Promise.all([
      apiFetch<DashboardApiSummary>("/dashboard/summary"),
      apiFetch<{ expiration: { items: ExpiryAlert[] } }>("/stock/alerts?limit=100"),
      apiFetch<{ items: DashboardApiMovement[] }>("/stock/movements?page=1&pageSize=100"),
      apiFetch<{ items: ApiLocation[] }>("/locations?page=1&pageSize=100"),
      operationsService.listProducts().catch(() => []),
      operationsService.listSales().catch(() => []),
    ]);

    const locations = locationResult.items;
    const expiringLots = alerts.expiration.items;
    const weeklyCutoff = Date.now() - 7 * 86_400_000;
    const completedWeeklySales = sales.filter((sale) => sale.status === "COMPLETED" && new Date(sale.date).getTime() >= weeklyCutoff);
    const summaryForLocation = (location: ApiLocation) => {
      const scopedProducts = products.filter((product) => product.status === "ACTIVE" && (product.linkedLocationIds ?? []).includes(location.id));
      const scopedLots = expiringLots.filter((lot) => lot.locationId === location.id);
      const scopedSales = completedWeeklySales.filter((sale) => sale.location === location.name || sale.location === location.id);
      const criticalLots = scopedLots.filter((lot) => lot.severity === "EXPIRED" || lot.severity === "CRITICAL");
      return {
        totalProducts: scopedProducts.length,
        totalLocations: 1,
        criticalExpiryLots: criticalLots.length,
        criticalExpiryValue: Math.round(criticalLots.reduce((total, lot) => total + (products.find((product) => product.id === lot.productId)?.costPrice ?? 0) * Number(lot.quantity), 0) * 100),
        lowStockProducts: scopedProducts.filter((product) => product.minimumStock > 0 && (product.stockByLocation?.[location.id] ?? 0) <= product.minimumStock).length,
        weeklySalesQuantity: scopedSales.length,
        weeklySalesAmount: Math.round(scopedSales.reduce((total, sale) => total + sale.total, 0) * 100),
      };
    };
    const globalWeeklySales = completedWeeklySales;

    return {
      summary: {
        totalProducts: summary.activeProducts,
        totalLocations: summary.activeLocations,
        criticalExpiryLots: summary.criticalExpiryLots,
        criticalExpiryValue: Math.round(expiringLots.filter((lot) => lot.severity === "EXPIRED" || lot.severity === "CRITICAL").reduce((total, lot) => total + (products.find((product) => product.id === lot.productId)?.costPrice ?? 0) * Number(lot.quantity), 0) * 100),
        lowStockProducts: summary.lowStockItems,
        weeklySalesQuantity: globalWeeklySales.length,
        weeklySalesAmount: Math.round(globalWeeklySales.reduce((total, sale) => total + sale.total, 0) * 100),
      },
      expiringLots: expiringLots.map((lot) => ({
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
      locations: locations.map((location) => ({
        id: location.id,
        name: location.name,
        type: location.type,
        skuCount: products.filter((product) => product.status === "ACTIVE" && (product.linkedLocationIds ?? []).includes(location.id)).length,
        totalUnits: products.reduce((total, product) => total + (product.stockByLocation?.[location.id] ?? 0), 0),
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
      locationSummaries: locations.map((location) => ({ locationName: location.name, summary: summaryForLocation(location) })),
    };
  },
};
