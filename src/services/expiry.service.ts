import { apiFetch } from "./api";
import type { ExpiryFilters, ExpiryListResponse, ExpirySeverity } from "../types/expiry";

type ApiStockLot = {
  batchId: string;
  sku: string;
  productName: string;
  category: string | null;
  location: string;
  batchNumber: string | null;
  expiryDate: string | null;
  daysRemaining: number | null;
  quantity: string;
  unit: string;
  severity: ExpirySeverity;
};

type ApiStockLotPage = {
  items: ApiStockLot[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
};

const severityOrder: ExpirySeverity[] = ["EXPIRED", "CRITICAL", "WARNING", "REGULAR"];

export const expiryService = {
  async list(filters: ExpiryFilters): Promise<ExpiryListResponse> {
    const firstPage = await apiFetch<ApiStockLotPage>("/stock/lots?page=1&pageSize=100");
    const remainingPages = await Promise.all(
      Array.from({ length: Math.max(0, firstPage.pagination.totalPages - 1) }, (_, index) =>
        apiFetch<ApiStockLotPage>(`/stock/lots?page=${index + 2}&pageSize=100`),
      ),
    );
    const lots = [firstPage, ...remainingPages].flatMap((page) => page.items);

    const expiringLots = lots
      .filter((lot) => lot.expiryDate !== null)
      .map((lot) => ({
        id: lot.batchId,
        sku: lot.sku,
        barcode: lot.sku,
        productName: lot.productName,
        category: lot.category ?? "Sem categoria",
        location: lot.location,
        batchNumber: lot.batchNumber ?? "—",
        expiryDate: lot.expiryDate!,
        daysRemaining: lot.daysRemaining ?? 0,
        quantity: Number(lot.quantity),
        unit: lot.unit,
        totalCost: 0,
        severity: lot.severity,
        recommendedAction: lot.severity === "EXPIRED" ? "Baixar lote" : "Priorizar saída PEPS",
      }));

    const search = filters.search.trim().toLocaleLowerCase("pt-BR");
    const matchingLots = expiringLots
      .filter((lot) => filters.location === "ALL" || lot.location === filters.location)
      .filter((lot) => filters.category === "ALL" || lot.category === filters.category)
      .filter((lot) => !search || `${lot.productName} ${lot.sku} ${lot.barcode} ${lot.batchNumber}`.toLocaleLowerCase("pt-BR").includes(search));

    const visibleLots = matchingLots.filter((lot) => filters.severity === "ALL" || lot.severity === filters.severity);
    const start = (filters.page - 1) * filters.pageSize;
    const summary = severityOrder.map((severity) => ({
      severity,
      lotCount: matchingLots.filter((lot) => lot.severity === severity).length,
      totalCost: 0,
    }));

    return {
      items: visibleLots.slice(start, start + filters.pageSize),
      summary,
      locations: [...new Set(expiringLots.map((lot) => lot.location))].sort((a, b) => a.localeCompare(b, "pt-BR")),
      categories: [...new Set(expiringLots.map((lot) => lot.category))].sort((a, b) => a.localeCompare(b, "pt-BR")),
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        totalItems: visibleLots.length,
        totalPages: Math.max(1, Math.ceil(visibleLots.length / filters.pageSize)),
      },
    };
  },
};
