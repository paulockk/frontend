import { apiFetch } from "./api";
import type { ExpiryFilters, ExpiryListResponse } from "../types/expiry";

type ApiExpiryAlert = {
  batchId: string; sku: string; productName: string; locationId: string; location: string;
  batchNumber: string | null; expiryDate: string; daysRemaining: number; quantity: string;
  unit: string; severity: "EXPIRED" | "CRITICAL" | "WARNING";
};
export const expiryService = {
  async list(filters: ExpiryFilters): Promise<ExpiryListResponse> {
    const [alerts, locationResult] = await Promise.all([
      apiFetch<{ expiration: { totalItems: number; expiredCount: number; criticalCount: number; warningCount: number; items: ApiExpiryAlert[] } }>("/stock/alerts?limit=100"),
      apiFetch<{ items: Array<{ name: string }> }>("/locations?page=1&pageSize=100"),
    ]);
    const all = alerts.expiration.items
      .filter((lot) => filters.location === "ALL" || lot.location === filters.location)
      .filter((lot) => filters.severity === "ALL" || lot.severity === filters.severity)
      .filter((lot) => !filters.search.trim() || `${lot.productName} ${lot.sku} ${lot.batchNumber ?? ""}`.toLocaleLowerCase("pt-BR").includes(filters.search.trim().toLocaleLowerCase("pt-BR")))
      .map((lot) => ({
        id: lot.batchId,
        sku: lot.sku,
        barcode: lot.sku,
        productName: lot.productName,
        category: "Sem categoria",
        location: lot.location,
        batchNumber: lot.batchNumber ?? "—",
        expiryDate: lot.expiryDate,
        daysRemaining: lot.daysRemaining,
        quantity: Number(lot.quantity),
        unit: lot.unit,
        totalCost: 0,
        severity: lot.severity,
        recommendedAction: lot.severity === "EXPIRED" ? "Baixar lote" : "Priorizar saída PEPS",
      }));
    const start = (filters.page - 1) * filters.pageSize;
    const summary = ["EXPIRED", "CRITICAL", "WARNING"].map((severity) => ({
      severity: severity as "EXPIRED" | "CRITICAL" | "WARNING",
      lotCount: all.filter((lot) => lot.severity === severity).length,
      totalCost: 0,
    }));
    return {
      items: all.slice(start, start + filters.pageSize),
      summary,
      locations: locationResult.items.map((location) => location.name),
      categories: [],
      pagination: { page: filters.page, pageSize: filters.pageSize, totalItems: all.length, totalPages: Math.max(1, Math.ceil(all.length / filters.pageSize)) },
    };
  },
  async writeOff(lotId: string): Promise<void> {
    void lotId;
    throw new Error("A API atual ainda não oferece baixa de lote por validade.");
  },
  async runFifo(): Promise<void> {
    throw new Error("A API atual ainda não oferece execução da rotina PEPS.");
  },
  async transferFifo(lotId: string): Promise<void> {
    void lotId;
    throw new Error("A API atual ainda não oferece transferência PEPS por lote.");
  },
};
